import { URL } from "url";
import { generateYaml } from "./helpers";
import { Ingress, ObjectMeta, Service } from "./kubernetes";

interface StaticSiteSpec {
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

    return generateYaml([
      new Service(
        {
          name: "google-cloud-storage",
          namespace: this.metadata.namespace
        },
        {
          type: "ExternalName",
          externalName: "storage.googleapis.com"
        }
      ),
      new Ingress(
        {
          ...this.metadata,
          annotations: {
            ...this.metadata.annotations,
            "nginx.ingress.kubernetes.io/rewrite-target":
              this.spec.bucketName ?? hostname,
            "nginx.ingress.kubernetes.io/upstream-vhost":
              "storage.googleapis.com",
            ...(this.spec.notFoundRedirect
              ? {
                  "nginx.ingress.kubernetes.io/configuration-snippet": `
                      proxy_intercept_errors on;
                      error_page 404 =${this.spec.notFoundStatus ?? 404} ${
                    this.spec.notFoundRedirect
                  };
                  `
                }
              : {})
          }
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
                      serviceName: "google-cloud-storage",
                      servicePort: 80
                    }
                  }
                ]
              }
            }
          ]
        }
      )
    ]);
  }
}
