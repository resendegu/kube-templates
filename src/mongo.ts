import { generateYaml } from "./helpers";
import { ObjectMeta, Service, StatefulSet } from "./kubernetes";

interface MongoSpec {
  // readReplicas?: number;
  version: string;
  cpu: {
    request: string | number;
    limit: string | number;
  };
  memory: string | number;
  // postgresUserPassword?: string;
}

export class Mongo {
  constructor(private metadata: ObjectMeta, private spec: MongoSpec) {}

  get yaml() {
    return generateYaml([
      new Service(this.metadata, {
        selector: {
          app: this.metadata.name
        },
        ports: [
          {
            name: "mongo",
            port: 27017
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
            automountServiceAccountToken: false,
            volumes: [
              {
                name: "config",
                emptyDir: {}
              }
            ],
            containers: [
              {
                name: "mongo",
                image: `mongo:${this.spec.version}`,
                imagePullPolicy: "Always",
                ports: [
                  {
                    name: "mongo",
                    containerPort: 27017
                  }
                ],
                volumeMounts: [
                  {
                    mountPath: "/data/db",
                    name: "datadir"
                  },
                  {
                    mountPath: "/data/configdb",
                    name: "config"
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
                      "mongo",
                      "--eval",
                      "db.adminCommand('ping')"
                    ]
                  },
                  failureThreshold: 1,
                  periodSeconds: 3
                },
                livenessProbe: {
                  exec: {
                    command: [
                      "mongo",
                      "--eval",
                      "db.adminCommand('ping')"
                    ]
                  },
                  failureThreshold: 2,
                  periodSeconds: 5,
                  initialDelaySeconds: 10
                }
              }
            ]
          }
        },
        volumeClaimTemplates: [
          {
            metadata: {
              name: "datadir"
            },
            spec: {
              accessModes: ["ReadWriteOnce"],
              resources: {
                requests: {
                  storage: "2Gi"
                }
              },
              storageClassName: process.env.PRODUCTION
                ? "ssd"
                : "standard"
            }
          }
        ]
      })
    ]);
  }
}
