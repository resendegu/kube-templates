import { generateYaml } from "./helpers";
import { ObjectMeta } from "./kubernetes";

interface CertificateSpec {
  acme: ACMECertificateConfig
  commonName?: string
  dnsNames?: string[]
  duration?: string
  ipAddresses?: string[]
  isCA?: boolean
  issuerRef?: ObjectReference
  keyAlgorithm?: "rsa" | "ecdsa"
  keyEncoding?: "pkcs1" | "pkcs8"
  keySize?: number
  organization?: string[]
  renewBefore?: string
  secretName: string
  usages?: string[]
}

interface ObjectReference {
  group?: string
  kind: string
  name: string
}

interface ACMECertificateConfig {
  config: DomainSolverConfig[]
}

type DomainSolverConfig = ({
  dns01: DNS01SolverConfig
} | {
  http01: HTTP01SolverConfig
}) & {
  domains: string[]
}

interface DNS01SolverConfig {
  provider: string
}

type HTTP01SolverConfig = {
  ingress: string
} | {
  ingressClass: string
}

export class CertManagerCertificate {
  constructor(public metadata: ObjectMeta, public spec: CertificateSpec) {}

  get yaml() {
    return generateYaml([
      {
        apiVersion: "certmanager.k8s.io/v1alpha1",
        kind: "Certificate",
        metadata: this.metadata,
        spec: this.spec
      }
    ]);
  }
}
