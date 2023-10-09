import type { io } from "./generated";
import { generateYaml } from "./helpers";
import type { ObjectMeta } from "./kubernetes";

export class StackgresCluster {
  constructor(
    public metadata: ObjectMeta,
    public spec: io.stackgres.v1.SGCluster_spec,
  ) {}

  get yaml() {
    return generateYaml([
      {
        apiVersion: "stackgres.io/v1",
        kind: "SGCluster",
        metadata: this.metadata,
        spec: this.spec,
      },
    ]);
  }
}

export class StackgresInstanceProfile {
  constructor(
    public metadata: ObjectMeta,
    public spec: io.stackgres.v1.SGInstanceProfile_spec,
  ) {}

  get yaml() {
    return generateYaml([
      {
        apiVersion: "stackgres.io/v1",
        kind: "SGInstanceProfile",
        metadata: this.metadata,
        spec: this.spec,
      },
    ]);
  }
}

export class StackgresPostgresConfig {
  constructor(
    public metadata: ObjectMeta,
    public spec: io.stackgres.v1.SGPostgresConfig_spec,
  ) {}

  get yaml() {
    return generateYaml([
      {
        apiVersion: "stackgres.io/v1",
        kind: "SGPostgresConfig",
        metadata: this.metadata,
        spec: this.spec,
      },
    ]);
  }
}

export class StackgresBackupConfig {
  constructor(
    public metadata: ObjectMeta,
    public spec: io.stackgres.v1.SGBackupConfig_spec,
  ) {}

  get yaml() {
    return generateYaml([
      {
        apiVersion: "stackgres.io/v1",
        kind: "SGBackupConfig",
        metadata: this.metadata,
        spec: this.spec,
      },
    ]);
  }
}
