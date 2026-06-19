import { Namespace } from "../../src/kubernetes";
import { Postgres } from "../../src/postgres";
import {
  apply,
  deleteObject,
  randomSuffix,
  sleep,
  waitPodReady,
  waitRolloutComplete,
} from "../helpers";
import { queryPostgres } from "./helpers";

describe("postgres", () => {
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

  test("Upgrade database from 16.0 to 16.4 without data loss", async () => {
    await apply(
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
          version: "16.0",
          postgresUserPassword: "postgres",
        },
      ),
    );

    await waitPodReady(namespace, "postgres-0");
    await sleep(5);

    expect(
      (await queryPostgres(namespace, "postgres-0", "SELECT version()"))[0]
        .version,
    ).toMatch(/PostgreSQL 16.0/u);

    await queryPostgres(
      namespace,
      "postgres-0",
      "CREATE TABLE foo (value INT)",
    );
    await queryPostgres(
      namespace,
      "postgres-0",
      "INSERT INTO foo VALUES (354687)",
    );

    await apply(
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
          version: "16.4",
          postgresUserPassword: "postgres",
        },
      ),
    );

    await waitRolloutComplete(namespace, "postgres");
    await sleep(5);

    expect(
      (await queryPostgres(namespace, "postgres-0", "SELECT version()"))[0]
        .version,
    ).toMatch(/PostgreSQL 16.4/u);

    expect(
      await queryPostgres(namespace, "postgres-0", "SELECT * FROM foo"),
    ).toEqual([{ value: 354687 }]);
  });
});
