import { URL } from "url";

import { Cron } from "./cron";
import type { io } from "./generated";
import { clone, env, generateYaml, parseMemory } from "./helpers";
import type { ObjectMeta } from "./kubernetes";
import {
  Deployment,
  HorizontalPodAutoscaler,
  IngressV1,
  Service,
} from "./kubernetes";

interface StatelessAppSpec {
  replicas?: number | [number, number];
  image: string;
  imagePullPolicy?: io.k8s.api.core.v1.Container["imagePullPolicy"];
  command?: string[];
  args?: string[];
  envs?: Record<string, string | number | { secretName: string; key: string }>;
  forwardEnvs?: string[];
  secretEnvs?: string[];
  annotations?: Record<string, string>;
  labels?: Record<string, string>;
  topologySpreadConstraints?: io.k8s.api.core.v1.TopologySpreadConstraint[];
  cpu: {
    request: string | number;
    limit: string | number;
  };
  memory: {
    request: string | number;
    limit: string | number;
  };
  serviceAccountName?: string;
  ports?: Array<
    (
      | {
          type: "http";
          ingressClass?: string;
          ingressAnnotations?: Record<string, string>;
          publicUrl?: string | string[];
          tlsCert?: string;
          timeout?: number;
          maxBodySize?: string;
          limitRequestsPerSecond?: number;
          endpoints?: Array<{
            publicUrl?: string;
            tlsCert?: string;
            maxBodySize?: string;
            limitRequestsPerSecond?: number;
          }>;
        }
      | {
          type: "tcp";
        }
      | {
          type: "udp";
        }
    ) & {
      name?: string;
      port: number;
      containerPort?: number;
      serviceType?: "ExternalName" | "ClusterIP" | "NodePort" | "LoadBalancer";
    }
  >;
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
  volumes?: Array<
    {
      type: "configMap" | "secret";
      name: string;
      optional?: boolean;
      mountPath: string;
      defaultMode?: number;
      items?: Array<{ key: string; path: string }>;
    } & io.k8s.api.core.v1.VolumeMount
  >;
  crons?: Array<{
    name: string;
    schedule: string;
    args: string[];
    command: string[];
    envs?: Record<
      string,
      string | number | { secretName: string; key: string }
    >;
    forwardEnvs?: string[];
    secretEnvs?: string[];
    cpu?: {
      request?: string | number;
      limit?: string | number;
    };
    memory?: {
      request?: string | number;
      limit?: string | number;
    };
  }>;
  imagePullSecrets?: string[];
  terminationGracePeriodSeconds?: number;
  /**
   * @deprecated does nothing! kept only for compatibility purposes
   */
  disablePreemptibility?: boolean;
}

export class StatelessApp {
  constructor(
    private metadata: ObjectMeta,
    private spec: StatelessAppSpec,
  ) {}

  get yaml() {
    const ingress = new IngressV1(clone(this.metadata), { rules: [], tls: [] });

    for (const portSpec of this.spec.ports ?? []) {
      if (
        portSpec.type !== "http" ||
        (!portSpec.publicUrl && !portSpec.endpoints?.length)
      ) {
        continue;
      }

      if (portSpec.publicUrl) {
        if (!portSpec.endpoints) {
          portSpec.endpoints = [];
        }

        const publicUrls = Array.isArray(portSpec.publicUrl)
          ? portSpec.publicUrl
          : [portSpec.publicUrl];

        for (const publicUrl of publicUrls) {
          portSpec.endpoints.push({
            limitRequestsPerSecond: portSpec.limitRequestsPerSecond,
            maxBodySize: portSpec.maxBodySize,
            tlsCert: portSpec.tlsCert,
            publicUrl,
          });
        }
      }

      let maxBodySizeBytes = null;
      let limitRequestsPerSecond = null;
      let hasPath = false;

      for (const endpointSpec of portSpec.endpoints ?? []) {
        if (!endpointSpec.publicUrl) {
          continue;
        }

        const { protocol, hostname, pathname } = new URL(
          endpointSpec.publicUrl,
        );
        let rule = ingress.spec.rules!.find(x => x.host === hostname);

        if (!rule) {
          ingress.spec.rules!.push(
            (rule = { host: hostname, http: { paths: [] } }),
          );
        }

        if (protocol === "https:") {
          if (!endpointSpec.tlsCert) {
            throw "Uma URL com HTTPS foi utilizada, mas 'tlsCert' não foi informado";
          }

          let tls = ingress.spec.tls!.find(
            x => x.secretName === endpointSpec.tlsCert,
          );

          if (!tls) {
            ingress.spec.tls!.push(
              (tls = { secretName: endpointSpec.tlsCert, hosts: [] }),
            );
          }

          if (!tls.hosts!.includes(hostname)) {
            tls.hosts!.push(hostname);
          }
        }

        hasPath = hasPath || pathname !== "/";

        rule.http.paths.push({
          backend: {
            service: {
              name: this.metadata.name,
              port: {
                number: portSpec.port,
              },
            },
          },
          pathType: "Prefix",
          path:
            pathname === "/"
              ? portSpec.ingressClass === "alb"
                ? "/*"
                : pathname
              : `${
                  pathname.endsWith("/")
                    ? pathname.substring(0, pathname.length - 1)
                    : pathname
                }(/|$)(.*)`,
        });

        if (endpointSpec.maxBodySize) {
          const endpointMaxBodySizeBytes = parseMemory(
            endpointSpec.maxBodySize,
          );

          if (
            !maxBodySizeBytes ||
            endpointMaxBodySizeBytes > maxBodySizeBytes
          ) {
            maxBodySizeBytes = endpointMaxBodySizeBytes;
          }
        }

        if (endpointSpec.limitRequestsPerSecond) {
          // eslint-disable-next-line prefer-destructuring
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

      if (portSpec.ingressClass) {
        ingress.spec.ingressClassName = portSpec.ingressClass;
      }
    }

    let basicProbe;

    if (this.spec.check) {
      if ((this.spec.check as any).command) {
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
    }

    const volumes: io.k8s.api.core.v1.Volume[] = [];
    const volumeMounts: io.k8s.api.core.v1.VolumeMount[] = [];

    for (const volume of this.spec.volumes ?? []) {
      const name = `vol-${volume.mountPath.replace(/[^a-zA-Z0-9]/gu, "")}`;

      if (volume.type === "secret") {
        volumes.push({
          name,
          secret: {
            secretName: volume.name,
            items: volume.items,
            optional: volume.optional ?? false,
            defaultMode: volume.defaultMode,
          },
        });
      } else {
        volumes.push({
          name,
          [volume.type]: {
            name: volume.name,
            items: volume.items,
            optional: volume.optional ?? false,
            defaultMode: volume.defaultMode,
          },
        });
      }

      volumeMounts.push({
        name,
        readOnly: volume.readOnly ?? true,
        mountPath: volume.mountPath,
        subPath: volume.subPath,
        mountPropagation: volume.mountPropagation,
        subPathExpr: volume.subPathExpr,
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
            annotations: this.spec.annotations,
            labels: {
              app: this.metadata.name,
              ...this.spec.labels,
            },
          },
          spec: {
            topologySpreadConstraints: [
              {
                maxSkew: 1,
                topologyKey: "topology.kubernetes.io/zone",
                whenUnsatisfiable: "ScheduleAnyway",
                labelSelector: {
                  matchLabels: {
                    app: this.metadata.name,
                  },
                },
              },
              ...(this.spec.topologySpreadConstraints ?? []),
            ],
            ...(this.spec.imagePullSecrets
              ? {
                  imagePullSecrets: this.spec.imagePullSecrets.map(secret => ({
                    name: secret,
                  })),
                }
              : this.spec.image.startsWith("registry.cubos.io")
              ? { imagePullSecrets: [{ name: "gitlab-registry" }] }
              : {}),
            ...(this.spec.terminationGracePeriodSeconds === undefined
              ? {}
              : {
                  terminationGracePeriodSeconds:
                    this.spec.terminationGracePeriodSeconds,
                }),
            automountServiceAccountToken: Boolean(this.spec.serviceAccountName),
            serviceAccountName: this.spec.serviceAccountName,
            tolerations: [],
            nodeSelector: {},
            volumes,
            containers: [
              {
                name: this.metadata.name,
                image: this.spec.image,
                imagePullPolicy: this.spec.imagePullPolicy,
                command: this.spec.command,
                args: this.spec.args,
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
                            },
                      )
                    : []),
                  ...(this.spec.forwardEnvs ?? []).map(key => ({
                    name: key,
                    value: env[key],
                  })),
                ],
                envFrom:
                  this.spec.secretEnvs?.map(name => ({
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
                ports: (this.spec.ports ?? []).map(portSpec => ({
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
      ...(this.spec.crons ?? []).map(
        cron =>
          new Cron(
            {
              ...this.metadata,
              name: `${this.metadata.name}-${cron.name}`,
            },
            {
              cpu: {
                limit: cron.cpu?.limit ?? this.spec.cpu.limit,
                request: cron.cpu?.request ?? this.spec.cpu.request,
              },
              memory: {
                limit: cron.memory?.limit ?? this.spec.memory.limit,
                request: cron.memory?.request ?? this.spec.memory.request,
              },
              image: this.spec.image,
              schedule: cron.schedule,
              args: cron.args,
              command: cron.command,
              envs: { ...this.spec.envs, ...cron.envs },
              forwardEnvs: [
                ...(this.spec.forwardEnvs ?? []),
                ...(cron.forwardEnvs ?? []),
              ],
              secretEnvs: [
                ...(this.spec.secretEnvs ?? []),
                ...(cron.secretEnvs ?? []),
              ],
              volumes: this.spec.volumes,
            },
          ),
      ),
      ...((this.spec.ports ?? []).length === 0
        ? []
        : [
            new Service(this.metadata, {
              type: this.spec.ports![0].serviceType,
              selector: {
                app: this.metadata.name,
              },
              ports: this.spec.ports!.map(portSpec => ({
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
              minReplicas: this.spec.replicas[0],
              maxReplicas: this.spec.replicas[1],
              metrics: [
                {
                  type: "Resource",
                  resource: {
                    name: "cpu",
                    target: {
                      type: "Utilization",
                      averageUtilization: 75,
                    },
                  },
                },
              ],
              scaleTargetRef: {
                apiVersion: "apps/v1",
                kind: "Deployment",
                name: this.metadata.name,
              },
            }),
          ]
        : []),
    ]);
  }
}
