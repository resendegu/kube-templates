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
  ports?: (({
    type: "http";
    publicUrl?: string;
    checkPath?: string;
    tlsCert?: string;
  } | {
    type: "tcp";
  }) & ({
    name: string;
    port: number;
    containerPort?: number;
    checkPeriod?: number;
  }))[]
}

export class StatelessApp {
  constructor(private metadata: ObjectMeta, private spec: StatelessAppSpec) {}

  get yaml() {
    const ingress = new Ingress(this.metadata, { rules: [], tls: [] });
    for (const portSpec of (this.spec.ports ?? [])) {
      if (portSpec.type !== "http" || !portSpec.publicUrl)
        continue;

      const { hostname, pathname } = new URL(portSpec.publicUrl);

      let rule = ingress.spec.rules!.find(x => x.host === hostname);
      if (!rule) {
        ingress.spec.rules!.push(rule = { host: hostname, http: { paths: [] } });
      }

      rule.http.paths.push({
        backend: {
          serviceName: this.metadata.name,
          servicePort: portSpec.port
        },
        path: pathname
      });
    }

    return generateYaml([
      new Deployment(this.metadata, {
        replicas: this.spec.replicas ?? 1,
        revisionHistoryLimit: 2,
        selector: {
          matchLabels: {
            "app.kubernetes.io/name": this.metadata.name
          }
        },
        template: {
          metadata: {
            labels: {
              "app.kubernetes.io/name": this.metadata.name
            }
          },
          spec: {
            imagePullSecrets: [
              {
                name: "gitlab-registry"
              }
            ],
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
                }))
              }
            ]
          }
        }
      }),
      ...((this.spec.ports ?? []).length === 0 ? [] : [new Service(this.metadata, {
        selector: {
          "app.kubernetes.io/name": this.metadata.name
        },
        ports: (this.spec.ports ?? []).map(portSpec => ({
          name: portSpec.name,
          port: portSpec.port,
          targetPort: portSpec.containerPort ?? portSpec.port
        }))
      })]),
      ...(ingress.spec.rules!.length ? [ingress] : [])
    ]);
  }
}
