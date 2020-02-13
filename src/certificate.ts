import { generateYaml } from "./helpers";
import { ObjectMeta, Secret } from "./kubernetes";
import { CertManagerCertificate } from "./certmanager";

interface CertificateSpec {
  domain: string;
  provider?: string;
  replicationAllowedNamespaces?: RegExp;
}

export class Certificate {
  constructor(private metadata: Omit<ObjectMeta, "name"> & { name?: string }, private spec: CertificateSpec) {}

  get yaml() {
    const domainSlash = this.spec.domain.replace(/\./gu, "-");

    return generateYaml([
      new CertManagerCertificate(
        {
          name: domainSlash,
          ...this.metadata
        },
        {
          secretName: `cert-${domainSlash}`,
          commonName: this.spec.domain,
          issuerRef: {
            name: "letsencrypt",
            kind: "ClusterIssuer"
          },
          dnsNames: [this.spec.domain, "*." + this.spec.domain],
          acme: {
            config: [
              {
                dns01: {
                  provider: this.spec.provider ?? "cloudflare"
                },
                domains: [this.spec.domain, "*." + this.spec.domain]
              }
            ]
          }
        }
      ),
      new Secret({
        ...this.metadata,
        name: `cert-${domainSlash}`,
        annotations: {
          ...(this.metadata.annotations ?? {}),
          ...(this.spec.replicationAllowedNamespaces
            ? {
                "replicator.v1.mittwald.de/replication-allowed": "true",
                "replicator.v1.mittwald.de/replication-allowed-namespaces": this.spec.replicationAllowedNamespaces.source
              }
            : {})
        }
      })
    ]);
  }
}
