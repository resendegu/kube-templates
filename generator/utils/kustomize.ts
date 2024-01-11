import { exec as execCb } from "node:child_process";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

import axios from "axios";
import {
  load as loadYaml,
  loadAll as loadAllYaml,
  dump,
  JSON_SCHEMA,
} from "js-yaml";

import type { CrdFile } from "../types/CrdFile";
import type { KustomizeInput } from "../types/Kustomize";

const exec = promisify(execCb);
const kustimizePath = process.cwd().concat("/kustomize");

async function createDirectory(path: string) {
  try {
    await mkdir(path, { recursive: true });
  } catch (error) {
    console.error(error);
  }
}

async function downloadDirectory({
  items,
  directoryUrl,
  pathname = kustimizePath,
}: KustomizeInput) {
  await createDirectory(pathname);

  for (const item of items) {
    const fullPath = join(pathname, item.name);

    const fileUrl = `${directoryUrl}/${item.name}`.replace(/\/{2,}/gu, "/");

    const response = await axios.get(fileUrl, {
      headers: { Accept: "application/json" },
      timeout: 2000,
    });

    if (item.contentType === "file") {
      const data = response.data.payload.blob.rawLines.join("\n").toString();

      const yaml = loadYaml(data, { schema: JSON_SCHEMA });

      await writeFile(fullPath, dump(yaml, { indent: 2 }));
    } else {
      await createDirectory(fullPath);

      await downloadDirectory({
        items: response.data.payload.tree.items,
        directoryUrl: fileUrl,
        pathname: fullPath,
      });
    }
  }

  return;
}

async function execKustomize(pathname: string): Promise<string> {
  try {
    // Use the kustomize CLI to build the CRDs
    return (await exec(`kustomize build ${pathname}`)).stdout;
  } catch (error) {
    console.error(error);
    return "";
  }
}

export async function buildWithKustomize({
  items,
  directoryUrl,
}: Omit<KustomizeInput, "pathname">) {
  const pathname = kustimizePath;

  await downloadDirectory({ items, directoryUrl, pathname });

  const crds = await execKustomize(pathname);

  try {
    await rm(pathname, { recursive: true });
  } catch (error) {
    console.error(error);
  }

  return loadAllYaml(crds) as CrdFile[];
}
