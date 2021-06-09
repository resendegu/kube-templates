import { URL } from "url";
import { clone, env, generateYaml, parseMemory } from "./helpers";
import {
  Deployment,
  HorizontalPodAutoscaler,
  Ingress,
  ObjectMeta,
  Service,
  Volume,
  VolumeMount,
} from "./kubernetes";

interface StatelessAppSpec {
  replicas?: number | [number, number];
  disablePreemptibility?: boolean;
  image: string;
  command?: string[];
  envs?: {
    [env: string]: string | number | { secretName: string; key: string };
  };
  forwardEnvs?: string[];
  secretEnvs?: string[];
  cpu: {
    request: string | number;
    limit: string | number;
  };
  memory: {
    request: string | number;
    limit: string | number;
  };
  ports?: ((
    | {
        type: "http";
        ingressClass?: string;
        ingressAnnotations?: Record<string, string>;
        publicUrl?: string | string[];
        tlsCert?: string;
        timeout?: number;
        maxBodySize?: string;
        limitRequestsPerSecond?: number;
        limitBurstMultiplier?: number;
        endpoints?: Array<{
          publicUrl?: string;
          tlsCert?: string;
          maxBodySize?: string;
          limitRequestsPerSecond?: number;
          limitBurstMultiplier?: number;
        }>;
      }
    | {
        type: "tcp";
      }
  ) & {
    name?: string;
    port: number;
    containerPort?: number;
    serviceType?: "ExternalName" | "ClusterIP" | "NodePort" | "LoadBalancer";
  })[];
  check?: (
    | {
        port: number;
        httpGetPath?: string;
        host?: string;
      }
    | {
        command: string[];
      }
  ) & {
    period?: number;
    initialDelay?: number;
  };
  volumes?: {
    type: "configMap" | "secret";
    optional?: boolean;
    readOnly?: boolean;
    name: string;
    mountPath: string;
    items?: { key: string; path: string }[];
  }[];
}

export class StatelessApp {
  constructor(private metadata: ObjectMeta, private spec: StatelessAppSpec) {}

  get yaml() {
    const ingress = new Ingress(clone(this.metadata), { rules: [], tls: [] });

    for (const portSpec of this.spec.ports ?? []) {
      if (
        portSpec.type !== "http" ||
        (!portSpec.publicUrl && !portSpec.endpoints?.length)
      )
        continue;

      if (portSpec.publicUrl) {
        if (!portSpec.endpoints) {
          portSpec.endpoints = [];
        }

        const publicUrls = Array.isArray(portSpec.publicUrl)
          ? portSpec.publicUrl
          : [portSpec.publicUrl];

        for (const publicUrl of publicUrls) {
          portSpec.endpoints.push({
            limitBurstMultiplier: portSpec.limitBurstMultiplier,
            limitRequestsPerSecond: portSpec.limitRequestsPerSecond,
            maxBodySize: portSpec.maxBodySize,
            tlsCert: portSpec.tlsCert,
            publicUrl,
          });
        }
      }

      let maxBodySizeBytes = null;
      let limitBurstMultiplier = null;
      let limitRequestsPerSecond = null;
      let hasPath = false;

      for (const endpointSpec of portSpec.endpoints ?? []) {
        if (!endpointSpec.publicUrl) continue;

        const { protocol, hostname, pathname } = new URL(
          endpointSpec.publicUrl
        );
        let rule = ingress.spec.rules!.find((x) => x.host === hostname);

        if (!rule) {
          ingress.spec.rules!.push(
            (rule = { host: hostname, http: { paths: [] } })
          );
        }

        if (protocol === "https:") {
          if (!endpointSpec.tlsCert) {
            throw "Uma URL com HTTPS foi utilizada, mas 'tlsCert' não foi informado";
          }

          let tls = ingress.spec.tls!.find(
            (x) => x.secretName === endpointSpec.tlsCert
          );

          if (!tls) {
            ingress.spec.tls!.push(
              (tls = { secretName: endpointSpec.tlsCert, hosts: [] })
            );
          }

          if (!tls.hosts!.includes(hostname)) tls.hosts!.push(hostname);
        }

        if (!rule.http) {
          rule.http = { paths: [] };
        }

        hasPath = hasPath || pathname !== "/";

        rule.http.paths.push({
          backend: {
            serviceName: this.metadata.name,
            servicePort: portSpec.port,
          },
          path:
            pathname === "/"
              ? portSpec.ingressClass === "alb"
                ? "/*"
                : pathname
              : (pathname.endsWith("/")
                  ? pathname.substring(0, pathname.length - 1)
                  : pathname) + "(/|$)(.*)",
        });

        if (endpointSpec.maxBodySize) {
          const endpointMaxBodySizeBytes = parseMemory(
            endpointSpec.maxBodySize
          );

          if (
            !maxBodySizeBytes ||
            endpointMaxBodySizeBytes > maxBodySizeBytes
          ) {
            maxBodySizeBytes = endpointMaxBodySizeBytes;
          }
        }

        if (endpointSpec.limitBurstMultiplier) {
          limitBurstMultiplier = endpointSpec.limitBurstMultiplier;
        }

        if (endpointSpec.limitRequestsPerSecond) {
          limitRequestsPerSecond = endpointSpec.limitRequestsPerSecond;
        }
      }

      ingress.metadata.annotations = {
        ...ingress.metadata.annotations,
        ...portSpec.ingressAnnotations,
      };

      // TODO: This shouldn't be global on entire Ingress. Should be per port.
      if (maxBodySizeBytes) {
        ingress.metadata.annotations[
          "nginx.ingress.kubernetes.io/proxy-body-size"
        ] = maxBodySizeBytes.toString();
      }

      if (limitBurstMultiplier) {
        ingress.metadata.annotations[
          "nginx.ingress.kubernetes.io/limit-burst-multiplier"
        ] = limitBurstMultiplier.toString();
      }

      if (limitRequestsPerSecond) {
        ingress.metadata.annotations["nginx.ingress.kubernetes.io/limit-rps"] =
          limitRequestsPerSecond.toString();
      }

      if (portSpec.timeout) {
        ingress.metadata.annotations[
          "nginx.ingress.kubernetes.io/proxy-read-timeout"
        ] = portSpec.timeout.toString();
      }

      if (hasPath) {
        ingress.metadata.annotations[
          "nginx.ingress.kubernetes.io/rewrite-target"
        ] = "/$2";
      }

      if (
        process.env.CUBOS_DEV_GKE &&
        process.env.CUBOS_INTERNAL_CLUSTER &&
        !process.env.PRODUCTION
      ) {
        ingress.metadata.annotations["kubernetes.io/ingress.class"] =
          portSpec.ingressClass ?? "private";
      }
    }

    let basicProbe = undefined;
    if (this.spec.check === undefined) {
    } else if ((this.spec.check as any).command) {
      basicProbe = {
        exec: {
          command: (this.spec.check as any).command,
        },
        periodSeconds: this.spec.check.period ?? 3,
      };
    } else if ((this.spec.check as any).httpGetPath) {
      basicProbe = {
        httpGet: {
          path: (this.spec.check as any).httpGetPath,
          port: (this.spec.check as any).port,
          httpHeaders: (this.spec.check as any).host
            ? [{ name: "Host", value: (this.spec.check as any).host }]
            : [],
        },
        periodSeconds: this.spec.check.period ?? 3,
      };
    } else {
      basicProbe = {
        tcpSocket: {
          port: (this.spec.check as any).port,
        },
        periodSeconds: this.spec.check.period ?? 3,
      };
    }

    const volumes: Volume[] = [];
    const volumeMounts: VolumeMount[] = [];

    for (const volume of this.spec.volumes ?? []) {
      const name = "vol-" + volume.mountPath.replace(/[^a-zA-Z0-9]/gu, "");

      if (volume.type === "secret") {
        volumes.push({
          name,
          secret: {
            secretName: volume.name,
            items: volume.items,
            optional: volume.optional ?? false,
          },
        });
      } else {
        volumes.push({
          name,
          [volume.type]: {
            name: volume.name,
            items: volume.items,
            optional: volume.optional ?? false,
          },
        });
      }

      volumeMounts.push({
        name,
        readOnly: volume.readOnly ?? true,
        mountPath: volume.mountPath,
      });
    }

    return generateYaml([
      new Deployment(this.metadata, {
        replicas: Array.isArray(this.spec.replicas)
          ? undefined // https://github.com/kubernetes/kubernetes/issues/25238
          : this.spec.replicas ?? 1,
        revisionHistoryLimit: 2,
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
              podAntiAffinity: process.env.PRODUCTION_CUBOS
                ? {
                    requiredDuringSchedulingIgnoredDuringExecution: [
                      {
                        labelSelector: {
                          matchLabels: {
                            app: this.metadata.name,
                          },
                        },
                        topologyKey: "kubernetes.io/hostname",
                      },
                    ],
                  }
                : {
                    preferredDuringSchedulingIgnoredDuringExecution: [
                      {
                        weight: 100,
                        podAffinityTerm: {
                          labelSelector: {
                            matchLabels: {
                              app: this.metadata.name,
                            },
                          },
                          topologyKey: "kubernetes.io/hostname",
                        },
                      },
                    ],
                  },
            },
            ...(this.spec.image.startsWith("registry.cubos.io") ||
            this.spec.image.startsWith("registry.gitlab.com/mimic1")
              ? {
                  imagePullSecrets: [
                    {
                      name: "gitlab-registry",
                    },
                  ],
                }
              : this.spec.image.includes("gcr.io/cubos-203208")
              ? {
                  imagePullSecrets: [
                    {
                      name: "google-cloud-registry",
                    },
                  ],
                }
              : {}),
            automountServiceAccountToken: false,
            ...(process.env.PRODUCTION_CUBOS &&
            this.spec.replicas !== undefined &&
            ((Array.isArray(this.spec.replicas) &&
              this.spec.replicas[0] >= 2) ||
              this.spec.replicas >= 2) &&
            !(this.spec.disablePreemptibility ?? false)
              ? {
                  tolerations: [
                    {
                      key: "preemptible",
                      operator: "Equal",
                      value: "true",
                      effect: "NoSchedule",
                    },
                  ],
                  nodeSelector: {
                    preemptible: "true",
                  },
                }
              : {}),
            volumes,
            containers: [
              {
                name: this.metadata.name,
                image: this.spec.image,
                command: this.spec.command,
                env: [
                  ...(this.spec.envs
                    ? Object.entries(this.spec.envs).map(([name, value]) =>
                        typeof value === "object"
                          ? {
                              name,
                              valueFrom: {
                                secretKeyRef: {
                                  name: value.secretName,
                                  key: value.key,
                                },
                              },
                            }
                          : {
                              name,
                              value: `${value}`,
                            }
                      )
                    : []),
                  ...(this.spec.forwardEnvs ?? []).map((key) => ({
                    name: key,
                    value: env[key] as string,
                  })),
                ],
                envFrom:
                  this.spec.secretEnvs?.map((name) => ({
                    secretRef: {
                      name,
                    },
                  })) ?? [],
                resources: {
                  limits: {
                    cpu: this.spec.cpu.limit,
                    memory: this.spec.memory.limit,
                  },
                  requests: {
                    cpu: this.spec.cpu.request,
                    memory: this.spec.memory.request,
                  },
                },
                ports: (this.spec.ports ?? []).map((portSpec) => ({
                  name: portSpec.name ?? `port${portSpec.port}`,
                  containerPort: portSpec.containerPort ?? portSpec.port,
                })),
                volumeMounts,
                readinessProbe: basicProbe
                  ? {
                      ...basicProbe,
                      failureThreshold: 1,
                      successThreshold: 2,
                    }
                  : undefined,
                livenessProbe: basicProbe
                  ? {
                      ...basicProbe,
                      failureThreshold: 5,
                      initialDelaySeconds: this.spec.check?.initialDelay ?? 5,
                    }
                  : undefined,
              },
            ],
          },
        },
      }),
      ...((this.spec.ports ?? []).length === 0
        ? []
        : [
            new Service(this.metadata, {
              type: this.spec.ports![0].serviceType,
              selector: {
                app: this.metadata.name,
              },
              ports: this.spec.ports!.map((portSpec) => ({
                name: portSpec.name ?? `port${portSpec.port}`,
                port: portSpec.port,
                targetPort: portSpec.containerPort ?? portSpec.port,
              })),
            }),
          ]),
      ...(ingress.spec.rules!.length ? [ingress] : []),
      ...(this.spec.replicas && Array.isArray(this.spec.replicas)
        ? [
            new HorizontalPodAutoscaler(this.metadata, {
              maxReplicas: this.spec.replicas[1],
              minReplicas: this.spec.replicas[0],
              scaleTargetRef: {
                apiVersion: "apps/v1",
                kind: "Deployment",
                name: this.metadata.name,
              },
              targetCPUUtilizationPercentage: 75,
            }),
          ]
        : []),
    ]);
  }
}
