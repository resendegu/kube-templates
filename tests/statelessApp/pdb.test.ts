import { basicAppMetadataConfig, basicAppSpecConfig } from "./fixture";
import { StatelessApp } from "../../src/statelessapp";

describe("statelessApp", () => {
  it("should throw an error when minAvailable is bigger than the number of replicas", () => {
    const app = new StatelessApp(basicAppMetadataConfig, {
      ...basicAppSpecConfig,
      replicas: 2,
      minAvailable: 3,
    });

    expect(() => app.yaml).toThrow(
      "The minimum number of available replicas cannot be greater than the number of replicas",
    );
  });

  it("should throw an error when minAvailable is bigger than the number of replicas on autoscalling", () => {
    const app = new StatelessApp(basicAppMetadataConfig, {
      ...basicAppSpecConfig,
      replicas: [1, 5],
      minAvailable: 2,
    });

    expect(() => app.yaml).toThrow(
      "The minimum number of available replicas cannot be greater than the number of replicas",
    );
  });

  it("should not throw an error when minAvailable is smaller than the number of replicas", () => {
    const app = new StatelessApp(basicAppMetadataConfig, {
      ...basicAppSpecConfig,
      replicas: 2,
      minAvailable: 1,
    });

    expect(() => app.yaml).not.toThrow();
  });

  it("should not throw an error when minAvailable is smaller than the number of replicas on autoscalling", () => {
    const app = new StatelessApp(basicAppMetadataConfig, {
      ...basicAppSpecConfig,
      replicas: [3, 5],
      minAvailable: 2,
    });

    expect(() => app.yaml).not.toThrow();
  });
});
