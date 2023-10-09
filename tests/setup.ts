import { spawnSync } from "child_process";
import { writeFileSync } from "fs";

import { apply, kubectl } from "./helpers";

function kind(...args: string[]) {
  const result = spawnSync("kind", args);

  if (result.status === 0) {
    return result.stdout.toString().trim();
  }

  throw new Error(result.stderr.toString().trim());
}

const clusters = kind("get", "clusters").split("\n");
let clusterName = "kube-templates-test";

console.log("Pre-tests clusters:", clusters.join("\n"));

if (process.env.CI) {
  for (const cluster of clusters) {
    if (!cluster.startsWith(`${clusterName}-`)) {
      continue;
    }

    const date = parseInt(cluster.substring(clusterName.length + 1), 10);

    if (date < new Date().getTime() - 3600000) {
      kind("delete", "cluster", "--name", cluster);
    }
  }

  clusterName += `-${new Date().getTime()}`;
  kind("create", "cluster", "--name", clusterName, "--wait", "2m");
  console.log(kind("get", "clusters"));
  const kubeconfig = kind("get", "kubeconfig", "--name", clusterName);

  const masterIp = spawnSync("docker", [
    "inspect",
    "-f",
    "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}",
    `${clusterName}-control-plane`,
  ])
    .stdout.toString()
    .trim();

  writeFileSync(
    ".test-kubeconfig",
    kubeconfig.replace(/127\.0\.0\.1:\d+/gu, `${masterIp}:6443`),
  );
} else {
  if (!clusters.includes(clusterName)) {
    kind("create", "cluster", "--name", clusterName, "--wait", "3m");
    clusters.push(clusterName);
  }

  writeFileSync(
    ".test-kubeconfig",
    kind("get", "kubeconfig", "--name", clusterName),
  );
}

const storageClasses = kubectl("get", "storageclasses");
const storageClassesToCreate = ["ssd-regional", "ssd"];
const base = JSON.parse(
  storageClasses.items.find((x: any) => x.metadata.name === "standard").metadata
    .annotations["kubectl.kubernetes.io/last-applied-configuration"],
);

delete base.metadata.annotations["storageclass.kubernetes.io/is-default-class"];

for (const name of storageClassesToCreate) {
  if (storageClasses.items.find((x: any) => x.metadata.name === name)) {
    continue;
  }

  base.metadata.name = name;
  apply({ yaml: JSON.stringify(base) });
}
