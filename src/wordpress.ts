import { URL } from "url";
import { generateYaml, parseMemory } from "./helpers";
import { Ingress, ObjectMeta, Service, StatefulSet } from "./kubernetes";

interface WordPressSpec {
  version: string;
  database: {
    host: string;
    username: string;
    password?: string;
    name?: string;
  };
  cpu: {
    request: string | number;
    limit: string | number;
  };
  memory: {
    request: string | number;
    limit: string | number;
  };
  ingress: {
    class?: "public" | "private" | "internal";
    publicUrl?: string;
    tlsCert?: string;
    timeout?: number;
    maxBodySize?: string;
  };
}

export class WordPress {
  constructor(private metadata: ObjectMeta, private spec: WordPressSpec) {}

  get yaml() {
    const url = this.spec.ingress.publicUrl ? new URL(this.spec.ingress.publicUrl) : null;
    const maxUploadSize = this.spec.ingress.maxBodySize ? Math.ceil(parseMemory(this.spec.ingress.maxBodySize) / 1024 / 1024) + "M" : "2M";
    const postMaxSize = this.spec.ingress.maxBodySize ? Math.ceil(parseMemory(this.spec.ingress.maxBodySize) / 1024 / 1024) + 8 + "M" : "10M";

    return generateYaml([
      new Service(
        {
          name: this.metadata.name,
          namespace: this.metadata.namespace,
        },
        {
          selector: {
            app: this.metadata.name,
          },
          ports: [
            {
              name: "http",
              port: 80,
            },
          ],
        }
      ),

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
            automountServiceAccountToken: false,
            initContainers: [
              {
                name: "wordpress-setup",
                image: `wordpress:${this.spec.version}`,
                command: [
                  "/bin/bash",
                  "-ecx",
                  `cp /usr/local/etc/php/conf.d/* /phpconf/ && echo -e "post_max_size=${postMaxSize}\\nupload_max_filesize=${maxUploadSize}\\n" > /phpconf/custom.ini`,
                ],
                args: [],
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
                volumeMounts: [
                  {
                    name: "php-config",
                    mountPath: "/phpconf",
                  },
                ],
              },
            ],
            containers: [
              {
                name: "wordpress",
                image: `wordpress:${this.spec.version}`,
                env: [
                  {
                    name: "WORDPRESS_DB_HOST",
                    value: this.spec.database.host,
                  },
                  {
                    name: "WORDPRESS_DB_USER",
                    value: this.spec.database.username,
                  },
                  {
                    name: "WORDPRESS_DB_NAME",
                    value: this.spec.database.name ?? "wordpress",
                  },
                  ...(this.spec.database.password
                    ? [
                        {
                          name: "WORDPRESS_DB_PASSWORD",
                          value: this.spec.database.password,
                        },
                      ]
                    : []),
                ],
                imagePullPolicy: "IfNotPresent",
                ports: [
                  {
                    name: "http",
                    containerPort: 80,
                  },
                ],
                volumeMounts: [
                  {
                    mountPath: "/var/www/html",
                    name: "data",
                    subPath: "www",
                  },
                  {
                    mountPath: "/usr/local/etc/php/conf.d",
                    name: "php-config",
                  },
                ],
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
                readinessProbe: {
                  httpGet: {
                    path: "/wp-includes/images/blank.gif",
                    port: 80,
                  },
                  initialDelaySeconds: 5,
                  failureThreshold: 1,
                  periodSeconds: 3,
                },
                livenessProbe: {
                  httpGet: {
                    path: "/wp-includes/images/blank.gif",
                    port: 80,
                  },
                  initialDelaySeconds: 5,
                  failureThreshold: 2,
                  periodSeconds: 5,
                },
              },
            ],
            volumes: [
              {
                name: "php-config",
                emptyDir: {},
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
              storageClassName: process.env.PRODUCTION ? "ssd-regional" : "standard",
            },
          },
        ],
      }),

      ...(url
        ? [
            new Ingress(
              {
                name: this.metadata.name,
                namespace: this.metadata.namespace,
                annotations: {
                  ...(this.spec.ingress.maxBodySize
                    ? {
                        "nginx.ingress.kubernetes.io/proxy-body-size": parseMemory(this.spec.ingress.maxBodySize).toString(),
                      }
                    : {}),
                  ...(this.spec.ingress.timeout
                    ? {
                        "nginx.ingress.kubernetes.io/proxy-read-timeout": this.spec.ingress.timeout.toString(),
                      }
                    : {}),
                },
              },
              {
                tls: this.spec.ingress.tlsCert
                  ? [
                      {
                        secretName: this.spec.ingress.tlsCert,
                      },
                    ]
                  : [],
                rules: [
                  {
                    host: url.hostname,
                    http: {
                      paths: [
                        {
                          path: url.pathname,
                          backend: {
                            serviceName: this.metadata.name,
                            servicePort: 80,
                          },
                        },
                      ],
                    },
                  },
                ],
              }
            ),
          ]
        : []),
    ]);
  }
}
