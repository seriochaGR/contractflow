export function toPascalCase(value: string): string {
  const parts = value.replace(/([a-z0-9])([A-Z])/g, "$1 $2").split(/[^a-zA-Z0-9]+/);
  return parts.filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join("");
}

export function toCamelCase(value: string): string {
  const pascal = toPascalCase(value);
  return pascal.length === 0 ? pascal : pascal[0].toLowerCase() + pascal.slice(1);
}

export function toKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .toLowerCase();
}

export function splitTopLevel(value: string, separator: string): string[] {
  const result: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (char === "<" || char === "(") depth++;
    if (char === ">" || char === ")") depth = Math.max(0, depth - 1);
    if (char === separator && depth === 0) {
      result.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  result.push(value.slice(start).trim());
  return result.filter(Boolean);
}
