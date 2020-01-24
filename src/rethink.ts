import { generateYaml } from "./helpers";
import { ObjectMeta, Service, StatefulSet } from "./kubernetes";

interface RethinkSpec {
  replicas?: number;
  version: string;
  cpu: {
    request: string | number;
    limit: string | number;
  };
  memory: string | number;
  cacheMb?: number
}

export class Rethink {
  constructor(private metadata: ObjectMeta, private spec: RethinkSpec) {}

  get yaml() {
    return generateYaml([
      new Service(this.metadata, {
        selector: {
          app: this.metadata.name
        },
        ports: [
          {
            name: "client",
            port: 28015
          },
          {
            name: "webui",
            port: 8080
          }
        ]
      }),
      ...new Array(this.spec.replicas ?? 1).fill(0).map((_, idx) =>
        new Service({
          ...this.metadata,
          name: `${this.metadata.name}-${idx}`
        }, {
          selector: {
            app: this.metadata.name,
            "statefulset.kubernetes.io/pod-name": `${this.metadata.name}-${idx}`
          },
          ports: [
            {
              name: "cluster",
              port: 29015
            },
            {
              name: "client",
              port: 28015
            },
            {
              name: "webui",
              port: 8080
            }
          ]
        })
      ),
      new StatefulSet(this.metadata, {
        serviceName: this.metadata.name,
        replicas: this.spec.replicas ?? 1,
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
            initContainers: [
              {
                name: "create",
                image: `rethinkdb:${this.spec.version}`,
                imagePullPolicy: "Always",
                command: [
                  "bash",
                  "-ec",
                  `rethinkdb create -d /data/rethinkdb --server-name ${this.metadata.namespace.toLowerCase().replace(/[^a-z]/gu, "_")}_$(hostname | cut -d- -f2) || true`
                ],
                volumeMounts: [
                  {
                    mountPath: "/data",
                    name: "data"
                  }
                ],
              }
            ],
            containers: [
              {
                name: "rethinkdb",
                image: `rethinkdb:${this.spec.version}`,
                imagePullPolicy: "Always",
                command: [
                  "bash",
                  "-ec",
                  `rethinkdb serve ` +
                  `--bind all ` +
                  (this.spec.cacheMb ? `--cache-size ${this.spec.cacheMb} ` : "") +
                  `--directory /data/rethinkdb ` +
                  `$(echo "--join ${this.metadata.name}-"{0..${(this.spec.replicas ?? 1) - 1}} | sed "s/$(hostname)//") ` +
                  `--canonical-address $(hostname)`
                ],
                ports: [
                  {
                    name: "cluster",
                    containerPort: 29015
                  },
                  {
                    name: "client",
                    containerPort: 28015
                  },
                  {
                    name: "webui",
                    containerPort: 8080
                  }
                ],
                volumeMounts: [
                  {
                    mountPath: "/data",
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
                  httpGet: {
                    path: "/",
                    port: 8080
                  },
                  failureThreshold: 1,
                  periodSeconds: 3
                },
                livenessProbe: {
                  httpGet: {
                    path: "/",
                    port: 8080
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
              name: "data"
            },
            spec: {
              accessModes: ["ReadWriteOnce"],
              resources: {
                requests: {
                  storage: "2Gi"
                }
              },
              storageClassName: "ssd"
            }
          }
        ]
      })
    ]);
  }
}
