import { generateYaml } from "./helpers";
import { ObjectMeta } from "./kubernetes";

export interface CertificateSpec {
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

export interface ObjectReference {
  group?: string
  kind: string
  name: string
}

export interface ACMECertificateConfig {
  config: DomainSolverConfig[]
}

export type DomainSolverConfig = ({
  dns01: DNS01SolverConfig
} | {
  http01: HTTP01SolverConfig
}) & {
  domains: string[]
}

export interface DNS01SolverConfig {
  provider: string
}

export type HTTP01SolverConfig = {
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
