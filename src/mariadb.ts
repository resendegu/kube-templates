import type { io } from "./generated";
import { generateYaml } from "./helpers";
import type { ObjectMeta } from "./kubernetes";
import { Service, StatefulSet } from "./kubernetes";

interface MariaDBSpec {
  version: string;
  cpu: {
    request: string | number;
    limit: string | number;
  };
  memory: string | number;
  rootPassword: string;
  storageClassName?: string;
  initContainers?: io.k8s.api.core.v1.Container[];
}

export class MariaDB {
  constructor(private metadata: ObjectMeta, private spec: MariaDBSpec) {}

  get yaml() {
    return generateYaml([
      new Service(this.metadata, {
        selector: {
          app: this.metadata.name,
        },

        ports: [
          {
            name: "mysql",
            port: 3306,
          },
          {
            name: "mysqlx",
            port: 33060,
          },
          {
            name: "admin",
            port: 33062,
          },
        ],
      }),

      new StatefulSet(this.metadata, {
        serviceName: this.metadata.name,
        replicas: 1,
        selector: {
          matchLabels: {
            app: this.metadata.name,
          },
        },
        template: {
          metadata: {
            labels: {
              app: this.metadata.name,
            },
          },
          spec: {
            initContainers: this.spec.initContainers,
            automountServiceAccountToken: false,
            containers: [
              {
                name: "mariadb",
                image: `mariadb:${this.spec.version}`,
                args: [
                  "--character-set-server=utf8mb4",
                  "--collation-server=utf8mb4_unicode_ci",
                  "--log-warnings=0",
                ],
                env: [
                  {
                    name: "MYSQL_ROOT_PASSWORD",
                    value: this.spec.rootPassword,
                  },
                ],
                imagePullPolicy: "IfNotPresent",
                ports: [
                  {
                    name: "mysql",
                    containerPort: 3306,
                  },
                  {
                    name: "mysqlx",
                    containerPort: 33060,
                  },
                  {
                    name: "admin",
                    containerPort: 33062,
                  },
                ],
                volumeMounts: [
                  {
                    mountPath: "/var/lib/mysql",
                    name: "data",
                  },
                ],
                resources: {
                  limits: {
                    cpu: this.spec.cpu.limit,
                    memory: this.spec.memory,
                  },
                  requests: {
                    cpu: this.spec.cpu.request,
                    memory: this.spec.memory,
                  },
                },
                readinessProbe: {
                  exec: {
                    command: [
                      "mysqladmin",
                      "ping",
                      "-h",
                      "localhost",
                      "-uroot",
                      `-p${this.spec.rootPassword}`,
                    ],
                  },
                  initialDelaySeconds: 5,
                  failureThreshold: 1,
                  periodSeconds: 3,
                },
                livenessProbe: {
                  exec: {
                    command: [
                      "mysqladmin",
                      "ping",
                      "-h",
                      "localhost",
                      "-uroot",
                      `-p${this.spec.rootPassword}`,
                    ],
                  },
                  failureThreshold: 2,
                  periodSeconds: 5,
                  initialDelaySeconds: 5,
                },
              },
            ],
          },
        },
        volumeClaimTemplates: [
          {
            metadata: {
              name: "data",
            },
            spec: {
              accessModes: ["ReadWriteOnce"],
              resources: {
                requests: {
                  storage: "1Gi",
                },
              },
              storageClassName: this.spec.storageClassName ?? "ssd",
            },
          },
        ],
      }),
    ]);
  }
}
