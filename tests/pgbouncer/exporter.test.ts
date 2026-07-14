import { createHash } from "node:crypto";
import { PgBouncer } from "../../src/pgbouncer";
import {
  basicMetadata,
  basicSpec,
  getConfigIni,
  getDeployment,
  getSecretData,
  getService,
} from "./fixture";

const defaultPassword = createHash("sha256")
  .update(`${JSON.stringify(basicMetadata)}:pgbouncer-exporter`)
  .digest("hex");

describe("pgbouncer exporter", () => {
  it("should not add the exporter when the flag is off", () => {
    const pooler = new PgBouncer(basicMetadata, basicSpec);
    const deployment = getDeployment(pooler);

    expect(deployment.spec.template.spec.containers).toHaveLength(1);
    expect(deployment.spec.template.metadata.annotations).toBeUndefined();
    expect(Object.keys(getSecretData(pooler))).toEqual(["userlist.txt"]);
    expect(getConfigIni(pooler)).not.toContain("stats_users");
  });

  it("should add the exporter sidecar when enableExporter is true", () => {
    const pooler = new PgBouncer(basicMetadata, {
      ...basicSpec,
      enableExporter: true,
    });

    const containers = getDeployment(pooler).spec.template.spec.containers;

    expect(containers).toHaveLength(2);
    expect(containers[1]).toMatchObject({
      name: "pgbouncer-exporter",
      image: "docker.io/prometheuscommunity/pgbouncer-exporter:v0.12.1",
      ports: [{ name: "metrics", containerPort: 9127, protocol: "TCP" }],
      env: [
        {
          name: "PGBOUNCER_EXPORTER_CONNECTION_STRING",
          valueFrom: {
            secretKeyRef: { name: "pgb", key: "exporter-connection-string" },
          },
        },
      ],
      readinessProbe: { tcpSocket: { port: 9127 } },
      livenessProbe: { tcpSocket: { port: 9127 } },
    });
    expect(containers[1].args).toBeUndefined();
  });

  it("should not leak the exporter password into the Deployment", () => {
    const pooler = new PgBouncer(basicMetadata, {
      ...basicSpec,
      enableExporter: true,
    });

    expect(JSON.stringify(getDeployment(pooler))).not.toContain(
      defaultPassword,
    );
  });

  it("should store the connection string and userlist entry in the Secret", () => {
    const pooler = new PgBouncer(basicMetadata, {
      ...basicSpec,
      enableExporter: true,
    });

    const data = getSecretData(pooler);

    expect(data["exporter-connection-string"]).toBe(
      `postgres://pgbouncer_exporter:${defaultPassword}@127.0.0.1:6432/pgbouncer?sslmode=disable`,
    );
    expect(data["userlist.txt"]).toContain(
      `"pgbouncer_exporter" "${defaultPassword}"`,
    );
  });

  it("should inject stats_users and ignore_startup_parameters into the ini", () => {
    const pooler = new PgBouncer(basicMetadata, {
      ...basicSpec,
      enableExporter: true,
    });

    const ini = getConfigIni(pooler);

    expect(ini).toContain("stats_users=pgbouncer_exporter");
    expect(ini).toContain("ignore_startup_parameters=extra_float_digits");
  });

  it("should append to existing statsUsers and ignoreStartupParameters", () => {
    const pooler = new PgBouncer(basicMetadata, {
      ...basicSpec,
      enableExporter: true,
      options: { statsUsers: "alice", ignoreStartupParameters: "foo" },
    });

    const ini = getConfigIni(pooler);

    expect(ini).toContain("stats_users=alice,pgbouncer_exporter");
    expect(ini).toContain("ignore_startup_parameters=foo,extra_float_digits");
  });

  it("should not duplicate an exporter user already declared in spec.users", () => {
    const pooler = new PgBouncer(basicMetadata, {
      ...basicSpec,
      enableExporter: true,
      users: [
        ...basicSpec.users,
        { username: "pgbouncer_exporter", password: "custom" },
      ],
    });

    const data = getSecretData(pooler);
    const entries = data["userlist.txt"]
      .split("\n")
      .filter(line => line.includes('"pgbouncer_exporter"'));

    expect(entries).toHaveLength(1);
    expect(data["exporter-connection-string"]).toBe(
      "postgres://pgbouncer_exporter:custom@127.0.0.1:6432/pgbouncer?sslmode=disable",
    );
  });

  it("should prefer the declared user password over exporterOptions.password", () => {
    const pooler = new PgBouncer(basicMetadata, {
      ...basicSpec,
      enableExporter: true,
      users: [
        ...basicSpec.users,
        { username: "pgbouncer_exporter", password: "from-users" },
      ],
      exporterOptions: { password: "from-options" },
    });

    const data = getSecretData(pooler);

    expect(data["exporter-connection-string"]).toContain(":from-users@");
    expect(data["userlist.txt"]).toContain('"pgbouncer_exporter" "from-users"');
    expect(data["userlist.txt"]).not.toContain("from-options");
  });

  it("should add scrape annotations to the pod template and let user annotations win", () => {
    const pooler = new PgBouncer(
      {
        ...basicMetadata,
        annotations: { "prometheus.io/port": "9999", custom: "value" },
      },
      { ...basicSpec, enableExporter: true },
    );

    const annotations =
      getDeployment(pooler).spec.template.metadata.annotations;

    expect(annotations).toMatchObject({
      "prometheus.io/scrape": "true",
      "prometheus.io/port": "9999",
      "prometheus.io/path": "/metrics",
      custom: "value",
    });
  });

  it("should keep the Service untouched", () => {
    const pooler = new PgBouncer(basicMetadata, {
      ...basicSpec,
      enableExporter: true,
      serviceType: "LoadBalancer",
    });

    const service = getService(pooler);

    expect(service.spec.ports).toHaveLength(1);
    expect(service.spec.ports[0].port).toBe(6432);
    expect(service.metadata.annotations).toBeUndefined();
  });

  it("should throw when rawConfig is set without explicit credentials", () => {
    const pooler = new PgBouncer(basicMetadata, {
      ...basicSpec,
      enableExporter: true,
      rawConfig: "[pgbouncer]\nlisten_port=6432",
    });

    expect(() => pooler.yaml).toThrow(
      "requires explicit exporterOptions credentials",
    );
  });

  it("should allow rawConfig with explicit credentials", () => {
    const rawConfig = "[pgbouncer]\nlisten_port=6432";
    const pooler = new PgBouncer(basicMetadata, {
      ...basicSpec,
      enableExporter: true,
      rawConfig,
      exporterOptions: { user: "stats", password: "secret" },
    });

    expect(getDeployment(pooler).spec.template.spec.containers).toHaveLength(2);
    expect(getConfigIni(pooler)).toBe(rawConfig);
    expect(getSecretData(pooler)["exporter-connection-string"]).toBe(
      "postgres://stats:secret@127.0.0.1:6432/pgbouncer?sslmode=disable",
    );
  });

  it("should honor exporterOptions overrides", () => {
    const pooler = new PgBouncer(basicMetadata, {
      ...basicSpec,
      enableExporter: true,
      exporterOptions: {
        image: "example.com/pgbouncer-exporter:v1.0.0",
        port: 9200,
        cpu: { request: "20m", limit: "200m" },
        memory: { request: "48Mi", limit: "96Mi" },
      },
    });

    const deployment = getDeployment(pooler);
    const exporter = deployment.spec.template.spec.containers[1];

    expect(exporter.image).toBe("example.com/pgbouncer-exporter:v1.0.0");
    expect(exporter.args).toEqual(["--web.listen-address=:9200"]);
    expect(exporter.ports[0].containerPort).toBe(9200);
    expect(exporter.readinessProbe.tcpSocket.port).toBe(9200);
    expect(exporter.livenessProbe.tcpSocket.port).toBe(9200);
    expect(exporter.resources).toEqual({
      requests: { cpu: "20m", memory: "48Mi" },
      limits: { cpu: "200m", memory: "96Mi" },
    });
    expect(
      deployment.spec.template.metadata.annotations["prometheus.io/port"],
    ).toBe("9200");
  });

  it("should use the effective pgbouncer port in the connection string", () => {
    const withSpecPort = new PgBouncer(basicMetadata, {
      ...basicSpec,
      enableExporter: true,
      port: 5000,
    });

    expect(getSecretData(withSpecPort)["exporter-connection-string"]).toContain(
      "@127.0.0.1:5000/",
    );

    const withListenPort = new PgBouncer(basicMetadata, {
      ...basicSpec,
      enableExporter: true,
      port: 5000,
      options: { listenPort: 5001 },
    });

    expect(
      getSecretData(withListenPort)["exporter-connection-string"],
    ).toContain("@127.0.0.1:5001/");
  });

  it("should url-encode credentials in the connection string", () => {
    const pooler = new PgBouncer(basicMetadata, {
      ...basicSpec,
      enableExporter: true,
      exporterOptions: { user: "stats", password: "p@ss:w/rd" },
    });

    expect(getSecretData(pooler)["exporter-connection-string"]).toBe(
      "postgres://stats:p%40ss%3Aw%2Frd@127.0.0.1:6432/pgbouncer?sslmode=disable",
    );
  });

  it("should inject explicit exporterOptions credentials into userlist.txt and stats_users", () => {
    const pooler = new PgBouncer(basicMetadata, {
      ...basicSpec,
      enableExporter: true,
      exporterOptions: { user: "stats", password: "secret" },
    });

    const data = getSecretData(pooler);

    expect(data["userlist.txt"]).toContain('"stats" "secret"');
    expect(data["userlist.txt"]).not.toContain("pgbouncer_exporter");
    expect(getConfigIni(pooler)).toContain("stats_users=stats");
  });

  it("should not duplicate stats_users/ignore_startup_parameters values already present", () => {
    const pooler = new PgBouncer(basicMetadata, {
      ...basicSpec,
      enableExporter: true,
      options: {
        statsUsers: "pgbouncer_exporter",
        ignoreStartupParameters: "extra_float_digits",
      },
    });

    const ini = getConfigIni(pooler);

    expect(ini).toContain("stats_users=pgbouncer_exporter");
    expect(ini).not.toContain("pgbouncer_exporter,pgbouncer_exporter");
    expect(ini).toContain("ignore_startup_parameters=extra_float_digits");
    expect(ini).not.toContain("extra_float_digits,extra_float_digits");
  });

  it("should still inject the userlist entry when only rawConfig is set", () => {
    const rawConfig = "[pgbouncer]\nlisten_port=6432";
    const pooler = new PgBouncer(basicMetadata, {
      ...basicSpec,
      enableExporter: true,
      rawConfig,
      exporterOptions: { user: "stats", password: "secret" },
    });

    expect(getSecretData(pooler)["userlist.txt"]).toContain('"stats" "secret"');
  });

  it("should still inject stats_users/ignore_startup_parameters when only rawUserlist is set", () => {
    const pooler = new PgBouncer(basicMetadata, {
      ...basicSpec,
      enableExporter: true,
      rawUserlist: '"stats" "secret"',
      exporterOptions: { user: "stats", password: "secret" },
    });

    const ini = getConfigIni(pooler);

    expect(ini).toContain("stats_users=stats");
    expect(ini).toContain("ignore_startup_parameters=extra_float_digits");
  });

  it("should not auto-provision a user when exporterOptions.connectionString is set", () => {
    const connectionString =
      "postgres://monitor:secret@127.0.0.1:6432/pgbouncer?sslmode=disable";
    const pooler = new PgBouncer(basicMetadata, {
      ...basicSpec,
      enableExporter: true,
      exporterOptions: { connectionString },
    });

    const data = getSecretData(pooler);

    expect(data["exporter-connection-string"]).toBe(connectionString);
    expect(data["userlist.txt"]).not.toContain("pgbouncer_exporter");
    expect(getConfigIni(pooler)).not.toContain("stats_users");
  });

  it("should not throw for rawConfig with only exporterOptions.connectionString", () => {
    const pooler = new PgBouncer(basicMetadata, {
      ...basicSpec,
      enableExporter: true,
      rawConfig: "[pgbouncer]\nlisten_port=6432",
      exporterOptions: {
        connectionString:
          "postgres://monitor:secret@127.0.0.1:6432/pgbouncer?sslmode=disable",
      },
    });

    expect(() => pooler.yaml).not.toThrow();
  });

  it("should generate the same yaml on every call", () => {
    const pooler = new PgBouncer(basicMetadata, {
      ...basicSpec,
      enableExporter: true,
    });

    expect(pooler.yaml).toBe(pooler.yaml);
  });

  it("should keep replicas passthrough with the exporter enabled", () => {
    const pooler = new PgBouncer(basicMetadata, {
      ...basicSpec,
      enableExporter: true,
      replicas: 3,
    });

    expect(getDeployment(pooler).spec.replicas).toBe(3);
  });
});
