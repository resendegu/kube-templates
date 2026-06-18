import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

import { apply, kubectl } from "./helpers";

// Each CI matrix job runs its own kind cluster; KIND_CLUSTER tells us which
// control-plane container to read the master IP from (defaults to the single
// cluster used locally).
const cluster = process.env.KIND_CLUSTER ?? "kube-templates-test";
const kubeconfig = readFileSync("kind-kubeconfig", "utf-8");
const masterIp = spawnSync("docker", [
  "inspect",
  "-f",
  "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}",
  `${cluster}-control-plane`,
])
  .stdout.toString()
  .trim();

writeFileSync(
  "kind-kubeconfig",
  kubeconfig.replace(/127\.0\.0\.1:\d+/gu, `${masterIp}:6443`),
);

const storageClasses = kubectl("get", "storageclasses");
const storageClassesToCreate = ["ssd-regional", "ssd"];
const base = JSON.parse(
  storageClasses.items.find((x: any) => x.metadata.name === "standard").metadata
    .annotations["kubectl.kubernetes.io/last-applied-configuration"],
);

delete base.metadata.annotations["storageclass.kubernetes.io/is-default-class"];

void (async () => {
  for (const name of storageClassesToCreate) {
    if (storageClasses.items.find((x: any) => x.metadata.name === name)) {
      continue;
    }

    base.metadata.name = name;
    await apply({ yaml: JSON.stringify(base) });
  }
})();
