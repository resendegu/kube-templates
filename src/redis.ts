import { generateYaml } from "./helpers";
import { ObjectMeta, Service, StatefulSet } from "./kubernetes";

interface RedisSpec {
  version: string;
  cpu: {
    request: string | number;
    limit: string | number;
  };
  memory: string | number;
  options?: {
    // TODO: Add all from https://raw.githubusercontent.com/antirez/redis/5.0/redis.conf
    maxmemory?: string;
    maxmemoryPolicy?: string;
    maxmemorySamples?: number;
    replicaIgnoreMaxmemory?: boolean;
  };
}

export class Redis {
  constructor(private metadata: ObjectMeta, private spec: RedisSpec) {}

  get yaml() {
    return generateYaml([
      new Service(this.metadata, {
        selector: {
          app: this.metadata.name
        },
        ports: [
          {
            name: "redis",
            port: 6379
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
            containers: [
              {
                name: "redis",
                image: `redis:${this.spec.version}`,
                imagePullPolicy: "Always",
                command: [
                  "redis-server",
                  ...Object.entries(this.spec.options ?? {})
                    .map(([key, value]) => [
                      `--${key.replace(/[A-Z]/g, x => `-${x.toLowerCase()}`)}`,
                      `${
                        value === true ? "yes" : value === false ? "no" : value
                      }`
                    ])
                    .reduce((a, b) => [...a, ...b])
                ],
                ports: [
                  {
                    name: "redis",
                    containerPort: 6379
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
                    command: ["redis-cli", "ping"]
                  },
                  failureThreshold: 1,
                  periodSeconds: 3
                },
                livenessProbe: {
                  exec: {
                    command: ["redis-cli", "ping"]
                  },
                  failureThreshold: 2,
                  periodSeconds: 5,
                  initialDelaySeconds: 10
                }
              }
            ]
          }
        },
        volumeClaimTemplates: []
      })
    ]);
  }
}
