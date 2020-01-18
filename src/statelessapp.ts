import { URL } from "url";
import { clone, env, generateYaml } from "./helpers";
import { Deployment, Ingress, ObjectMeta, Service } from "./kubernetes";

interface StatelessAppSpec {
  replicas?: number;
  image: string;
  command?: string[];
  envs?: { [env: string]: string | number };
  forwardEnvs?: string[];
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
        publicUrl?: string;
        tlsCert?: string;
        maxBodySize?: string;
      }
    | {
        type: "tcp";
      }
  ) & {
    name?: string;
    port: number;
    containerPort?: number;
  })[];
  check?: {
    port: number;
    period?: number;
    initialDelay?: number;
    httpGetPath?: string;
  };
}

export class StatelessApp {
  constructor(private metadata: ObjectMeta, private spec: StatelessAppSpec) {}

  get yaml() {
    const ingress = new Ingress(clone(this.metadata), { rules: [], tls: [] });
    for (const portSpec of this.spec.ports ?? []) {
      if (portSpec.type !== "http" || !portSpec.publicUrl) continue;

      const { protocol, hostname, pathname } = new URL(portSpec.publicUrl);

      let rule = ingress.spec.rules!.find(x => x.host === hostname);
      if (!rule) {
        ingress.spec.rules!.push(
          (rule = { host: hostname, http: { paths: [] } })
        );
      }

      if (protocol === "https:") {
        if (!portSpec.tlsCert) {
          throw "Uma URL com HTTPS foi utilizada, mas 'tlsCert' não foi informado";
        }

        let tls = ingress.spec.tls!.find(
          x => x.secretName === portSpec.tlsCert
        );
        if (!tls) {
          ingress.spec.tls!.push(
            (tls = { secretName: portSpec.tlsCert, hosts: [] })
          );
        }

        if (!tls.hosts!.includes(hostname)) tls.hosts!.push(hostname);
      }

      rule.http.paths.push({
        backend: {
          serviceName: this.metadata.name,
          servicePort: portSpec.port
        },
        path: pathname
      });

      // TODO: This shouldn't be global on entire Ingress. Should be per port.
      if (portSpec.maxBodySize !== undefined) {
        const annotations = ingress.metadata.annotations ?? {};
        ingress.metadata.annotations = annotations;
        annotations["nginx.ingress.kubernetes.io/proxy-body-size"] = portSpec.maxBodySize;
      }
    }

    let basicProbe = undefined;
    if (this.spec.check === undefined) {
    } else if (this.spec.check.httpGetPath) {
      basicProbe = {
        httpGet: {
          path: this.spec.check.httpGetPath,
          port: this.spec.check.port
        },
        periodSeconds: this.spec.check.period ?? 3
      };
    } else {
      basicProbe = {
        tcpSocket: {
          port: this.spec.check.port
        },
        periodSeconds: this.spec.check.period ?? 3
      };
    }

    return generateYaml([
      new Deployment(this.metadata, {
        replicas: this.spec.replicas ?? 1,
        revisionHistoryLimit: 2,
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
            ...(this.spec.image.startsWith("registry.cubos.io")
              ? {
                  imagePullSecrets: [
                    {
                      name: "gitlab-registry"
                    }
                  ]
                }
              : this.spec.image.includes("gcr.io/cubos-203208")
              ? {
                  imagePullSecrets: [
                    {
                      name: "google-cloud-registry"
                    }
                  ]
                }
              : {}),
            automountServiceAccountToken: false,
            containers: [
              {
                name: this.metadata.name,
                image: this.spec.image,
                command: this.spec.command,
                env: [
                  ...Object.keys(this.spec.envs ?? {}).map(key => ({
                    name: key,
                    value: `${(this.spec.envs ?? {})[key]}`
                  })),
                  ...(this.spec.forwardEnvs ?? []).map(key => ({
                    name: key,
                    value: env[key] as string
                  }))
                ],
                resources: {
                  limits: {
                    cpu: this.spec.cpu.limit,
                    memory: this.spec.memory.limit
                  },
                  requests: {
                    cpu: this.spec.cpu.request,
                    memory: this.spec.memory.request
                  }
                },
                ports: (this.spec.ports ?? []).map(portSpec => ({
                  name: portSpec.name ?? `port${portSpec.port}`,
                  containerPort: portSpec.containerPort ?? portSpec.port
                })),
                readinessProbe: basicProbe
                  ? {
                      ...basicProbe,
                      failureThreshold: 1,
                      successThreshold: 2
                    }
                  : undefined,
                livenessProbe: basicProbe
                  ? {
                      ...basicProbe,
                      failureThreshold: 5,
                      initialDelaySeconds: this.spec.check?.initialDelay ?? 5
                    }
                  : undefined
              }
            ]
          }
        }
      }),
      ...((this.spec.ports ?? []).length === 0
        ? []
        : [
            new Service(this.metadata, {
              selector: {
                app: this.metadata.name
              },
              ports: (this.spec.ports ?? []).map(portSpec => ({
                name: portSpec.name ?? `port${portSpec.port}`,
                port: portSpec.port,
                targetPort: portSpec.containerPort ?? portSpec.port
              }))
            })
          ]),
      ...(ingress.spec.rules!.length ? [ingress] : [])
    ]);
  }
}
