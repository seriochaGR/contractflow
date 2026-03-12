import { generateAngularService } from "@/domain/angular-service-generator";
import { parseCSharpModels } from "@/domain/csharp-parser";
import { parseJsonModels } from "@/domain/json-parser";
import { generateJsonMocks } from "@/domain/mock-generator";
import { ConvertRequest, ConvertResult, EngineConfig, ModelSpec, withDefaults } from "@/domain/types";
import { generateTypescript } from "@/domain/typescript-generator";

export interface EngineOutput extends ConvertResult {
  angularService: string;
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
  const typescript = generateTypescript(models, config);
  return { models, typescript };
}

export function generateArtifacts(request: ConvertRequest): EngineOutput {
  const config = withDefaults(request.config);
  const conversion = convertInput({ ...request, config });
  const angularService = generateAngularService(conversion.models, config);
  const jsonMocks = generateJsonMocks(conversion.models);
  return {
    ...conversion,
    angularService,
    jsonMocks,
    config
  };
}

export function generateService(models: ModelSpec[], config?: Partial<EngineConfig>): string {
  return generateAngularService(models, withDefaults(config));
}

export function generateMocks(models: ModelSpec[]): string {
  return generateJsonMocks(models);
}
