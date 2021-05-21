import { CertManagerCertificate } from "./certmanager";
import { generateYaml } from "./helpers";
import { ObjectMeta, Secret } from "./kubernetes";

interface CertificateSpec {
  domain: string;
  challengeType?: "http" | "dns";
  provider?: string;
  replicationAllowedNamespaces?: RegExp;
}

export class Certificate {
  constructor(
    private metadata: Omit<ObjectMeta, "name"> & { name?: string },
    private spec: CertificateSpec
  ) {}

  get yaml() {
    const domainSlash = this.spec.domain.replace(/\./gu, "-");

    return generateYaml([
      new Secret({
        ...this.metadata,
        name: `cert-${domainSlash}`,
        annotations: {
          ...(this.metadata.annotations ?? {}),
          ...(this.spec.replicationAllowedNamespaces
            ? {
                "replicator.v1.mittwald.de/replication-allowed": "true",
                "replicator.v1.mittwald.de/replication-allowed-namespaces": this
                  .spec.replicationAllowedNamespaces.source,
              }
            : {}),
        },
      }),
      new CertManagerCertificate(
        {
          name: domainSlash,
          ...this.metadata,
        },
        {
          secretName: `cert-${domainSlash}`,
          commonName: this.spec.domain,
          issuerRef: {
            name: "letsencrypt",
            kind: "ClusterIssuer",
          },
          ...((this.spec.challengeType ?? "dns") === "dns"
            ? {
                dnsNames: [this.spec.domain, "*." + this.spec.domain],
                acme: {
                  config: [
                    {
                      dns01: {
                        provider: this.spec.provider ?? "cloudflare",
                      },
                      domains: [this.spec.domain, "*." + this.spec.domain],
                    },
                  ],
                },
              }
            : {
                dnsNames: [this.spec.domain],
                acme: {
                  config: [
                    {
                      http01: {},
                      domains: [this.spec.domain],
                    },
                  ],
                },
              }),
        }
      ),
    ]);
  }
}
