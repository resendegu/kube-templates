import { initial, last } from "lodash";
import type { OpenAPIV3 } from "openapi-types";
import type {
  ModuleDeclaration,
  InterfaceDeclaration,
  SourceFile,
} from "ts-morph";
import { StructureKind } from "ts-morph";

import { generateDescription } from "./utils/description";
import { log } from "./utils/log";
import {
  sanitizeRefName,
  sanitizeInterfaceName,
  sanitizeTypeName,
  sanitizePropertyName,
} from "./utils/sanitizers";

export function makeInterfaceIfNeeded(
  module: ModuleDeclaration,
  name: string,
  definition: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
): string {
  const ifcName = sanitizeInterfaceName(name);
  const ifcRefName = `${module.getName()}.${ifcName}`;

  if (definition.hasOwnProperty("$ref")) {
    const defObj = definition as OpenAPIV3.ReferenceObject;

    return sanitizeRefName(defObj.$ref);
  }

  // eslint-disable-next-line no-param-reassign
  definition = definition as OpenAPIV3.SchemaObject;

  if (definition.type === "object") {
    if (definition.properties) {
      handleProperties("module", module, null, name, definition);
      return name;
    } else if (definition.additionalProperties) {
      if (typeof definition.additionalProperties === "object") {
        if (definition.additionalProperties.hasOwnProperty("$ref")) {
          const defObj =
            definition.additionalProperties as OpenAPIV3.ReferenceObject;

          return `Record<string, ${sanitizeRefName(defObj.$ref)}>`;
        }

        const defObj =
          definition.additionalProperties as OpenAPIV3.SchemaObject;

        if (defObj.type === "object") {
          handleProperties("module", module, null, ifcName, defObj);

          return `Record<string, ${ifcRefName}>`;
        }

        return `Record<string, ${makeInterfaceIfNeeded(
          module,
          ifcName,
          defObj,
        )}>`;
      }
    }
  } else if (definition.allOf) {
    return definition.allOf
      .map(def => makeInterfaceIfNeeded(module, name, def))
      .join(" & ");
  } else if (definition.anyOf) {
    return definition.anyOf
      .map(def => makeInterfaceIfNeeded(module, name, def))
      .join(" | ");
  } else if (definition.oneOf) {
    return definition.oneOf
      .map(def => makeInterfaceIfNeeded(module, name, def))
      .join(" | ");
  } else if (definition.type === "string" && definition.enum) {
    return definition.enum.map(sanitizePropertyName).join(" | ");
  } else if (definition.type === "array") {
    return `Array<${makeInterfaceIfNeeded(module, name, definition.items)}>`;
  }

  return sanitizeTypeName(definition.type ?? "any");
}

export function handleProperties(
  scope: "module" | "interface" | "property",
  module: ModuleDeclaration,
  intrface: InterfaceDeclaration | null,
  name: string,
  definition: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
  required?: string[],
) {
  if (definition.hasOwnProperty("$ref")) {
    const defObj = definition as OpenAPIV3.ReferenceObject;

    if (scope === "module") {
      module.addTypeAlias({
        name,
        type: sanitizeRefName(defObj.$ref),
        isExported: true,
      });
    } else {
      intrface!.addProperty({
        name,
        type: sanitizeRefName(defObj.$ref),
      });
    }

    return;
  }

  const defObj = definition as OpenAPIV3.SchemaObject;
  const ifcName = sanitizeInterfaceName(name);
  const fullIfcName = `${module.getName()}.${ifcName}`;

  if (scope === "module") {
    if (defObj.type === "object") {
      let ifc = module.getInterface(ifcName);

      if (!ifc) {
        log.info("Generating interface", fullIfcName);

        ifc = module.addInterface({
          kind: StructureKind.Interface,
          name: ifcName,
          docs: generateDescription(defObj),
          isExported: true,
        });
      }

      if (defObj.properties) {
        for (const [propName, prop] of Object.entries(defObj.properties)) {
          handleProperties(
            "interface",
            module,
            ifc,
            propName,
            prop,
            defObj.required,
          );
        }
      }
    } else {
      log.info("Generating type alias", fullIfcName);

      module.addTypeAlias({
        name: ifcName,
        type: makeInterfaceIfNeeded(module, name, defObj),
        docs: generateDescription(defObj),
        isExported: true,
      });
    }
  } else {
    intrface!.addProperty({
      name: sanitizePropertyName(name),
      type: makeInterfaceIfNeeded(
        module,
        `${intrface!.getName()}_${sanitizeInterfaceName(name)}`,
        defObj,
      ),
      docs: generateDescription(defObj),
      hasQuestionToken: !required?.includes(name),
    });
  }
}

export function buildModules(file: SourceFile, apiSpecObj: OpenAPIV3.Document) {
  if (!apiSpecObj.components) {
    return null;
  }

  const modules = new Map<string, ModuleDeclaration>();

  for (const [definitionKey, definition] of Object.entries(
    apiSpecObj.components.schemas ?? {},
  )) {
    const definitionKeyNs = definitionKey.split(".");
    const namespace = initial(definitionKeyNs).join(".");
    const className = last(definitionKeyNs) ?? "";

    let module: ModuleDeclaration;

    if (modules.has(namespace)) {
      module = modules.get(namespace)!;
    } else {
      module = file.addModule({
        name: namespace.replace(/-/gu, "_"),
        isExported: true,
      });

      modules.set(namespace, module);
    }

    handleProperties("module", module, null, className, definition);
  }

  return modules;
}
