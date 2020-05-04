import { URL } from "url";
import { generateYaml } from "./helpers";
import { Ingress, ObjectMeta, Service } from "./kubernetes";

interface StaticSiteSpec {
  provider?: "gcs" | "s3";
  publicUrl: string;
  bucketName?: string;
  notFoundRedirect?: string;
  notFoundStatus?: number;
  tlsCert: string;
}

export class StaticSite {
  constructor(private metadata: ObjectMeta, private spec: StaticSiteSpec) {}

  get yaml() {
    const { hostname, pathname } = new URL(this.spec.publicUrl);
    const providerName =
      this.spec.provider === "s3" ? "amazon-s3" : "google-cloud-storage";
    const providerEndpoint =
      this.spec.provider === "s3"
        ? "s3.amazonaws.com"
        : "storage.googleapis.com";

    return generateYaml([
      new Service(
        {
          name: providerName,
          namespace: this.metadata.namespace,
        },
        {
          type: "ExternalName",
          externalName: providerEndpoint,
        }
      ),

      new Ingress(
        {
          ...this.metadata,
          annotations: {
            ...this.metadata.annotations,
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
            `,
          },
        },
        {
          tls: [{ secretName: this.spec.tlsCert }],
          rules: [
            {
              host: hostname,
              http: {
                paths: [
                  {
                    path: `${pathname}?(.*)`,
                    backend: {
                      serviceName: providerName,
                      servicePort: 80,
                    },
                  },
                ],
              },
            },
          ],
        }
      ),
    ]);
  }
}
