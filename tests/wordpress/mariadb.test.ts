import { Namespace } from "../../src/kubernetes";
import { MariaDB } from "../../src/mariadb";
import { WordPress } from "../../src/wordpress";
import { apply, deleteObject, randomSuffix, waitPodReady } from "../helpers";
import { getAxiosClient } from "./helpers";

describe("WordPress + MariaDB", () => {
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

  test("Create a WordPress instance", async () => {
    apply(
      new MariaDB(
        {
          name: "mariadb",
          namespace,
        },
        {
          cpu: {
            limit: 1,
            request: 0,
          },
          memory: "128Mi",
          version: "10.5",
          rootPassword: "admin",
        }
      )
    );

    waitPodReady(namespace, "mariadb-0");

    apply(
      new WordPress(
        {
          name: "wordpress",
          namespace,
        },
        {
          version: "5.6",
          cpu: {
            limit: 1,
            request: 0,
          },
          memory: {
            limit: "1Gi",
            request: "100Mi",
          },
          database: {
            host: "mariadb",
            username: "root",
            password: "admin",
          },
          ingress: {
            publicUrl: "http://127.0.0.1.nip.io/",
          },
        }
      )
    );

    waitPodReady(namespace, "wordpress-0");

    const [axios, close] = getAxiosClient(namespace, "wordpress-0", 80);

    expect((await axios.get("/")).data).toMatch(/WordPress &rsaquo; Installation/u);

    close();
  });
});
