import faker from "faker";
import { Namespace } from "../../src/kubernetes";
import { Postgres } from "../../src/postgres";
import { apply, deleteObject, randomSuffix, waitPodReady, sleep } from "../helpers";
import { queryPostgres } from "./helpers";

describe("permissions", () => {
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

  function setupPostgres() {
    const [username, password, database] = faker.random.words(3).split(" ").map(s => s.toLowerCase());

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
          users: [{ username, password }],
          databases: [{ name: database, users: [username] }],
        }
      )
    );

    waitPodReady(namespace, "postgres-0");

    return { username, password, database };
  }

  test("Index delete after restart", async () => {
    const { username, password, database } = setupPostgres();

    await queryPostgres(namespace, "postgres-0", "CREATE TABLE test (id SERIAL PRIMARY KEY, name TEXT);", username, database, password);
    await queryPostgres(namespace, "postgres-0", "CREATE INDEX test_name_idx ON test (name);", username, database, password);

    deleteObject("Pod", "postgres-0", namespace);
    sleep(3);
    waitPodReady(namespace, "postgres-0");

    await queryPostgres(namespace, "postgres-0", "DROP INDEX test_name_idx;", username, database, password);
  });

  test("Table alter after restart", async () => {
    const { username, password, database } = setupPostgres();

    await queryPostgres(namespace, "postgres-0", "CREATE TABLE test (id SERIAL PRIMARY KEY, name TEXT);", username, database, password);

    deleteObject("Pod", "postgres-0", namespace);
    sleep(3);
    waitPodReady(namespace, "postgres-0");

    await queryPostgres(namespace, "postgres-0", "ALTER TABLE test ADD COLUMN test TEXT;", username, database, password);
  });
});
