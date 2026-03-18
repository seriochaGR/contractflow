import type { AngularVersion } from "@/domain/angular-target";

export type SourceType = "csharp" | "json";
export type TsOutputKind = "interface" | "type" | "class";
export type DateMapping = "string" | "Date";
export type InjectionStyle = "inject" | "constructor";
export type ServiceErrorHandling = "catchError" | "loggerService";
export type ServiceDependencyOption = "logService" | "baseApiService" | "mappingService";
export type UiFramework = "none" | "material" | "tailwind";
export type OutputSettingsSection = "contracts" | "service" | "serviceMock" | "components" | "mocks";
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

export interface AngularCrudComponentArtifacts {
  componentBaseName: string;
  componentTs: string;
  componentHtml: string;
  componentCss: string;
  componentSpec: string;
  editorBaseName: string;
  editorTs: string;
  editorHtml: string;
  editorCss: string;
  editorSpec: string;
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
  serviceDependencies: ServiceDependencyOption[];
  serviceExtendsBaseApi: boolean;
  apiUrlPattern: string;
  serviceSuffix: string;
  mockServiceSuffix: string;
  mockServiceLatencyMs: number;
  mockServiceSeedCount: number;
  mockServiceAutoIds: boolean;
  uiFramework: UiFramework;
  enableContracts: boolean;
  enableServices: boolean;
  enableComponents: boolean;
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
  serviceDependencies: [],
  serviceExtendsBaseApi: false,
  apiUrlPattern: "/api/{resource}",
  serviceSuffix: "Service",
  mockServiceSuffix: "MockService",
  mockServiceLatencyMs: 150,
  mockServiceSeedCount: 2,
  mockServiceAutoIds: true,
  uiFramework: "none",
  enableContracts: true,
  enableServices: true,
  enableComponents: true,
  enableMocks: true
};

export function withDefaults(config?: Partial<EngineConfig>): EngineConfig {
  return {
    ...defaultEngineConfig,
    ...config
  };
}

