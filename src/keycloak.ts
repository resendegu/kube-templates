import * as _ from "lodash";

import { clone, generateYaml } from "./helpers";
import type { BasicObjectMeta, ObjectMeta } from "./kubernetes";
import { Deployment, Ingress, Service } from "./kubernetes";

interface KeycloakSpec {
  replicas?: number;
  version: string;
  cpu: {
    request: string | number;
    limit: string | number;
  };
  memory: string | number;
  auth?: {
    keycloakUser: string;
    keycloakPassword: string;
  };
  ingress?: {
    host: string;
    tlsCert: string;
    proxyAddressForwarding: boolean;
  };
  service?: {
    type?: "ExternalName" | "ClusterIP" | "NodePort" | "LoadBalancer";
    metadata?: BasicObjectMeta;
  };
}

export class Keycloak {
  constructor(private metadata: ObjectMeta, private spec: KeycloakSpec) {}

  get yaml() {
    return generateYaml([
      new Service(_.merge(this.metadata, this.spec.service?.metadata), {
        selector: {
          app: this.metadata.name,
        },
        type: this.spec.service?.type ?? "LoadBalancer",
        ports: [
          {
            name: "http",
            port: 8080,
          },
        ],
      }),
      new Deployment(this.metadata, {
        replicas: this.spec.replicas ?? 1,
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
            containers: [
              {
                name: this.metadata.name,
                image: `quay.io/keycloak/keycloak:${this.spec.version}`,
                resources: {
                  requests: {
                    cpu: this.spec.cpu.request,
                    memory: this.spec.memory,
                  },
                  limits: {
                    cpu: this.spec.cpu.limit,
                    memory: this.spec.memory,
                  },
                },
                ports: [
                  {
                    name: "http",
                    containerPort: 8080,
                  },
                  {
                    name: "https",
                    containerPort: 8443,
                  },
                ],
                env: [
                  {
                    name: "KEYCLOAK_USER",
                    value: this.spec.auth?.keycloakUser ?? "admin",
                  },
                  {
                    name: "KEYCLOAK_PASSWORD",
                    value: this.spec.auth?.keycloakPassword ?? "admin",
                  },
                  {
                    name: "KEYCLOAK_PROXY_ADDRESS_FORWARDING",
                    value: this.spec.ingress?.proxyAddressForwarding
                      ? "true"
                      : "false",
                  },
                ],
                readinessProbe: {
                  httpGet: {
                    path: "/auth/realms/master",
                    port: 8080,
                  },
                },
              },
            ],
          },
        },
      }),
      ...(this.spec.ingress
        ? [
            new Ingress(clone(this.metadata), {
              rules: [
                {
                  host: this.spec.ingress.host,
                  http: {
                    paths: [
                      {
                        path: "/",
                        pathType: "Prefix",
                        backend: {
                          serviceName: this.metadata.name,
                          servicePort: 8080,
                        },
                      },
                    ],
                  },
                },
              ],
              tls: [
                {
                  hosts: [this.spec.ingress.host],
                  secretName: this.spec.ingress.tlsCert,
                },
              ],
            }),
          ]
        : []),
    ]);
  }
}
