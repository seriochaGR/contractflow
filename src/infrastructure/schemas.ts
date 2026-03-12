import { z } from "zod";

export const engineConfigSchema = z
  .object({
    modelPrefix: z.string().default("I"),
    tsOutputKind: z.enum(["interface", "type", "class"]).default("interface"),
    dateMapping: z.enum(["string", "Date"]).default("string"),
    nullableAsUnion: z.boolean().default(true),
    camelCaseProperties: z.boolean().default(true),
    injectionStyle: z.enum(["inject", "constructor"]).default("inject"),
    serviceUseSignals: z.boolean().default(true),
    apiUrlPattern: z.string().default("/api/{resource}"),
    serviceSuffix: z.string().default("Service")
  })
  .partial();

export const convertSchema = z.object({
  sourceType: z.enum(["csharp", "json"]),
  input: z.string().min(1, "Input is required."),
  rootModelName: z.string().optional(),
  config: engineConfigSchema.optional()
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
