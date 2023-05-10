import { CertManagerV1Certificate } from "./certmanager";
import { generateYaml } from "./helpers";
import type { ObjectMeta } from "./kubernetes";
import { Secret } from "./kubernetes";

interface CertificateSpec {
  domain: string;
  challengeType?: "http" | "dns";
  provider?: string;
  replicationAllowedNamespaces?: RegExp;
}

/**
 * @deprecated Use CertificateV1 instead
 */
export class Certificate {
  constructor(
    private metadata: Omit<ObjectMeta, "name"> & { name?: string },
    private spec: CertificateSpec,
  ) {
    console.error("");
    console.error("⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️");
    console.error("                     ⚠️ ATENÇÃO ⚠️                    ");
    console.error("A classe Certificate do kube-templates foi depreciada e");
    console.error("será removida em breve. Utilize a classe CertificateV1.");
    console.error("⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️");
    console.error("");
  }

  get yaml() {
    const domainSlash = this.spec.domain.replace(/\./gu, "-");
    const wildcard = (this.spec.challengeType ?? "dns") === "dns";

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
            ...(wildcard ? [`*.${this.spec.domain}`] : []),
          ],
          issuerRef: {
            name:
              this.spec.provider ??
              (wildcard ? "letsencrypt-dns" : "letsencrypt-http"),
            kind: "ClusterIssuer",
          },
        },
      ),
    ]);
  }
}
