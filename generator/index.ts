import path from "path";

import type { OpenAPIV3 } from "openapi-types";
import type { ModuleDeclaration } from "ts-morph";
import { Project } from "ts-morph";

import { buildModules } from "./magic";
import {
  fetchDocumentsFromGitHubDirectory,
  mergeDocuments,
} from "./utils/github";
import { log } from "./utils/log";

async function run() {
  const project = new Project();
  const modules: Array<Map<string, ModuleDeclaration>> = [];

  const indexFile = project.createSourceFile(
    path.join("src", "generated", "index.ts"),
    undefined,
    {
      overwrite: true,
    },
  );

  const urls = [
    "https://github.com/kubernetes/kubernetes/tree/release-1.28/api/openapi-spec/v3/",
    "https://github.com/cert-manager/cert-manager/tree/release-1.13/deploy/crds/",
    "https://github.com/ongres/stackgres/tree/1.5.0/stackgres-k8s/src/common/src/main/resources/crds/",
  ];

  for (const url of urls) {
    log.group(url);

    const documents = await fetchDocumentsFromGitHubDirectory(url);
    const apiSpecObj: OpenAPIV3.Document = mergeDocuments(documents);

    modules.push(buildModules(indexFile, apiSpecObj)!);

    log.groupEnd();
  }

  log.info("Saving files");

  await project.save();

  log.info("Finished");
}

run().catch(console.error);
