import { loadAll } from "js-yaml";
import type { ObjectMeta } from "../../src/kubernetes";
import type { PgBouncer, PgBouncerSpec } from "../../src/pgbouncer";

export const basicMetadata: ObjectMeta = {
  name: "pgb",
  namespace: "test",
};

export const basicSpec: PgBouncerSpec = {
  cpu: { request: "100m", limit: "200m" },
  memory: { request: "64Mi", limit: "128Mi" },
  databases: [{ name: "app", host: "postgres.test.svc", dbname: "app" }],
  users: [{ username: "app", password: "app-password" }],
};

export function getDocs(pooler: PgBouncer): any[] {
  return loadAll(pooler.yaml) as any[];
}

export function getDeployment(pooler: PgBouncer): any {
  return getDocs(pooler).find(doc => doc?.kind === "Deployment");
}

export function getService(pooler: PgBouncer): any {
  return getDocs(pooler).find(doc => doc?.kind === "Service");
}

export function getConfigIni(pooler: PgBouncer): string {
  const configMap = getDocs(pooler).find(doc => doc?.kind === "ConfigMap");

  return configMap.data["pgbouncer.ini"];
}

export function getSecretData(pooler: PgBouncer): Record<string, string> {
  const secret = getDocs(pooler).find(doc => doc?.kind === "Secret");
  const decoded: Record<string, string> = {};

  for (const [key, value] of Object.entries(
    secret.data as Record<string, string>,
  )) {
    decoded[key] = Buffer.from(value, "base64").toString();
  }

  return decoded;
}
