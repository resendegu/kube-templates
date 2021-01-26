import { Namespace } from "../../src/kubernetes";
import { Cockroach } from "../../src/cockroach";
import { apply, deleteObject, randomSuffix, waitJobComplete, waitPodReady } from "../helpers";
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
            limit: 2,
            request: 1,
          },
          memory: "64Mi",
          version: "20.2.3",
          replicas: 1
        }
      )
    );

    waitPodReady(namespace, "cockroachdb-0");
    waitJobComplete(namespace, "cluster-init");

    expect(
      await queryCockroach(namespace, "svc/cockroachdb", "SELECT true AS ok")
    ).toEqual([
      {
        ok: true,
      },
    ]);
  });
});
