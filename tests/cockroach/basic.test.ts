import { Cockroach } from "../../src/cockroach";
import { Namespace } from "../../src/kubernetes";
import {
  apply,
  deleteObject,
  randomSuffix,
  waitJobComplete,
  waitPodReady,
} from "../helpers";
import { queryCockroach } from "./helpers";

describe("CockroachDB", () => {
  const namespace = `test-${randomSuffix()}`;

  beforeAll(async () => {
    await apply(
      new Namespace({
        name: namespace,
      }),
    );
  });

  afterAll(() => {
    deleteObject("namespace", namespace);
  });

  test("Create basic database", async () => {
    await apply(
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
          memory: "512Mi",
          version: "24.3.0",
          replicas: 1,
        },
      ),
    );

    await waitPodReady(namespace, "cockroachdb-0");
    await waitJobComplete(namespace, "cluster-init");

    expect(
      await queryCockroach(namespace, "svc/cockroachdb", "SELECT true AS ok"),
    ).toEqual([
      {
        ok: true,
      },
    ]);
  });

  test("Create basic database with replicated instance", async () => {
    await apply(
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
          memory: "512Mi",
          version: "24.3.0",
          replicas: 3,
        },
      ),
    );

    await waitPodReady(namespace, "cockroachdb2-0");
    await waitPodReady(namespace, "cockroachdb2-1");
    await waitPodReady(namespace, "cockroachdb2-2");
    await waitJobComplete(namespace, "cockroachdb2-cluster-init");

    expect(
      await queryCockroach(namespace, "svc/cockroachdb2", "SELECT true AS ok"),
    ).toEqual([
      {
        ok: true,
      },
    ]);
  });
});
