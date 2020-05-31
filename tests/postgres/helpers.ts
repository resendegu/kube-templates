import { Client } from "pg";
import { portForward } from "../helpers";

export async function queryPostgres(
  namespace: string,
  pod: string,
  query: string,
  user: string = "postgres",
  database: string = "postgres",
  password: string = ""
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
      client.end();
    }
  } finally {
    forward.close();
  }
}
