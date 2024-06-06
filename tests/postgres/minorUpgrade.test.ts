import { queryPostgres } from "./helpers";
import { Namespace } from "../../src/kubernetes";
import { Postgres } from "../../src/postgres";
import {
  apply,
  deleteObject,
  randomSuffix,
  sleep,
  waitPodReady,
} from "../helpers";

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

  test("Upgrade database from 11.0 to 11.7 without data loss", async () => {
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
          version: "11.0",
          postgresUserPassword: "postgres",
        },
      ),
    );

    waitPodReady(namespace, "postgres-0");
    sleep(5);

    expect(
      (await queryPostgres(namespace, "postgres-0", "SELECT version()"))[0]
        .version,
    ).toMatch(/PostgreSQL 11.0/u);

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
          version: "11.7",
          postgresUserPassword: "postgres",
        },
      ),
    );

    waitPodReady(namespace, "postgres-0");
    sleep(5);

    expect(
      (await queryPostgres(namespace, "postgres-0", "SELECT version()"))[0]
        .version,
    ).toMatch(/PostgreSQL 11.7/u);

    expect(
      await queryPostgres(namespace, "postgres-0", "SELECT * FROM foo"),
    ).toEqual([{ value: 354687 }]);
  });
});
