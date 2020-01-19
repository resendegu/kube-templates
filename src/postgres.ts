import { generateYaml } from "./helpers";
import { ObjectMeta, Service, StatefulSet } from "./kubernetes";

interface PostgresSpec {
  // replicas?: number;
  version: string;
  cpu: {
    request: string | number;
    limit: string | number;
  };
  memory: string | number;
  postgresUserPassword?: string;
  users?: ((
    | {
        username: string;
        database: string;
      }
    | {
        username: string;
      }
    | {
        database: string;
      }
  ) & {
    password: string;
  })[];
}

export class Postgres {
  constructor(private metadata: ObjectMeta, private spec: PostgresSpec) {}

  get yaml() {
    return generateYaml([
      new Service(this.metadata, {
        selector: {
          app: this.metadata.name
        },
        ports: [
          {
            name: "postgres",
            port: 5432
          }
        ]
      }),
      new StatefulSet(this.metadata, {
        serviceName: this.metadata.name,
        replicas: 1,
        selector: {
          matchLabels: {
            app: this.metadata.name
          }
        },
        template: {
          metadata: {
            labels: {
              app: this.metadata.name
            }
          },
          spec: {
            containers: [
              {
                name: "postgres",
                image: `postgres:${this.spec.version}-alpine`,
                ports: [
                  {
                    name: "postgres",
                    containerPort: 5432
                  }
                ],
                volumeMounts: [
                  {
                    mountPath: "/var/lib/postgresql",
                    name: "data"
                  }
                ],
                resources: {
                  limits: {
                    cpu: this.spec.cpu.limit,
                    memory: this.spec.memory
                  },
                  requests: {
                    cpu: this.spec.cpu.request,
                    memory: this.spec.memory
                  }
                },
                readinessProbe: {
                  exec: {
                    command: ["psql", "-h", "127.0.0.1", "-U", "postgres", "-c", "SELECT 1"]
                  },
                  failureThreshold: 1,
                  periodSeconds: 3
                },
                livenessProbe: {
                  exec: {
                    command: ["psql", "-h", "127.0.0.1", "-U", "postgres", "-c", "SELECT 1"]
                  },
                  failureThreshold: 2,
                  periodSeconds: 5,
                  initialDelaySeconds: 10
                }
              },
              {
                name: "sidecar",
                image: `postgres:${this.spec.version}-alpine`,
                command: [
                  "/bin/bash",
                  "-ec",
                  `
                  echo Wait for Postgres to be ready.
                  until psql -h 127.0.0.1 -U postgres -c 'SELECT 1'
                  do
                    echo Not ready yet. Trying again...
                    sleep 1
                  done
                  echo Postgres is ready.

                  psql -h 127.0.0.1 -U postgres -c "alter user postgres encrypted password '"'${this.spec.postgresUserPassword ?? ""}'"'"

                  sleep 9999999d
                `
                ],
                resources: {
                  limits: {
                    cpu: "100m",
                    memory: "5Mi"
                  },
                  requests: {
                    cpu: 0,
                    memory: "5Mi"
                  }
                },
              }
            ]
          }
        },
        volumeClaimTemplates: [
          {
            metadata: {
              name: "data"
            },
            spec: {
              accessModes: ["ReadWriteOnce"],
              resources: {
                requests: {
                  storage: "2Gi"
                }
              },
              storageClassName: process.env.PRODUCTION ? "ssd-regional" : "standard"
            }
          }
        ]
      })
    ]);
  }
}
