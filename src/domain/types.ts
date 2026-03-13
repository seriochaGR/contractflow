import type { AngularVersion } from "@/domain/angular-target";

export type SourceType = "csharp" | "json";
export type TsOutputKind = "interface" | "type" | "class";
export type DateMapping = "string" | "Date";
export type InjectionStyle = "inject" | "constructor";
export type ServiceErrorHandling = "catchError" | "loggerService";
export type { AngularVersion } from "@/domain/angular-target";

export interface PropertySpec {
  name: string;
  type: string;
  nullable: boolean;
  optional: boolean;
}

export interface ModelSpec {
  name: string;
  properties: PropertySpec[];
}

export interface EngineConfig {
  modelPrefix: string;
  tsOutputKind: TsOutputKind;
  dateMapping: DateMapping;
  nullableAsUnion: boolean;
  camelCaseProperties: boolean;
  angularVersion: AngularVersion;
  injectionStyle: InjectionStyle;
  serviceUseSignals: boolean;
  serviceErrorHandling: ServiceErrorHandling;
  apiUrlPattern: string;
  serviceSuffix: string;
  enableContracts: boolean;
  enableServices: boolean;
  enableMocks: boolean;
}

export interface ConvertRequest {
  sourceType: SourceType;
  input: string;
  rootModelName?: string;
  config?: Partial<EngineConfig>;
}

export interface ConvertResult {
  models: ModelSpec[];
  typescript: string;
}

export const defaultEngineConfig: EngineConfig = {
  modelPrefix: "I",
  tsOutputKind: "interface",
  dateMapping: "string",
  nullableAsUnion: true,
  camelCaseProperties: true,
  angularVersion: "21",
  injectionStyle: "inject",
  serviceUseSignals: true,
  serviceErrorHandling: "catchError",
  apiUrlPattern: "/api/{resource}",
  serviceSuffix: "Service",
  enableContracts: true,
  enableServices: true,
  enableMocks: true
};

export function withDefaults(config?: Partial<EngineConfig>): EngineConfig {
  return {
    ...defaultEngineConfig,
    ...config
  };
}
