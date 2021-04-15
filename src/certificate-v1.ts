import { CertManagerV1Certificate } from "./certmanager";
import { generateYaml } from "./helpers";
import { ObjectMeta, Secret } from "./kubernetes";

interface CertificateV1Spec {
  domain: string;
  wildcard?: boolean;
  issuer?: string;
  replicationAllowedNamespaces?: RegExp;
}

export class CertificateV1 {
  constructor(
    private metadata: Omit<ObjectMeta, "name"> & { name?: string },
    private spec: CertificateV1Spec
  ) {}

  get yaml() {
    const domainSlash = this.spec.domain.replace(/\./gu, "-");

    return generateYaml([
      new CertManagerV1Certificate(
        {
          name: domainSlash,
          ...this.metadata,
        },
        {
          secretName: `cert-${domainSlash}`,
          commonName: this.spec.domain,
          dnsNames: [this.spec.domain, ...(this.spec.wildcard ? [`*.${this.spec.domain}`] : [])],
          issuerRef: {
            name: this.spec.issuer ?? "letsencrypt",
            kind: "ClusterIssuer",
          },
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
                "replicator.v1.mittwald.de/replication-allowed-namespaces": this
                  .spec.replicationAllowedNamespaces.source,
              }
            : {}),
        },
      }),
    ]);
  }
}
