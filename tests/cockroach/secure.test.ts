import { readFileSync } from "fs";
import { mapValues } from "lodash";
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

  test("Create secure database cluster", async () => {
      apply(
        new Cockroach(
          {
            name: "cockroachdb-safe",
            namespace,
          },
          {
            cpu: {
              limit: 2,
              request: 1,
            },
            memory: "64Mi",
            version: "21.1.2",
            replicas: 2,
            certs: mapValues(certificates, (value) => readFileSync(value)),
          }
        )
      );

      waitPodReady(namespace, "cockroachdb-safe-0");
      waitPodReady(namespace, "cockroachdb-safe-1");
      waitJobComplete(namespace, "cockroachdb-safe-cluster-init");

      expect(
        await queryCockroachSecure(
          namespace,
          "svc/cockroachdb-safe",
          "SELECT true AS ok"
        )
      ).toEqual([
        {
          ok: true,
        },
      ]);
  });
});
