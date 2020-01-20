import { generateYaml } from "./helpers";
import { ObjectMeta, Service, StatefulSet } from "./kubernetes";

interface PostgresSpec {
  // readReplicas?: number;
  version: string;
  cpu: {
    request: string | number;
    limit: string | number;
  };
  memory: string | number;
  postgresUserPassword?: string;
  users?: {
    username: string;
    database: string;
    password: string;
  }[];
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
                imagePullPolicy: "Always",
                ports: [
                  {
                    name: "postgres",
                    containerPort: 5432
                  }
                ],
                volumeMounts: [
                  {
                    mountPath: "/var/lib/postgresql/data",
                    name: "data",
                    subPath: "data"
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
                    command: [
                      "psql",
                      "-h",
                      "127.0.0.1",
                      "-U",
                      "postgres",
                      "-c",
                      "SELECT 1"
                    ]
                  },
                  failureThreshold: 1,
                  periodSeconds: 3
                },
                livenessProbe: {
                  exec: {
                    command: [
                      "psql",
                      "-h",
                      "127.0.0.1",
                      "-U",
                      "postgres",
                      "-c",
                      "SELECT 1"
                    ]
                  },
                  failureThreshold: 2,
                  periodSeconds: 5,
                  initialDelaySeconds: 10
                }
              },
              {
                name: "setup",
                image: `postgres:${this.spec.version}-alpine`,
                imagePullPolicy: "Always",
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

                  echo Setting password for user postgres
                  psql -h 127.0.0.1 -U postgres -c "ALTER USER postgres ENCRYPTED PASSWORD '"'${this
                    .spec.postgresUserPassword ?? ""}'"'"

                  USERS=$(psql -h 127.0.0.1 -U postgres -c 'SELECT usename FROM pg_user WHERE NOT usesuper' | tail -n+3 | sed '$d' | sed '$d')
                  DATABASES=$(psql -h 127.0.0.1 -U postgres -c 'SELECT datname FROM pg_database WHERE NOT datistemplate' | tail -n+3 | sed '$d' | sed '$d')
                  for user in $USERS
                  do
                    for database in $DATABASES
                    do
                      echo Revoke $user on $database
                      psql -h 127.0.0.1 -U postgres -c "REASSIGN OWNED BY $user TO postgres" $database
                      psql -h 127.0.0.1 -U postgres -c "REVOKE ALL PRIVILEGES ON DATABASE $database FROM $user"
                      psql -h 127.0.0.1 -U postgres -c "REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM $user" $database
                    done

                    ${
                      // Only drop users that should not exist
                      (this.spec.users ?? []).map(
                        user => `
                          [ "$user" == '${user.username}' ] && continue
                        `
                      ).join("\n")
                    }

                    echo Dropping user $user
                    psql -h 127.0.0.1 -U postgres -c "DROP USER $user"
                  done

                  ${(this.spec.users ?? [])
                    .map(
                      user => `
                        echo Creating user ${user.username}...
                        psql -h 127.0.0.1 -U postgres -c "CREATE USER "'"${user.username}"'" ENCRYPTED PASSWORD '"'${user.password}'"'" || true
                        psql -h 127.0.0.1 -U postgres -c "ALTER USER "'"${user.username}"'" ENCRYPTED PASSWORD '"'${user.password}'"'"

                        echo Creating database ${user.database}...
                        psql -h 127.0.0.1 -U postgres -c 'CREATE DATABASE "${user.database}"' || true

                        echo Granting privileges on database ${user.database} to user ${user.username}...
                        psql -h 127.0.0.1 -U postgres -c 'GRANT ALL PRIVILEGES ON DATABASE "${user.database}" TO "${user.username}"'
                        psql -h 127.0.0.1 -U postgres -c 'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "${user.username}"' ${user.database}
                      `
                    )
                    .join("\n")}

                  echo Done.
                  touch /ready
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
                readinessProbe: {
                  exec: {
                    command: ["cat", "/ready"]
                  },
                  failureThreshold: 1,
                  periodSeconds: 3
                }
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
              storageClassName: process.env.PRODUCTION
                ? "ssd-regional"
                : "standard"
            }
          }
        ]
      })
    ]);
  }
}
