import type { io } from "./generated";
import { generateYaml } from "./helpers";
import type { ObjectMeta } from "./kubernetes";
import { Service, StatefulSet } from "./kubernetes";

interface MSSQLSpec {
  version: string;
  productId:
    | "Evaluation"
    | "Developer"
    | "Express"
    | "Web"
    | "Standard"
    | "Enterprise"
    | "EnterpriseCore";
  cpu: {
    request: string | number;
    limit: string | number;
  };
  memory: string | number;
  sysAdminPassword: string;
  initContainers?: io.k8s.api.core.v1.Container[];
}

export class MSSQL {
  constructor(
    private metadata: ObjectMeta,
    private spec: MSSQLSpec,
  ) {}

  get yaml() {
    return generateYaml([
      new Service(this.metadata, {
        selector: {
          app: this.metadata.name,
        },

        ports: [
          {
            name: "mssql",
            port: 1433,
          },
          {
            name: "admin-tcp",
            port: 1434,
          },
          {
            name: "admin-udp",
            protocol: "UDP",
            port: 1434,
          },
          {
            name: "servicebroker",
            port: 4022,
          },
          {
            name: "debugger",
            port: 135,
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
                name: "mssql",
                image: `mcr.microsoft.com/mssql/server:${this.spec.version}`,
                env: [
                  {
                    name: "ACCEPT_EULA",
                    value: "Y",
                  },
                  {
                    name: "MSSQL_SA_PASSWORD",
                    value: this.spec.sysAdminPassword,
                  },
                  {
                    name: "MSSQL_PID",
                    value: this.spec.productId,
                  },
                  {
                    name: "MSSQL_DUMP_DIR",
                    value: "/dumps",
                  },
                  {
                    name: "MSSQL_AGENT_ENABLED",
                    value: "true",
                  },
                ],
                imagePullPolicy: "IfNotPresent",
                ports: [
                  {
                    name: "mssql",
                    containerPort: 1433,
                  },
                  {
                    name: "admin-tcp",
                    containerPort: 1434,
                  },
                  {
                    name: "admin-udp",
                    protocol: "UDP",
                    containerPort: 1434,
                  },
                  {
                    name: "servicebroker",
                    containerPort: 4022,
                  },
                  {
                    name: "debugger",
                    containerPort: 135,
                  },
                ],
                volumeMounts: [
                  {
                    mountPath: "/var/opt/mssql",
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
                      "/opt/mssql-tools/bin/sqlcmd",
                      "-S",
                      "127.0.0.1",
                      "-U",
                      "SA",
                      "-P",
                      this.spec.sysAdminPassword,
                      "-Q",
                      "SELECT 1",
                    ],
                  },
                  initialDelaySeconds: 10,
                  failureThreshold: 1,
                  periodSeconds: 3,
                },
                livenessProbe: {
                  exec: {
                    command: [
                      "/opt/mssql-tools/bin/sqlcmd",
                      "-S",
                      "127.0.0.1",
                      "-U",
                      "SA",
                      "-P",
                      this.spec.sysAdminPassword,
                      "-Q",
                      "SELECT 1",
                    ],
                  },
                  failureThreshold: 2,
                  periodSeconds: 5,
                  initialDelaySeconds: 10,
                },
              },
            ],
            securityContext: {
              runAsUser: 10001,
              runAsGroup: 0,
              fsGroup: 10001,
            },
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
                  storage: "2Gi",
                },
              },
            },
          },
        ],
      }),
    ]);
  }
}
