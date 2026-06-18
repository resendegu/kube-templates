import { readFileSync } from "node:fs";

import { mapValues } from "remeda";
import { Cockroach } from "../../src/cockroach";
import { Namespace } from "../../src/kubernetes";
import {
  apply,
  deleteObject,
  randomSuffix,
  waitJobComplete,
  waitPodReady,
} from "../helpers";
import { certificates, queryCockroachSecure } from "./helpers";

describe("CockroachDB Secure", () => {
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

  test("Create secure database cluster", async () => {
    await apply(
      new Cockroach(
        {
          name: "cockroach-safe",
          namespace,
        },
        {
          cpu: {
            limit: 2,
            request: 1,
          },
          memory: "512Mi",
          version: "24.3.0",
          replicas: 2,
          certs: mapValues(certificates, value => readFileSync(value)),
        },
      ),
    );

    await waitPodReady(namespace, "cockroach-safe-0");
    await waitPodReady(namespace, "cockroach-safe-1");
    await waitJobComplete(namespace, "cockroach-safe-cluster-init");

    expect(
      await queryCockroachSecure(
        namespace,
        "svc/cockroach-safe",
        "SELECT true AS ok",
      ),
    ).toEqual([
      {
        ok: true,
      },
    ]);
  });
});
