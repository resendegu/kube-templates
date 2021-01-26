import { Namespace } from "../../src/kubernetes";
import { Cockroach } from "../../src/cockroach";
import { apply, deleteObject, randomSuffix, waitPodReady } from "../helpers";
import { queryCockroach } from "./helpers";

describe("cockroach", () => {
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

  test("Create basic database", async () => {
    apply(
      new Cockroach(
        {
          name: "cockroachdb",
          namespace,
        },
        {
          cpu: {
            limit: 1,
            request: 0,
          },
          memory: "64Mi",
          version: "20.2.3",
          replicas: 1
        }
      )
    );

    waitPodReady(namespace, "cockroachdb-0");

    expect(
      await queryCockroach(namespace, "cockroachdb-0", "SELECT true AS ok")
    ).toEqual([
      {
        ok: true,
      },
    ]);
  });
});
