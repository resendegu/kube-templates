import { generateYaml } from "./helpers";
import { ObjectMeta, Secret } from "./kubernetes";
import { CertManagerCertificate } from "./certmanager";

interface CertificateSpec {
  domain: string;
  provider?: string;
  replicationAllowedNamespaces?: RegExp;
}

export class Certificate {
  constructor(private metadata: ObjectMeta, private spec: CertificateSpec) {}

  get yaml() {
    return generateYaml([
      new CertManagerCertificate(this.metadata, {
        secretName: this.metadata.name,
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
      }),
      new Secret({
        ...this.metadata,
        annotations: {
          ...(this.metadata.annotations ?? {}),
          ...(this.spec.replicationAllowedNamespaces
            ? {
                "replicator.v1.mittwald.de/replication-allowed": "true",
                "replicator.v1.mittwald.de/replication-allowed-namespaces": this
                  .spec.replicationAllowedNamespaces.source
              }
            : {})
        }
      })
    ]);
  }
}
