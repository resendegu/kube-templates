import type { sh } from "./generated";
import { generateYaml } from "./helpers";
import type { ObjectMeta } from "./kubernetes";

export class ScaledObject {
  constructor(
    public metadata: ObjectMeta,
    public spec: sh.keda.v1alpha1.ScaledObject_spec,
  ) {}

  get yaml() {
    return generateYaml([
      {
        apiVersion: "keda.sh/v1alpha1",
        kind: "ScaledObject",
        metadata: this.metadata,
        spec: this.spec,
      },
    ]);
  }
}

export class ScaledJob {
  constructor(
    public metadata: ObjectMeta,
    public spec: sh.keda.v1alpha1.ScaledJob_spec,
  ) {}

  get yaml() {
    return generateYaml([
      {
        apiVersion: "keda.sh/v1alpha1",
        kind: "ScaledJob",
        metadata: this.metadata,
        spec: this.spec,
      },
    ]);
  }
}
