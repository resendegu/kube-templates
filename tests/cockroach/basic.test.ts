import { Namespace } from "../../src/kubernetes";
import { Cockroach } from "../../src/cockroach";
import { apply, deleteObject, randomSuffix, waitJobComplete, waitPodReady } from "../helpers";
import { queryCockroach } from "./helpers";

describe("CockroachDB", () => {
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
          replicas: 1,
          clusterVersion: "20.2.3"
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

  test("Create basic database with replicated instance", async () => {
    apply(
      new Cockroach(
        {
          name: "cockroachdb2",
          namespace,
        },
        {
          cpu: {
            limit: 2,
            request: 1,
          },
          memory: "64Mi",
          version: "20.2.3",
          replicas: 3,
          clusterVersion: "20.2.3"
        }
      )
    );

    waitPodReady(namespace, "cockroachdb2-0");
    waitPodReady(namespace, "cockroachdb2-1");
    waitPodReady(namespace, "cockroachdb2-2");
    waitJobComplete(namespace, "cockroachdb2-cluster-init");

    expect(
      await queryCockroach(namespace, "svc/cockroachdb2", "SELECT true AS ok")
    ).toEqual([
      {
        ok: true,
      },
    ]);
  });

  test("Update cockroach version", async () => {
    apply(
      new Cockroach(
        {
          name: "cockroachdb3",
          namespace,
        },
        {
          cpu: {
            limit: 2,
            request: 1,
          },
          memory: "64Mi",
          version: "20.1.9",
          replicas: 1,
          clusterVersion: "20.1.9"
        }
      )
    );

    console.log("before first");

    waitPodReady(namespace, "cockroachdb3-0");
    waitJobComplete(namespace, "cockroachdb3-cluster-init");

    console.log("after first");

    expect(
      (await queryCockroach(namespace, "cockroachdb3-0", "SELECT version()"))[0]
        .version
    ).toMatch(/CockroachDB CCL v20.1.9/);

    apply(
      new Cockroach(
        {
          name: "cockroachdb3",
          namespace,
        },
        {
          cpu: {
            limit: 2,
            request: 1,
          },
          memory: "64Mi",
          version: "20.2.3",
          replicas: 1,
          clusterVersion: "20.1.9"
        }
      )
    );

    console.log("before second");

    waitPodReady(namespace, "cockroachdb3-0");
    waitJobComplete(namespace, "cockroachdb3-cluster-init");

    console.log("after second");

    expect(
      (await queryCockroach(namespace, "cockroachdb3-0", "SELECT version()"))[0]
        .version
    ).toMatch(/CockroachDB CCL v20.2.3/);
  });
});
