import { generateAngularArtifacts, generateAngularService } from "@/domain/angular-service-generator";
import { parseCSharpModels } from "@/domain/csharp-parser";
import { parseJsonModels } from "@/domain/json-parser";
import { generateJsonMocks } from "@/domain/mock-generator";
import { ConvertRequest, ConvertResult, EngineConfig, ModelSpec, withDefaults } from "@/domain/types";
import { generateTypescript } from "@/domain/typescript-generator";

export interface EngineOutput extends ConvertResult {
  angularService: string;
  angularServiceDependencies: string;
  angularMockService: string;
  jsonMocks: string;
  config: EngineConfig;
}

export function convertInput(request: ConvertRequest): ConvertResult {
  const config = withDefaults(request.config);
  const modelName = request.rootModelName ?? "RootModel";

  const models =
    request.sourceType === "csharp"
      ? parseCSharpModels(request.input, config)
      : parseJsonModels(request.input, modelName, config);
  const typescript = config.enableContracts ? generateTypescript(models, config) : "";
  return { models, typescript };
}

export function generateArtifacts(request: ConvertRequest): EngineOutput {
  const config = withDefaults(request.config);
  const conversion = convertInput({ ...request, config });
  const angularArtifacts = config.enableServices
    ? generateAngularArtifacts(conversion.models, config)
    : { service: "", dependencies: "", mockService: "" };
  const jsonMocks = config.enableMocks ? generateJsonMocks(conversion.models) : "";
  return {
    ...conversion,
    angularService: angularArtifacts.service,
    angularServiceDependencies: angularArtifacts.dependencies,
    angularMockService: angularArtifacts.mockService,
    jsonMocks,
    config
  };
}

export function generateService(models: ModelSpec[], config?: Partial<EngineConfig>): string {
  return generateAngularService(models, withDefaults(config));
}

export function generateMockService(models: ModelSpec[], config?: Partial<EngineConfig>): string {
  return generateAngularArtifacts(models, withDefaults(config)).mockService;
}

export function generateMocks(models: ModelSpec[]): string {
  return generateJsonMocks(models);
}
