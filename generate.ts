import axios from "axios";
import { initial, last } from "lodash";
import { OpenAPIV2 } from "openapi-types";
import path from "path";
import { InterfaceDeclarationStructure, OptionalKind, Project, PropertySignatureStructure } from "ts-morph";

interface ApiClassDefinition extends OpenAPIV2.SchemaObject {
  className: string;
}

const apiSpecs: { [key: string]: string } = {
  kubernetes: "https://raw.githubusercontent.com/kubernetes/kubernetes/release-1.17/api/openapi-spec/swagger.json",
};

function mapType(type: string) {
  switch (type) {
    case "integer":
      return "number";

    default:
      return type;
  }
}

function getType(propDef: OpenAPIV2.SchemaObject) {
  let type: string;

  if (typeof propDef.items?.type === "string") {
    type = mapType(propDef.items.type);
  } else if (typeof propDef.items?.$ref === "string") {
    type = propDef.items.$ref.substring(14).replace(/-/gu, "_");
  } else if (typeof propDef.$ref === "string") {
    type = propDef.$ref.substring(14).replace(/-/gu, "_");
  } else if (typeof propDef.type === "string" && propDef.type !== "array") {
    type = mapType(propDef.type);
  } else {
    type = "unknown";
  }

  if (propDef.type === "array") {
    type += "[]";
  }

  return type;
}

async function run() {
  const project = new Project();

  for (const apiKey of Object.keys(apiSpecs)) {
    const file = project.createSourceFile(path.join("src", "generated", `${apiKey}.ts`), undefined, {
      overwrite: true,
    });

    const apiSpec: OpenAPIV2.Document = (await axios.get(apiSpecs[apiKey])).data;

    if (!apiSpec.definitions) {
      return;
    }

    const definitions = Object.keys(apiSpec.definitions).reduce<{ [key: string]: ApiClassDefinition[] }>(
      (acc, definitionKey) => {
        const definition = apiSpec.definitions?.[definitionKey];
        const definitionKeyNs = definitionKey.split(".");
        const namespace = initial(definitionKeyNs).join(".");
        const className = last(definitionKeyNs) ?? "";

        if (!acc.hasOwnProperty(namespace)) {
          acc[namespace] = [] as ApiClassDefinition[];
        }

        acc[namespace].push({
          ...definition,
          className,
        });

        return acc;
      },
      {},
    );

    for (const definitionKey of Object.keys(definitions)) {
      const definition = definitions[definitionKey];
      const namespace = file.addNamespace({
        name: definitionKey.replace(/-/gu, "_"),
        isExported: true,
      });

      namespace.addInterfaces(
        definition.flatMap<OptionalKind<InterfaceDeclarationStructure>>(classDef => ({
          docs: classDef.description ? [classDef.description.replace(/\*/gu, "-")] : [],
          name: classDef.className,
          isExported: true,
          properties: Object.keys(classDef.properties ?? {}).flatMap<OptionalKind<PropertySignatureStructure>>(
            propName => {
              const propDef = classDef.properties?.[propName] as OpenAPIV2.SchemaObject;

              return {
                docs: propDef.description ? [propDef.description.replace(/\*/gu, "-")] : [],
                name: propName.replace(/-/gu, "_"),
                type: getType(propDef),
              };
            },
          ),
        })),
      );
    }

    await project.save();
  }
}

run().catch(console.error);
