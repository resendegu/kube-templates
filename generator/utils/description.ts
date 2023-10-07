import type { OpenAPIV3 } from "openapi-types";
import { StructureKind, type JSDocStructure } from "ts-morph";

export function generateDescription(
  object: OpenAPIV3.BaseSchemaObject,
): Array<string | JSDocStructure> {
  return [
    {
      kind: StructureKind.JSDoc,
      description: object.description
        ? object.description.replace(/\*\//gu, "*\\//").replace(/\u00A0/gu, " ")
        : undefined,
      tags: [
        ...(object.format ? [{ tagName: "format", text: object.format }] : []),
        ...(object.example
          ? [{ tagName: "example", text: object.example }]
          : []),
        ...(object.nullable ? [{ tagName: "nullable" }] : []),
        ...(object.deprecated ? [{ tagName: "deprecated" }] : []),
        ...(object.pattern
          ? [{ tagName: "pattern", text: object.pattern }]
          : []),
        ...(object.default &&
        (typeof object.default === "object"
          ? Object.keys(object.default).length > 0
          : true)
          ? [{ tagName: "default", text: object.default }]
          : []),
      ],
    },
  ];
}
