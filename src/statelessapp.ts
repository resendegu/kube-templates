import { env, generateYaml } from "./helpers";
import { Deployment, ObjectMeta } from "./kubernetes";

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
}

export class StatelessApp {
  constructor(private metadata: ObjectMeta, private spec: StatelessAppSpec) {}

  get yaml() {
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
                }
              }
            ]
          }
        }
      })
    ]);
  }
}
