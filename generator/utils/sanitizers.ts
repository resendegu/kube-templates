import { initial, last } from "lodash";

export function sanitizeRefName(name: string) {
  const definitionKey = name.split("/").pop()!;
  const definitionKeyNs = definitionKey.split(".");
  const namespace = initial(definitionKeyNs).join(".");
  const className = last(definitionKeyNs) ?? "";

  return `${namespace.replace(/[-]/gu, "_")}.${className}`;
}

export function sanitizeInterfaceName(name: string) {
  return `${name.replace(/[-.]/gu, "_")}`;
}

export function sanitizePropertyName(name: string) {
  return `"${name}"`;
}

export function sanitizeTypeName(name: string) {
  if (name === "integer") {
    return "number";
  } else if (name === "Array<integer>") {
    return "number[]";
  }

  return name;
}
