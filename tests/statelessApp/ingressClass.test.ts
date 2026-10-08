import { loadAll } from "js-yaml";

import { StatelessApp } from "../../src/statelessapp";
import { basicAppMetadataConfig, basicAppSpecConfig } from "./fixture";

describe("statelessApp ingressClass", () => {
  it.each([
    "traefik",
    "traefik-secure",
  ] as const)("should accept the '%s' ingress class", ingressClass => {
    const app = new StatelessApp(basicAppMetadataConfig, {
      ...basicAppSpecConfig,
      ports: [
        {
          type: "http",
          port: 80,
          publicUrl: "http://app.example.com",
          ingressClass,
        },
      ],
    });

    const ingress = loadAll(app.yaml).find((x: any) => x?.kind === "Ingress");

    expect((ingress as any).spec.ingressClassName).toBe(ingressClass);
  });

  it("should throw an error when the ingress class is not valid", () => {
    const app = new StatelessApp(basicAppMetadataConfig, {
      ...basicAppSpecConfig,
      ports: [
        {
          type: "http",
          port: 80,
          publicUrl: "http://app.example.com",
          ingressClass: "traefik-invalid" as any,
        },
      ],
    });

    expect(() => app.yaml).toThrow(
      "O ingressClass 'traefik-invalid' não é válido",
    );
  });
});
