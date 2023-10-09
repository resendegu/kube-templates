import type { io } from "./generated";
import { generateYaml } from "./helpers";
import type { ObjectMeta } from "./kubernetes";

export class CertManagerV1Certificate {
  constructor(
    public metadata: ObjectMeta,
    public spec: io.cert_manager.v1.Certificate_spec,
  ) {}

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
