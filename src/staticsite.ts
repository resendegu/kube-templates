import { URL } from "url";

import type { IngressClasses } from "./helpers";
import { generateYaml } from "./helpers";
import type { ObjectMeta } from "./kubernetes";
import { IngressV1, Service } from "./kubernetes";

interface StaticSiteSpec {
  provider?: "gcs" | "s3";
  publicUrl: string;
  ingressClass?: IngressClasses;
  bucketName?: string;
  notFoundRedirect?: string;
  notFoundStatus?: number;
  tlsCert: string;
  additionalConfigurationSnippet?: string;
}

export class StaticSite {
  constructor(
    private metadata: ObjectMeta,
    private spec: StaticSiteSpec,
  ) {}

  get yaml() {
    const { hostname, pathname } = new URL(this.spec.publicUrl);
    const providerName =
      this.spec.provider === "s3" ? "amazon-s3" : "google-cloud-storage";
    const providerEndpoint =
      this.spec.provider === "s3"
        ? "s3.amazonaws.com"
        : "storage.googleapis.com";

    const annotations = this.metadata.annotations ?? {};

    return generateYaml([
      new Service(
        {
          name: providerName,
          namespace: this.metadata.namespace,
        },
        {
          type: "ExternalName",
          externalName: providerEndpoint,
        },
      ),

      new IngressV1(
        {
          ...this.metadata,
          annotations: {
            ...annotations,
            "nginx.ingress.kubernetes.io/rewrite-target": `/${
              this.spec.bucketName ?? hostname
            }/$1`,
            "nginx.ingress.kubernetes.io/upstream-vhost": providerEndpoint,
            "nginx.ingress.kubernetes.io/configuration-snippet": `
              proxy_intercept_errors on;
              error_page 403 = /index.html;
              ${
                this.spec.notFoundRedirect
                  ? `error_page 404 =${this.spec.notFoundStatus ?? ""} ${
                      this.spec.notFoundRedirect
                    };`
                  : ""
              }
              ${this.spec.additionalConfigurationSnippet ?? ""}
            `,
          },
        },
        {
          tls: [{ secretName: this.spec.tlsCert }],
          ingressClassName: this.spec.ingressClass,
          rules: [
            {
              host: hostname,
              http: {
                paths: [
                  {
                    path: `${pathname}?(.*)`,
                    pathType: "ImplementationSpecific",
                    backend: {
                      service: {
                        name: providerName,
                        port: {
                          number: 80,
                        },
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      ),
    ]);
  }
}
