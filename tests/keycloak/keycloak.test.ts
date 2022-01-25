import { Keycloak } from "../../src/keycloak";
import { Namespace } from "../../src/kubernetes";
import { apply, deleteObject, randomSuffix, waitPodReady } from "../helpers";
import { getAxiosClient } from "./helpers";

describe("keycloak", () => {
  const namespace = `test-${randomSuffix()}`;

  beforeAll(() => {
    apply(
      new Namespace({
        name: namespace,
      })
    );
  });

  afterAll(() => {
    deleteObject("namespace", namespace);
  });

  test("Create a Keycloak instance", async () => {
    apply(
      new Keycloak(
        {
          name: "keycloak",
          namespace,
        },
        {
          cpu: {
            limit: 1,
            request: 0,
          },
          memory: "128Mi",
          version: "16.1.0",
          replicas: 1,
        }
      )
    );

    waitPodReady(namespace, "-l app=keycloak");

    const [axios, close] = getAxiosClient(namespace, "keycloak", 8080);

    expect((await axios.get("/")).status.toString()).toMatch("200");

    close();
  });
});
