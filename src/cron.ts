import * as _ from "lodash";

import type { io } from "./generated/kubernetes";
import { env, generateYaml } from "./helpers";
import type { ObjectMeta } from "./kubernetes";
import { CronJob } from "./kubernetes";

interface CronSpec {
  schedule: string;
  disablePreemptibility?: boolean;
  image: string;
  args?: string[];
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
  volumes?: Array<{
    type: "configMap" | "secret";
    optional?: boolean;
    readOnly?: boolean;
    name: string;
    mountPath: string;
    items?: Array<{ key: string; path: string }>;
  }>;
  backoffLimit?: number;
  imagePullSecrets?: Array<{ name: string }>;
}

export class Cron {
  constructor(private metadata: ObjectMeta, private spec: CronSpec) {}

  get yaml() {
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

    const basicPodSpec = {
      ...(this.spec.imagePullSecrets
        ? { imagePullSecrets: this.spec.imagePullSecrets }
        : this.spec.image.startsWith("registry.cubos.io")
        ? { imagePullSecrets: [{ name: "gitlab-registry" }] }
        : {}),
      automountServiceAccountToken: false,
    };

    return generateYaml([
      new CronJob(this.metadata, {
        schedule: this.spec.schedule,
        jobTemplate: {
          spec: {
            template: {
              spec: {
                ...basicPodSpec,
                ...(this.spec.disablePreemptibility ?? false
                  ? {}
                  : {
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
                    }),
                volumes,
                containers: [
                  {
                    name: this.metadata.name,
                    image: this.spec.image,
                    args: this.spec.args,
                    command: this.spec.command,
                    env: [
                      ...Object.entries({
                        ...this.spec.envs,
                      }).map(([name, value]) =>
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
                      ),
                      ...(this.spec.forwardEnvs ?? []).map(key => ({
                        name: key,
                        value: env[key],
                      })),
                    ],
                    envFrom: (this.spec.secretEnvs ?? []).map(name => ({
                      secretRef: {
                        name,
                      },
                    })),
                    volumeMounts,
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
                  },
                ],
                restartPolicy: "Never",
              },
            },
            ...(_.isUndefined(this.spec.backoffLimit)
              ? {}
              : { backoffLimit: this.spec.backoffLimit }),
          },
        },
      }),
    ]);
  }
}
