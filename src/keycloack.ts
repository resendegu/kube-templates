import * as _ from "lodash";

import { clone, generateYaml } from "./helpers";
import type { BasicObjectMeta, ObjectMeta } from "./kubernetes";
import { Deployment, Ingress, Service } from "./kubernetes";

interface KeycloackSpec {
  replicas?: number;
  version: string;
  cpu: {
    request: string | number;
    limit: string | number;
  };
  memory: string | number;
  auth?: {
    keycloackUser: string;
    keycloackPassword: string;
  };
  host: string;
  tlsCert: string;
  proxyAddressForwaring: boolean;
  serviceType?: "ExternalName" | "ClusterIP" | "NodePort" | "LoadBalancer";
  serviceMetadata?: BasicObjectMeta;
}

export class Keycloack {
  constructor(private metadata: ObjectMeta, private spec: KeycloackSpec) {}

  get yaml() {
    return generateYaml([
      new Service(_.merge(this.metadata, this.spec.serviceMetadata), {
        selector: {
          app: this.metadata.name,
        },
        type: this.spec.serviceType ?? "LoadBalancer",
        ports: [
          {
            name: "http",
            port: 8080,
          },
        ],
      }),
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
                    value: this.spec.auth?.keycloackUser ?? "admin",
                  },
                  {
                    name: "KEYCLOAK_PASSWORD",
                    value: this.spec.auth?.keycloackPassword ?? "admin",
                  },
                  {
                    name: "KEYCLOACK_PROXY_ADDRESS_FORWARDING",
                    value: this.spec.proxyAddressForwaring ? "true" : "false",
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
      new Ingress(clone(this.metadata), {
        rules: [
          {
            host: this.spec.host,
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
            hosts: [this.spec.host],
            secretName: this.spec.tlsCert,
          },
        ],
      }),
    ]);
  }
}
