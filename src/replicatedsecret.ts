import { generateYaml } from "./helpers";
import { ObjectMeta, Secret } from "./kubernetes";

interface ReplicatedSecretSpec {
  from: string;
}

export class ReplicatedSecret {
  constructor(
    private metadata: ObjectMeta,
    private spec: ReplicatedSecretSpec
  ) {}

  get yaml() {
    return generateYaml([
      new Secret({
        ...this.metadata,
        annotations: {
          ...(this.metadata.annotations ?? {}),
          "replicator.v1.mittwald.de/replicate-from": this.spec.from,
        },
      }),
    ]);
  }
}
