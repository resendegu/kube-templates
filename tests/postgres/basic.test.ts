import { Namespace } from "../../src/kubernetes";
import { Postgres } from "../../src/postgres";
import { apply, deleteObject, randomSuffix, waitPodReady } from "../helpers";
import { queryPostgres } from "./helpers";

describe("postgres", () => {
  const namespace = `test-${randomSuffix()}`;

  beforeAll(() => {
    apply(
      new Namespace({
        name: namespace,
      }),
    );
  });

  afterAll(() => {
    deleteObject("namespace", namespace);
  });

  test("Create basic database", async () => {
    apply(
      new Postgres(
        {
          name: "postgres",
          namespace,
        },
        {
          cpu: {
            limit: 1,
            request: 0,
          },
          memory: "64Mi",
          version: "12",
        },
      ),
    );

    waitPodReady(namespace, "postgres-0");

    expect(
      await queryPostgres(namespace, "postgres-0", "SELECT true AS ok"),
    ).toEqual([
      {
        ok: true,
      },
    ]);
  });
});
