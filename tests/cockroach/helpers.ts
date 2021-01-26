import { Client } from "pg";
import { portForward } from "../helpers";

export async function queryCockroach(
  namespace: string,
  pod: string,
  query: string,
  database: string = "defaultdb"
) {
  const forward = portForward(namespace, pod, 5432);

  try {
    const client = new Client({
        connectionString: `postgres://root@localhost:${forward.port}/${database}?sslmode=disable`,
    });

    await client.connect();
    try {
      return (await client.query(query)).rows;
    } finally {
      client.end();
    }
  } finally {
    forward.close();
  }
}
