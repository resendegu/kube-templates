import * as _ from "lodash";

import { generateYaml } from "./helpers";
import type { ObjectMeta } from "./kubernetes";
import {
  Job,
  PodDisruptionBudget,
  Secret,
  Service,
  StatefulSet,
} from "./kubernetes";

interface CockroachSpec {
  version: string;
  cpu: {
    request: string | number;
    limit: string | number;
  };
  memory: string | number;
  replicas: number;
  certs?: {
    [key: string]: Buffer;
  };
}

export class Cockroach {
  constructor(private metadata: ObjectMeta, private spec: CockroachSpec) {}

  private get isLogToStderrDeprecated(): boolean {
    const match = /^(?<version>\d+)\./u.exec(this.spec.version);

    if (!match) {
      return false;
    }

    const { groups } = match;

    if (!groups) {
      return false;
    }

    return parseInt(groups.version, 10) >= 21;
  }

  get yaml() {
    return generateYaml([
      ...(this.spec.certs
        ? [
            new Secret(
              {
                ...this.metadata,
                name: `${this.metadata.name}-certs`,
              },
              { ...this.spec.certs },
            ),
          ]
        : []),
      new Service(
        {
          ...this.metadata,
          name: `${this.metadata.name}-public`,
          labels: {
            app: this.metadata.name,
          },
        },
        {
          selector: {
            app: this.metadata.name,
          },
          ports: [
            {
              name: "grpc",
              port: 26257,
              targetPort: 26257,
            },
            {
              name: "http",
              port: 8080,
              targetPort: 8080,
            },
          ],
        },
      ),
      new Service(
        {
          ...this.metadata,
          labels: {
            app: this.metadata.name,
          },
          annotations: {
            "service.alpha.kubernetes.io/tolerate-unready-endpoints": "true",
            "prometheus.io/scrape": "true",
            "prometheus.io/path": "_status/vars",
            "prometheus.io/port": "8080",
          },
        },
        {
          selector: {
            app: this.metadata.name,
          },
          ports: [
            {
              name: "grpc",
              port: 26257,
              targetPort: 26257,
            },
            {
              name: "http",
              port: 8080,
              targetPort: 8080,
            },
          ],
          publishNotReadyAddresses: true,
          clusterIP: "None",
        },
      ),
      new PodDisruptionBudget(
        {
          ...this.metadata,
          name: `${this.metadata.name}-budget`,
          labels: {
            app: this.metadata.name,
          },
        },
        {
          selector: {
            matchLabels: {
              app: this.metadata.name,
            },
          },
          maxUnavailable: 1,
        },
      ),
      new StatefulSet(this.metadata, {
        serviceName: this.metadata.name,
        replicas: this.spec.replicas,
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
            affinity: {
              podAntiAffinity: {
                preferredDuringSchedulingIgnoredDuringExecution: [
                  {
                    weight: 100,
                    podAffinityTerm: {
                      labelSelector: {
                        matchExpressions: [
                          {
                            key: "app",
                            operator: "In",
                            values: [this.metadata.name],
                          },
                        ],
                      },
                      topologyKey: "kubernetes.io/hostname",
                    },
                  },
                ],
              },
            },
            containers: [
              {
                name: this.metadata.name,
                image: `cockroachdb/cockroach:v${this.spec.version}`,
                imagePullPolicy: "IfNotPresent",
                ports: [
                  {
                    name: "grpc",
                    containerPort: 26257,
                  },
                  {
                    name: "http",
                    containerPort: 8080,
                  },
                ],
                livenessProbe: {
                  httpGet: {
                    path: "/health",
                    port: 8080,
                    scheme: this.spec.certs && "HTTPS",
                  },
                  initialDelaySeconds: 30,
                  periodSeconds: 5,
                },
                readinessProbe: {
                  httpGet: {
                    path: "/health?ready=1",
                    port: 8080,
                    scheme: this.spec.certs && "HTTPS",
                  },
                  initialDelaySeconds: 10,
                  periodSeconds: 5,
                  failureThreshold: 2,
                },
                volumeMounts: [
                  {
                    mountPath: "/cockroach/cockroach-data",
                    name: "datadir",
                  },
                  ...(this.spec.certs
                    ? [
                        {
                          mountPath: "/certs",
                          name: "certs",
                        },
                      ]
                    : []),
                ],
                env: [
                  {
                    name: "COCKROACH_CHANNEL",
                    value: this.spec.certs
                      ? "kubernetes-secure"
                      : "kubernetes-insecure",
                  },
                  {
                    name: "GOMAXPROCS",
                    valueFrom: {
                      resourceFieldRef: {
                        resource: "limits.cpu",
                        divisor: "1",
                      },
                    },
                  },
                  {
                    name: "MEMORY_LIMIT_MIB",
                    valueFrom: {
                      resourceFieldRef: {
                        resource: "limits.memory",
                        divisor: "1Mi",
                      },
                    },
                  },
                ],
                command: [
                  "/bin/bash",
                  "-ecx",
                  `exec /cockroach/cockroach start ${
                    this.isLogToStderrDeprecated
                      ? "--log='sinks: {stderr: {filter: INFO}}'"
                      : "--logtostderr"
                  } ${
                    this.spec.certs ? "--certs-dir /certs" : "--insecure"
                  } --advertise-host ${
                    this.spec.certs
                      ? `$(hostname).${this.metadata.name}`
                      : "$(hostname -f)"
                  } --http-addr 0.0.0.0 --join ${_.range(this.spec.replicas)
                    .map(
                      i => `${this.metadata.name}-${i}.${this.metadata.name}`,
                    )
                    .join(",")} --cache $(expr $MEMORY_LIMIT_MIB / 4)MiB`,
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
              },
            ],
            terminationGracePeriodSeconds: 60,
            volumes: [
              {
                name: "datadir",
                persistentVolumeClaim: {
                  claimName: "datadir",
                },
              },
              ...(this.spec.certs
                ? [
                    {
                      name: "certs",
                      secret: {
                        secretName: `${this.metadata.name}-certs`,
                        defaultMode: 0o600,
                      },
                    },
                  ]
                : []),
            ],
          },
        },
        podManagementPolicy: "Parallel",
        updateStrategy: {
          type: "RollingUpdate",
        },
        volumeClaimTemplates: [
          {
            metadata: {
              name: "datadir",
            },
            spec: {
              accessModes: ["ReadWriteOnce"],
              resources: {
                requests: {
                  storage: "2Gi",
                },
              },
              storageClassName: "ssd",
            },
          },
        ],
      }),
      new Job(
        {
          ...this.metadata,
          name:
            this.metadata.name === "cockroachdb"
              ? "cluster-init"
              : `${this.metadata.name}-cluster-init`,
        },
        {
          template: {
            spec: {
              volumes: this.spec.certs
                ? [
                    {
                      name: "certs",
                      secret: {
                        secretName: `${this.metadata.name}-certs`,
                        defaultMode: 0o600,
                      },
                    },
                  ]
                : [],
              containers: [
                {
                  name:
                    this.metadata.name === "cockroachdb"
                      ? "cluster-init"
                      : `${this.metadata.name}-cluster-init`,
                  image: `cockroachdb/cockroach:v${this.spec.version}`,
                  imagePullPolicy: "IfNotPresent",
                  volumeMounts: this.spec.certs
                    ? [
                        {
                          mountPath: "/certs",
                          name: "certs",
                        },
                      ]
                    : [],
                  command: [
                    "/cockroach/cockroach",
                    "init",
                    this.spec.certs ? "--certs-dir=/certs" : "--insecure",
                    `--host=${this.metadata.name}-0.${this.metadata.name}`,
                  ],
                },
              ],
              restartPolicy: "OnFailure",
            },
          },
        },
      ),
    ]);
  }
}
