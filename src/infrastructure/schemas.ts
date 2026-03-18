import { z } from "zod";
import { ANGULAR_VERSIONS } from "@/domain/angular-target";

export const engineConfigSchema = z
  .object({
    modelPrefix: z.string().default("I"),
    tsOutputKind: z.enum(["interface", "type", "class"]).default("interface"),
    dateMapping: z.enum(["string", "Date"]).default("string"),
    nullableAsUnion: z.boolean().default(true),
    camelCaseProperties: z.boolean().default(true),
    angularVersion: z.enum(ANGULAR_VERSIONS).default("21"),
    injectionStyle: z.enum(["inject", "constructor"]).default("inject"),
    serviceUseSignals: z.boolean().default(true),
    serviceErrorHandling: z.enum(["catchError", "loggerService"]).default("catchError"),
    serviceDependencies: z.array(z.enum(["logService", "baseApiService", "mappingService"])).default([]),
    serviceExtendsBaseApi: z.boolean().default(false),
    apiUrlPattern: z.string().default("/api/{resource}"),
    serviceSuffix: z.string().default("Service"),
    mockServiceSuffix: z.string().default("MockService"),
    mockServiceLatencyMs: z.coerce.number().int().min(0).max(5000).default(150),
    mockServiceSeedCount: z.coerce.number().int().min(0).max(25).default(2),
    mockServiceAutoIds: z.boolean().default(true),
    uiFramework: z.enum(["none", "material", "tailwind"]).default("none"),
    enableContracts: z.boolean().default(true),
    enableServices: z.boolean().default(true),
    enableComponents: z.boolean().default(true),
    enableMocks: z.boolean().default(true)
  })
  .partial();

export const usageMetricEventSchema = z.object({
  name: z.enum([
    "generation_succeeded",
    "generation_failed",
    "output_selected",
    "settings_opened",
    "output_copied",
    "input_uploaded"
  ]),
  sourceType: z.enum(["csharp", "json"]).optional(),
  output: z.enum(["typescript", "service", "serviceDependencies", "serviceMock", "components", "mocks"]).optional()
});

export const convertSchema = z.object({
  sourceType: z.enum(["csharp", "json"]),
  input: z.string().min(1, "Input is required."),
  rootModelName: z.string().optional(),
  config: engineConfigSchema.optional()
});

export const exportArchiveSchema = z.object({
  archiveName: z.string().min(1, "Archive name is required.").max(80),
  files: z.object({
    contracts: z.string().optional(),
    angularService: z.string().optional(),
    angularServiceDependencies: z.string().optional(),
    angularMockService: z.string().optional(),
    jsonMocks: z.string().optional(),
    componentBaseName: z.string().optional(),
    componentTs: z.string().optional(),
    componentHtml: z.string().optional(),
    componentCss: z.string().optional(),
    componentSpec: z.string().optional(),
    editorBaseName: z.string().optional(),
    editorTs: z.string().optional(),
    editorHtml: z.string().optional(),
    editorCss: z.string().optional(),
    editorSpec: z.string().optional()
  })
});

export const serviceSchema = z.object({
  models: z.array(
    z.object({
      name: z.string(),
      properties: z.array(
        z.object({
          name: z.string(),
          type: z.string(),
          nullable: z.boolean(),
          optional: z.boolean()
        })
      )
    })
  ),
  config: engineConfigSchema.optional()
});

