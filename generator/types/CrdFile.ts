import type { OpenAPIV3 } from "openapi-types";

export interface CrdFile {
  spec: {
    group: string;
    scope: string;
    names: {
      kind: string;
      listKind: string;
      plural: string;
      singular: string;
      shortNames: string[];
    };

    versions: Array<{
      name: string;
      schema: {
        openAPIV3Schema: OpenAPIV3.SchemaObject;
      };
    }>;
  };
}
