import type { io } from "./generated";
import type { DeepPartial } from "./helpers";
import { generateYaml } from "./helpers";
import type { ObjectMeta } from "./kubernetes";
import {
  StackgresBackupConfig,
  StackgresCluster,
  StackgresInstanceProfile,
  StackgresPostgresConfig,
} from "./stackgres";

interface PostgresV1Spec {
  version: number;
  instances?: number;
  memory: string;
  cpu: {
    request: string | number;
    limit: string | number;
  };
  backups?: io.stackgres.v1.SGBackupConfig_spec;
  extensions?: string[];
  overrides?: {
    instanceProfile?: DeepPartial<io.stackgres.v1.SGInstanceProfile_spec>;
    postgresConfig?: DeepPartial<io.stackgres.v1.SGPostgresConfig_spec>;
    cluster?: DeepPartial<io.stackgres.v1.SGCluster_spec>;
  };
}

export class PostgresV1 {
  constructor(private metadata: ObjectMeta, private spec: PostgresV1Spec) {}

  get yaml() {
    return generateYaml([
      ...(this.spec.backups
        ? [
            new StackgresBackupConfig(
              {
                name: this.metadata.name,
                namespace: this.metadata.namespace,
              },
              this.spec.backups,
            ),
          ]
        : []),

      new StackgresInstanceProfile(
        {
          name: this.metadata.name,
          namespace: this.metadata.namespace,
        },
        {
          cpu: this.spec.cpu.limit.toString(),
          memory: this.spec.memory,
          ...(this.spec.overrides?.instanceProfile as any),
          requests: {
            cpu: this.spec.cpu.request.toString(),
            memory: this.spec.memory,
            ...(this.spec.overrides?.instanceProfile?.requests as any),
          },
        },
      ),

      new StackgresPostgresConfig(
        {
          name: this.metadata.name,
          namespace: this.metadata.namespace,
        },
        {
          postgresVersion: this.spec.version.toString(),
          ...(this.spec.overrides?.postgresConfig as any),
          "postgresql.conf": {
            shared_preload_libraries: "pg_stat_statements",
            ...(this.spec.overrides?.postgresConfig?.[
              "postgresql.conf"
            ] as any),
          },
        },
      ),

      new StackgresCluster(
        {
          name: this.metadata.name,
          namespace: this.metadata.namespace,
        },
        {
          instances: this.spec.instances ?? 1,
          sgInstanceProfile: this.metadata.name,
          ...(this.spec.overrides?.cluster as any),
          configurations: {
            sgPostgresConfig: this.metadata.name,
            ...(this.spec.backups
              ? {
                  sgBackupConfig: this.metadata.name,
                }
              : {}),
            ...(this.spec.overrides?.cluster?.configurations as any),
          },
          postgres: {
            version: this.spec.version.toString(),
            extensions: this.spec.extensions?.map(name => ({ name })) ?? [],
            ...(this.spec.overrides?.cluster?.postgres as any),
          },
          pods: {
            ...(this.spec.overrides?.cluster?.pods as any),
            persistentVolume: {
              size: "2Gi",
              ...(this.spec.overrides?.cluster?.pods?.persistentVolume as any),
            },
          },
        },
      ),
    ]);
  }
}
