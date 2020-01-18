import { URL } from "url";
import { env, generateYaml } from "./helpers";
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
      }
    | {
        type: "tcp";
      }
  ) & {
    name: string;
    port: number;
    containerPort?: number;
  })[];
  check?: {
    ready?: StatelessAppProbe;
    alive?: StatelessAppProbe;
  };
}

interface StatelessAppProbe {
  port: number;
  period?: number;
  httpGetPath?: string;
}

export class StatelessApp {
  constructor(private metadata: ObjectMeta, private spec: StatelessAppSpec) {}

  get yaml() {
    const ingress = new Ingress(this.metadata, { rules: [], tls: [] });
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
    }

    function convertProbe(probe?: StatelessAppProbe) {
      if (!probe) {
        return undefined;
      } else if (probe.httpGetPath) {
        return {
          httpGet: {
            path: probe.httpGetPath,
            port: probe.port
          },
          periodSeconds: probe.period ?? 3
        };
      } else {
        return {
          tcpSocket: {
            port: probe.port
          },
          periodSeconds: probe.period ?? 3
        };
      }
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
                  name: portSpec.name,
                  containerPort: portSpec.containerPort ?? portSpec.port
                })),
                readinessProbe: convertProbe(this.spec.check?.ready),
                livenessProbe: convertProbe(this.spec.check?.alive)
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
                name: portSpec.name,
                port: portSpec.port,
                targetPort: portSpec.containerPort ?? portSpec.port
              }))
            })
          ]),
      ...(ingress.spec.rules!.length ? [ingress] : [])
    ]);
  }
}
