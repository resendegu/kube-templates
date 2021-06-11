import { Client } from "pg";
import { join } from "path";
import { portForward, } from "../helpers";

type Certificates =
  | "node.crt"
  | "client.root.crt"
  | "client.root.key"
  | "node.key"
  | "ca.crt";

export async function queryCockroach(
  namespace: string,
  pod: string,
  query: string,
  database: string = "defaultdb"
) {
  const forward = portForward(namespace, pod, 26257);

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

export async function queryCockroachSecure(
  namespace: string,
  pod: string,
  query: string,
  database: string = "defaultdb"
) {
  const forward = portForward(namespace, pod, 26257);

  try {
    const {
      "client.root.crt": clientCert,
      "client.root.key": clientKey,
      "ca.crt": rootCert,
    } = certificates
    const client = new Client({
      connectionString: `postgres://root@locahost:${forward.port}/${database}?sslmode=verify-full&sslcert=${clientCert}&sslkey=${clientKey}&sslrootcert=${rootCert}`,
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

export const certificates: Record<Certificates, string> = [
  "node.crt",
  "client.root.crt",
  "client.root.key",
  "node.key",
  "ca.crt",
].reduce((result, curr) => {
  const path = join(__dirname, "certs", curr);

  return { ...result, [curr]: path };
}, {} as Record<Certificates, string>);
