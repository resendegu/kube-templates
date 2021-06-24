import { Client } from "pg";

import { portForward } from "../helpers";

export async function queryPostgres(
  namespace: string,
  pod: string,
  query: string,
  user = "postgres",
  database = "postgres",
  password = ""
) {
  const forward = portForward(namespace, pod, 5432);

  try {
    const client = new Client({
      host: "localhost",
      port: forward.port,
      database,
      user,
      password,
    });

    await client.connect();
    try {
      return (await client.query(query)).rows;
    } finally {
      await client.end();
    }
  } finally {
    forward.close();
  }
}
