import { generateYaml } from "./helpers";
import { ObjectMeta } from "./kubernetes";

interface CertificateSpec {
  acme: ACMECertificateConfig;
  commonName?: string;
  dnsNames?: string[];
  duration?: string;
  ipAddresses?: string[];
  isCA?: boolean;
  issuerRef?: ObjectReference;
  keyAlgorithm?: "rsa" | "ecdsa";
  keyEncoding?: "pkcs1" | "pkcs8";
  keySize?: number;
  organization?: string[];
  renewBefore?: string;
  secretName: string;
  usages?: string[];
}

interface CertificateV1Spec {
  subject?: {
    zone: string;
    tpp?: any; // TODO
    cloud?: any; // TODO
  };
  commonName?: string;
  duration?: string;
  renewBefore?: string;
  dnsNames?: string[];
  ipAddresses?: string[];
  uris?: string[];
  emailAddresses?: string[];
  secretName: string;
  keystores?: {
    jks?: any; // TODO
    pkcs12?: any; // TODO
  };
  issuerRef: ObjectReference;
  isCA?: boolean;
  usages?: string[];
  privateKey?: {
    rotationPolicy?: any; // TODO
    encoding?: any; // TODO
    algorithm?: any; // TODO
    size?: number;
  };
  encodeUsagesInRequest?: boolean;
  revisionHistoryLimit?: number;
}

interface ObjectReference {
  group?: string;
  kind?: string;
  name: string;
}

interface ACMECertificateConfig {
  config: DomainSolverConfig[];
}

type DomainSolverConfig = (
  | {
      dns01: DNS01SolverConfig;
    }
  | {
      http01: HTTP01SolverConfig;
    }
) & {
  domains: string[];
};

interface DNS01SolverConfig {
  provider: string;
}

type HTTP01SolverConfig =
  | {
      ingress: string;
    }
  | {
      ingressClass: string;
    }
  | {};

export class CertManagerCertificate {
  constructor(public metadata: ObjectMeta, public spec: CertificateSpec) {}

  get yaml() {
    return generateYaml([
      {
        apiVersion: "certmanager.k8s.io/v1alpha1",
        kind: "Certificate",
        metadata: this.metadata,
        spec: this.spec,
      },
    ]);
  }
}

export class CertManagerV1Certificate {
  constructor(public metadata: ObjectMeta, public spec: CertificateV1Spec) {}

  get yaml() {
    return generateYaml([
      {
        apiVersion: "cert-manager.io/v1",
        kind: "Certificate",
        metadata: this.metadata,
        spec: this.spec,
      },
    ]);
  }
}
