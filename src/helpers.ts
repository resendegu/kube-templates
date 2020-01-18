import { safeDump } from "js-yaml";

export function generateYaml(objects: any[]) {
  return objects.map(obj => {
    if ("yaml" in obj) {
      return obj.yaml;
    }

    obj = stripUndefinedProperties(obj);
    return "---\n" + safeDump(obj, {
      noRefs: true,
      sortKeys: true,
      noArrayIndent: true
    });
  }).join("\n");
}

function stripUndefinedProperties(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(stripUndefinedProperties);
  } else if (typeof obj === "object" && obj) {
    const newObj: any = {};
    for (const prop of Object.keys(obj)) {
      const value = obj[prop];

      if (value === undefined)
        continue;

      if (Array.isArray(value) && value.length === 0)
        continue;

      newObj[prop] = stripUndefinedProperties(value);
    }
    return newObj;
  }
  return obj;
}

export const env = new Proxy(process.env, {
  get: (envObj, prop) => {
    if (!(prop in envObj)) {
      throw new Error(`Environment variable ${String(prop)} not defined`);
    }
    return envObj[String(prop)];
  },
}) as { [envKey: string]: string };

export function clone(obj: any): any {
  return JSON.parse(JSON.stringify(obj));
}
