import { Keycloack } from "../../src/keycloack";
import { Namespace } from "../../src/kubernetes";
import { apply, deleteObject, randomSuffix, waitPodReady } from "../helpers";
import { getAxiosClient } from "./helpers";

describe("keycloack", () => {
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

  test("Create a Keycloack instance", async () => {
    apply(
      new Keycloack(
        {
          name: "keycloack",
          namespace,
        },
        {
          cpu: {
            limit: 1,
            request: 0,
          },
          memory: "128Mi",
          version: "16.1.0",
          host: "localhost",
          proxyAddressForwaring: true,
          replicas: 1,
          tlsCert: "",
        }
      )
    );

    waitPodReady(namespace, "keycloack-0");

    const [axios, close] = getAxiosClient(namespace, "keycloack-0", 8080);

    expect((await axios.get("/")).status.toString()).toMatch("200");

    close();
  });
});
