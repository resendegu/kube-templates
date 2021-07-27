import { CertManagerV1Certificate } from "./certmanager";
import { generateYaml } from "./helpers";
import type { ObjectMeta } from "./kubernetes";
import { Secret } from "./kubernetes";

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
      new Secret({
        ...this.metadata,
        name: `cert-${domainSlash}`,
        annotations: {
          ...(this.metadata.annotations ?? {}),
          ...(this.spec.replicationAllowedNamespaces
            ? {
                "replicator.v1.mittwald.de/replication-allowed": "true",
                "replicator.v1.mittwald.de/replication-allowed-namespaces":
                  this.spec.replicationAllowedNamespaces.source,
              }
            : {}),
        },
      }),
      new CertManagerV1Certificate(
        {
          name: domainSlash,
          ...this.metadata,
        },
        {
          secretName: `cert-${domainSlash}`,
          commonName: this.spec.domain,
          dnsNames: [
            this.spec.domain,
            ...(this.spec.wildcard ? [`*.${this.spec.domain}`] : []),
          ],
          issuerRef: {
            name: this.spec.issuer ?? "letsencrypt-dns",
            kind: "ClusterIssuer",
          },
        }
      ),
    ]);
  }
}
