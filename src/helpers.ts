import { dump } from "js-yaml";

function stripUndefinedProperties(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(stripUndefinedProperties);
  } else if (typeof obj === "object" && obj) {
    const newObj: any = {};

    for (const prop of Object.keys(obj)) {
      const value = obj[prop];

      if (value === undefined) {
        continue;
      }

      if (Array.isArray(value) && value.length === 0) {
        continue;
      }

      newObj[prop] = stripUndefinedProperties(value);
    }

    return newObj;
  }

  return obj;
}

export function generateYaml(objects: any[]) {
  return objects
    .map((obj) => {
      if ("yaml" in obj) {
        return obj.yaml;
      }

      return `---\n${dump(stripUndefinedProperties(obj), {
        noRefs: true,
        sortKeys: true,
        noArrayIndent: true,
      })}`;
    })
    .join("\n");
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

export function parseMemory(memory: string | number) {
  if (typeof memory === "number") {
    return memory;
  }

  const str = memory
    .replace(/\s/gu, "")
    .replace(/e\d+$/u, (n) =>
      new Array(parseInt(n.slice(1), 10)).fill("0").join("")
    );

  let i = 0;

  for (const letter of ["K", "M", "G", "T", "P", "E"]) {
    i += 1;

    const match = new RegExp(`^(\\d+)${letter}(i?)$`, "iu").exec(str);

    if (match) {
      const base = parseInt(match[1], 10);
      const multiplier = Math.pow(match[2] ? 1024 : 1000, i);

      return base * multiplier;
    }
  }

  throw new Error(`Unrecognized memory format: '${memory}'`);
}
