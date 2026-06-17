import { loadAll } from "js-yaml";

import { basicAppMetadataConfig, basicAppSpecConfig } from "./fixture";
import { StatelessApp } from "../../src/statelessapp";

function getContainer(app: StatelessApp): any {
  const docs = loadAll(app.yaml) as any[];
  const deployment = docs.find(doc => doc?.kind === "Deployment");

  return deployment.spec.template.spec.containers[0];
}

describe("statelessApp startup probe", () => {
  it("should not emit a startupProbe when check.startup is not set", () => {
    const app = new StatelessApp(basicAppMetadataConfig, {
      ...basicAppSpecConfig,
      check: { port: 3000, httpGetPath: "/health" },
    });

    expect(getContainer(app).startupProbe).toBeUndefined();
  });

  it("should emit a startupProbe with defaults when check.startup is set", () => {
    const app = new StatelessApp(basicAppMetadataConfig, {
      ...basicAppSpecConfig,
      check: { port: 3000, httpGetPath: "/health", startup: {} },
    });

    const { startupProbe } = getContainer(app);

    expect(startupProbe).toMatchObject({
      httpGet: { path: "/health", port: 3000 },
      failureThreshold: 30,
      periodSeconds: 10,
    });
  });

  it("should honor custom startup failureThreshold and period", () => {
    const app = new StatelessApp(basicAppMetadataConfig, {
      ...basicAppSpecConfig,
      check: {
        port: 3000,
        httpGetPath: "/health",
        startup: { failureThreshold: 60, period: 5, initialDelay: 10 },
      },
    });

    const { startupProbe } = getContainer(app);

    expect(startupProbe).toMatchObject({
      failureThreshold: 60,
      periodSeconds: 5,
      initialDelaySeconds: 10,
    });
  });

  it("should keep liveness and readiness probes alongside the startup probe", () => {
    const app = new StatelessApp(basicAppMetadataConfig, {
      ...basicAppSpecConfig,
      check: { port: 3000, httpGetPath: "/health", startup: {} },
    });

    const container = getContainer(app);

    expect(container.livenessProbe).toBeDefined();
    expect(container.readinessProbe).toBeDefined();
  });
});
