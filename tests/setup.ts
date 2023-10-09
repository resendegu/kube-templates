import { spawnSync } from "child_process";

import { apply, kubectl } from "./helpers";

console.log(spawnSync("docker ps", { shell: true }).stdout.toString());

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
