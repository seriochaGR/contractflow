import { EngineConfig, ModelSpec, TsOutputKind } from "@/domain/types";
import { toCamelCase } from "@/domain/naming";
import { buildCompatibilityBanner } from "@/domain/angular-target";

export function generateTypescript(models: ModelSpec[], config: EngineConfig): string {
  const modelNames = new Set(models.map((model) => model.name));
  return [buildCompatibilityBanner(config.angularVersion, "contracts"), models.map((model) => renderModel(model, config, modelNames)).join("\n\n")]
    .filter(Boolean)
    .join("\n\n");
}

function renderModel(model: ModelSpec, config: EngineConfig, modelNames: Set<string>): string {
  const exportedName = `${config.modelPrefix}${model.name}`;
  const body = model.properties
    .map((prop) => {
      const field = config.camelCaseProperties ? toCamelCase(prop.name) : prop.name;
      const type = withModelPrefix(prop.type, config.modelPrefix, modelNames);
      return `  ${field}${prop.optional ? "?" : ""}: ${type};`;
    })
    .join("\n");

  if (config.tsOutputKind === "interface") {
    return `export interface ${exportedName} {\n${body}\n}`;
  }
  if (config.tsOutputKind === "type") {
    return `export type ${exportedName} = {\n${body}\n};`;
  }
  return renderClass(exportedName, body, model, config, modelNames);
}

function renderClass(
  exportedName: string,
  body: string,
  model: ModelSpec,
  config: EngineConfig,
  modelNames: Set<string>
): string {
  const lines = body.split("\n").map((line) => line.replace(":", "!:"));
  const constructorAssign = model.properties
    .map((prop) => {
      const field = config.camelCaseProperties ? toCamelCase(prop.name) : prop.name;
      return `    if (init?.${field} !== undefined) this.${field} = init.${field};`;
    })
    .join("\n");

  const initFields = model.properties
    .map((prop) => {
      const field = config.camelCaseProperties ? toCamelCase(prop.name) : prop.name;
      const type = withModelPrefix(prop.type, config.modelPrefix, modelNames);
      return `  ${field}?: ${type};`;
    })
    .join("\n");

  return [
    `export interface ${exportedName}Init {`,
    initFields,
    `}`,
    ``,
    `export class ${exportedName} {`,
    ...lines,
    ``,
    `  constructor(init?: ${exportedName}Init) {`,
    constructorAssign,
    `  }`,
    `}`
  ].join("\n");
}

function withModelPrefix(type: string, prefix: string, modelNames: Set<string>): string {
  let result = type;
  for (const modelName of modelNames) {
    const regex = new RegExp(`\\b${modelName}\\b`, "g");
    result = result.replace(regex, `${prefix}${modelName}`);
  }
  return result;
}
