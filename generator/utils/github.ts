import axios from "axios";
import { load as loadYaml } from "js-yaml";
import _ from "lodash";
import type { OpenAPIV3 } from "openapi-types";

import type { CrdFile } from "../types/CrdFile";
import type { GitHubDirectory } from "../types/GitHubDirectory";
import { buildWithKustomize } from "./kustomize";
import { log } from "./log";

export async function fetchDocumentsFromGitHubDirectory(
  directoryUrl: string,
): Promise<OpenAPIV3.Document[]> {
  log.info("Fetching OpenAPIv3 specs from", directoryUrl);

  const crds: CrdFile[] = [];
  const documents: OpenAPIV3.Document[] = [];
  const directory = await axios.get<{ payload: GitHubDirectory }>(
    directoryUrl,
    {
      headers: { Accept: "application/json" },
    },
  );

  if (
    directory.data.payload.tree.items.find(item =>
      item.name.startsWith("kustomization"),
    )
  ) {
    const kustomizeCrds = await buildWithKustomize({
      items: directory.data.payload.tree.items,
      directoryUrl,
    });

    crds.push(...kustomizeCrds);
  } else {
    for (const item of directory.data.payload.tree.items) {
      if (item.contentType === "file") {
        const fileUrl = `${directoryUrl.replace("/tree/", "/raw/")}${
          item.name
        }`;

        log.debug(`Fetching OpenAPIv3 spec from ${fileUrl}`);

        if (item.name.endsWith(".json")) {
          const document = await axios.get<OpenAPIV3.Document>(fileUrl, {
            headers: { Accept: "text/plain" },
          });

          documents.push(document.data);
        } else if (item.name.endsWith(".yaml") || item.name.endsWith(".yml")) {
          const document = await axios.get<string>(fileUrl, {
            headers: { Accept: "text/plain" },
          });

          crds.push(loadYaml(document.data) as CrdFile);
        }
      }
    }
  }

  return documents.concat(crds.length > 0 ? crdFileToOpenApi(crds) : []);
}

export function mergeDocuments(
  documents: OpenAPIV3.Document[],
): OpenAPIV3.Document {
  return _.mergeWith({}, ...documents);
}

export function crdFileToOpenApi(files: CrdFile[]): OpenAPIV3.Document {
  return {
    openapi: "3.0.0",
    info: {
      title: "Kubernetes",
      version: "1.0.0",
    },
    paths: {},
    components: {
      schemas: files.reduce<Record<string, OpenAPIV3.SchemaObject>>(
        (acc, crd) => {
          for (const version of crd.spec.versions) {
            const groupDomain = crd.spec.group.split(".").reverse().join(".");
            const schemaName = `${groupDomain}.${version.name}.${crd.spec.names.kind}`;

            acc[schemaName] = version.schema.openAPIV3Schema;
          }

          return acc;
        },
        {},
      ),
    },
  };
}
