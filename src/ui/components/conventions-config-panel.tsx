import { ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Braces, Check, ChevronDown, Code2, DatabaseZap, FlaskConical, Settings2, Sparkles, X } from "lucide-react";
import { EngineConfig, OutputSettingsSection, ServiceDependencyOption, TsOutputKind } from "@/domain/types";

const SERVICE_DEPENDENCY_OPTIONS: Array<{ value: ServiceDependencyOption; label: string }> = [
  { value: "baseApiService", label: "Base API" },
  { value: "logService", label: "Logs" },
  { value: "mappingService", label: "Mapping" }
];

export type SettingsTab = OutputSettingsSection;

interface ConventionsConfigPanelProps {
  config: EngineConfig;
  notification: { kind: "success" | "error"; message: string } | null;
}

interface SettingsPanelContentProps {
  config: EngineConfig;
  rootModelName: string;
  settingsTab: SettingsTab;
  error: string;
  onRootModelNameChange: (value: string) => void;
  onSettingsTabChange: (tab: SettingsTab) => void;
  onUpdateConfig: <K extends keyof EngineConfig>(key: K, value: EngineConfig[K]) => void;
}

interface SettingsPopoverPanelProps extends SettingsPanelContentProps {
  showSettings: boolean;
  onCloseSettings: () => void;
}

interface SettingsSectionDefinition {
  key: SettingsTab;
  label: string;
  buttonLabel: string;
  icon: ReactNode;
  enabled: (config: EngineConfig) => boolean;
  helperText: string;
}

const SETTINGS_SECTIONS: SettingsSectionDefinition[] = [
  {
    key: "contracts",
    label: "TypeScript Contracts",
    buttonLabel: "TypeScript Contracts",
    icon: <Braces className="h-4 w-4" />,
    enabled: (config) => config.enableContracts,
    helperText: "These options affect generated TypeScript models and also influence service and mock outputs via model shape."
  },
  {
    key: "service",
    label: "Angular Service",
    buttonLabel: "Angular Service",
    icon: <Code2 className="h-4 w-4" />,
    enabled: (config) => config.enableServices,
    helperText: "These options affect Angular service generation only."
  },
  {
    key: "serviceMock",
    label: "Mock Service",
    buttonLabel: "Mock Service",
    icon: <FlaskConical className="h-4 w-4" />,
    enabled: (config) => config.enableServices,
    helperText: "Configure the in-memory Angular mock service independently from the live service output."
  },
  {
    key: "components",
    label: "Component Generation",
    buttonLabel: "Components",
    icon: <Code2 className="h-4 w-4" />,
    enabled: (config) => config.enableComponents,
    helperText: "Generate standalone CRUD list and form components with a template strategy driven by the selected UI framework."
  },
  {
    key: "mocks",
    label: "JSON Mocks",
    buttonLabel: "JSON Mocks",
    icon: <FlaskConical className="h-4 w-4" />,
    enabled: (config) => config.enableMocks,
    helperText: "Mocks are inferred from generated contracts. Adjust contract settings to influence mock structure."
  }
];

export function ConventionsConfigPanel({ config, notification }: ConventionsConfigPanelProps) {
  const enabledSections = [
    config.enableContracts ? "contracts" : null,
    config.enableServices ? "services + mock service" : null,
    config.enableComponents ? "crud components" : null,
    config.enableMocks ? "json mocks" : null
  ]
    .filter(Boolean)
    .join(", ");

  const conventions = [
    { icon: Sparkles, label: `Prefix: ${config.modelPrefix || "(none)"}` },
    { icon: Code2, label: `TS ${config.tsOutputKind}` },
    { icon: Code2, label: `Angular ${config.angularVersion}` },
    { icon: DatabaseZap, label: `Date -> ${config.dateMapping}` },
    { icon: Settings2, label: `Inject ${config.injectionStyle}` },
    { icon: Settings2, label: `Errors ${config.serviceErrorHandling}` },
    {
      icon: Settings2,
      label: `Deps ${config.serviceDependencies.length ? formatDependencyLabels(config.serviceDependencies) : "none"}`
    },
    {
      icon: FlaskConical,
      label: `Mock ${config.mockServiceSuffix} • ${config.mockServiceSeedCount} seed • ${config.mockServiceLatencyMs}ms`
    },
    { icon: Code2, label: `UI ${config.uiFramework}` },
    { icon: FlaskConical, label: `Enabled: ${enabledSections || "none"}` }
  ];

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2">
        {conventions.map((item) => (
          <span
            key={item.label}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs text-slate-300"
          >
            <item.icon className="h-3.5 w-3.5 text-cyan-300" />
            {item.label}
          </span>
        ))}
      </div>

      {notification ? (
        <div
          className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
            notification.kind === "success"
              ? "border-emerald-400/40 bg-emerald-900/20 text-emerald-200"
              : "border-rose-500/40 bg-rose-900/20 text-rose-300"
          }`}
        >
          {notification.message}
        </div>
      ) : null}
    </>
  );
}

export function SettingsPanelContent({
  config,
  rootModelName,
  settingsTab,
  error,
  onRootModelNameChange,
  onSettingsTabChange,
  onUpdateConfig
}: SettingsPanelContentProps) {
  const availableSections = SETTINGS_SECTIONS.filter((section) => section.enabled(config));
  const activeSection = availableSections.find((section) => section.key === settingsTab) ?? availableSections[0] ?? null;

  return (
    <>
      <div className="mb-3 rounded-md border border-slate-700 bg-slate-950/70 p-3">
        <p className="mb-2 text-xs text-slate-400">Enable output sections</p>
        <div className="grid gap-2 text-sm text-slate-300 sm:grid-cols-4">
          <Toggle checked={config.enableContracts} onChange={(checked) => onUpdateConfig("enableContracts", checked)} label="Contracts" />
          <Toggle checked={config.enableServices} onChange={(checked) => onUpdateConfig("enableServices", checked)} label="Services" />
          <Toggle checked={config.enableComponents} onChange={(checked) => onUpdateConfig("enableComponents", checked)} label="Components" />
          <Toggle checked={config.enableMocks} onChange={(checked) => onUpdateConfig("enableMocks", checked)} label="Mocks" />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {availableSections.map((section) => (
          <DialogTabButton
            key={section.key}
            active={activeSection?.key === section.key}
            onClick={() => onSettingsTabChange(section.key)}
            icon={section.icon}
            label={section.buttonLabel}
          />
        ))}
      </div>

      {!availableSections.length ? (
        <div className="rounded-md border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">
          No sections are enabled. Activate at least one section above to configure and generate outputs.
        </div>
      ) : null}

      {activeSection ? <p className="mb-3 text-xs text-slate-400">{activeSection.helperText}</p> : null}

      {activeSection?.key === "contracts" ? (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Root Model (JSON input)">
              <input
                value={rootModelName}
                onChange={(event) => onRootModelNameChange(event.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Prefix">
              <input
                value={config.modelPrefix}
                onChange={(event) => onUpdateConfig("modelPrefix", event.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Type Output">
              <select
                value={config.tsOutputKind}
                onChange={(event) => onUpdateConfig("tsOutputKind", event.target.value as TsOutputKind)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
              >
                <option value="interface">interface</option>
                <option value="type">type</option>
                <option value="class">class</option>
              </select>
            </Field>
            <Field label="Date Mapping">
              <select
                value={config.dateMapping}
                onChange={(event) => onUpdateConfig("dateMapping", event.target.value as EngineConfig["dateMapping"])}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
              >
                <option value="string">string</option>
                <option value="Date">Date</option>
              </select>
            </Field>
          </div>
          <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
            <Toggle
              checked={config.camelCaseProperties}
              onChange={(checked) => onUpdateConfig("camelCaseProperties", checked)}
              label="camelCase properties"
            />
            <Toggle
              checked={config.nullableAsUnion}
              onChange={(checked) => onUpdateConfig("nullableAsUnion", checked)}
              label="Nullable union"
            />
          </div>
        </>
      ) : null}

      {activeSection?.key === "service" ? (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Injection">
              <select
                value={config.injectionStyle}
                onChange={(event) =>
                  onUpdateConfig("injectionStyle", event.target.value as EngineConfig["injectionStyle"])
                }
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
              >
                <option value="inject">inject()</option>
                <option value="constructor">constructor</option>
              </select>
            </Field>
            <Field label="API URL Pattern">
              <input
                value={config.apiUrlPattern}
                onChange={(event) => onUpdateConfig("apiUrlPattern", event.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Service Suffix">
              <input
                value={config.serviceSuffix}
                onChange={(event) => onUpdateConfig("serviceSuffix", event.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Error Handling">
              <select
                value={config.serviceErrorHandling}
                onChange={(event) =>
                  updateErrorHandling(
                    event.target.value as EngineConfig["serviceErrorHandling"],
                    config.serviceDependencies,
                    onUpdateConfig
                  )
                }
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
              >
                <option value="catchError">CatchError</option>
                <option value="loggerService">LoggerService</option>
              </select>
            </Field>
            <Field label="Service Dependencies">
              <MultiSelectDropdown
                value={config.serviceDependencies}
                options={SERVICE_DEPENDENCY_OPTIONS}
                onChange={(dependencies) => updateServiceDependencies(dependencies, onUpdateConfig)}
              />
            </Field>
          </div>
          <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
            <Toggle
              checked={config.serviceUseSignals}
              onChange={(checked) => onUpdateConfig("serviceUseSignals", checked)}
              label="Angular Signals"
            />
            <Toggle
              checked={config.serviceExtendsBaseApi}
              onChange={(checked) => {
                onUpdateConfig("serviceExtendsBaseApi", checked);
                if (checked && !config.serviceDependencies.includes("baseApiService")) {
                  onUpdateConfig("serviceDependencies", [...config.serviceDependencies, "baseApiService"]);
                }
              }}
              label="Extend BaseApiService"
            />
          </div>
        </>
      ) : null}

      {activeSection?.key === "serviceMock" ? (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Mock Service Suffix">
              <input
                value={config.mockServiceSuffix}
                onChange={(event) => onUpdateConfig("mockServiceSuffix", event.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Latency (ms)">
              <input
                type="number"
                min={0}
                max={5000}
                value={config.mockServiceLatencyMs}
                onChange={(event) => onUpdateConfig("mockServiceLatencyMs", Number(event.target.value || 0))}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Seed Items">
              <input
                type="number"
                min={0}
                max={25}
                value={config.mockServiceSeedCount}
                onChange={(event) => onUpdateConfig("mockServiceSeedCount", Number(event.target.value || 0))}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
              />
            </Field>
          </div>
          <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
            <Toggle
              checked={config.mockServiceAutoIds}
              onChange={(checked) => onUpdateConfig("mockServiceAutoIds", checked)}
              label="Auto-generate ids"
            />
          </div>
        </>
      ) : null}

      {activeSection?.key === "components" ? (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="UI Framework">
              <select
                value={config.uiFramework}
                onChange={(event) => onUpdateConfig("uiFramework", event.target.value as EngineConfig["uiFramework"])}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
              >
                <option value="none">None</option>
                <option value="material">Angular Material</option>
                <option value="tailwind">Tailwind CSS</option>
              </select>
            </Field>
          </div>
          <div className="mt-3 rounded-md border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">
            CRUD scaffolding generates a standalone list component and a standalone reactive form component.
            <ul className="mt-2 list-disc pl-5 text-xs text-slate-400">
              <li>Standalone components by default</li>
              <li>Reactive Forms with FormBuilder</li>
              <li>Validator inference for required, email and password fields</li>
              <li>Template strategy for semantic HTML, Angular Material or Tailwind CSS</li>
            </ul>
          </div>
        </>
      ) : null}
      {activeSection?.key === "mocks" ? (
        <div className="rounded-md border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">
          No mock-specific toggles yet. Current mock output reflects:
          <ul className="mt-2 list-disc pl-5 text-xs text-slate-400">
            <li>Contract field names and types</li>
            <li>Date mapping (`string` vs `Date`)</li>
            <li>Nullable model rules</li>
          </ul>
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-900/20 px-3 py-2 text-sm text-rose-300">
          {error}
        </div>
      ) : null}
    </>
  );
}

export function SettingsPopoverPanel({
  config,
  rootModelName,
  showSettings,
  settingsTab,
  error,
  onCloseSettings,
  onRootModelNameChange,
  onSettingsTabChange,
  onUpdateConfig
}: SettingsPopoverPanelProps) {
  if (!showSettings) return null;

  return (
    <div className="absolute right-0 top-full z-30 mt-2 w-[min(92vw,46rem)] rounded-2xl border border-cyan-400/25 bg-panel p-4 shadow-glow">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-cyan-200">
          <Settings2 className="h-4 w-4" /> Conventions
        </h2>
        <button
          type="button"
          onClick={onCloseSettings}
          className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300 hover:border-slate-600"
        >
          <X className="h-3.5 w-3.5" />
          Close
        </button>
      </div>

      <div className="tool-scroll max-h-[70vh] overflow-y-auto rounded-lg border border-slate-700 bg-slate-900/80 p-3">
        <SettingsPanelContent
          config={config}
          rootModelName={rootModelName}
          settingsTab={settingsTab}
          error={error}
          onRootModelNameChange={onRootModelNameChange}
          onSettingsTabChange={onSettingsTabChange}
          onUpdateConfig={onUpdateConfig}
        />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="text-xs text-slate-400">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  checked,
  onChange,
  label
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="inline-flex items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-400 focus:ring-cyan-400"
      />
      {label}
    </label>
  );
}

function DialogTabButton({
  active,
  onClick,
  icon,
  label
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition ${
        active
          ? "border-cyan-300/40 bg-cyan-400/15 text-cyan-200"
          : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function formatDependencyLabels(dependencies: ServiceDependencyOption[]) {
  return dependencies
    .map((dependency) => SERVICE_DEPENDENCY_OPTIONS.find((option) => option.value === dependency)?.label ?? dependency)
    .join(", ");
}

function updateServiceDependencies(
  dependencies: ServiceDependencyOption[],
  onUpdateConfig: <K extends keyof EngineConfig>(key: K, value: EngineConfig[K]) => void
) {
  onUpdateConfig("serviceDependencies", dependencies);
  onUpdateConfig("serviceExtendsBaseApi", dependencies.includes("baseApiService"));
  if (dependencies.includes("logService")) {
    onUpdateConfig("serviceErrorHandling", "loggerService");
  }
}

function updateErrorHandling(
  errorHandling: EngineConfig["serviceErrorHandling"],
  currentDependencies: ServiceDependencyOption[],
  onUpdateConfig: <K extends keyof EngineConfig>(key: K, value: EngineConfig[K]) => void
) {
  onUpdateConfig("serviceErrorHandling", errorHandling);

  if (errorHandling === "loggerService" && !currentDependencies.includes("logService")) {
    onUpdateConfig("serviceDependencies", [...currentDependencies, "logService"]);
    return;
  }

  if (errorHandling === "catchError" && currentDependencies.includes("logService")) {
    onUpdateConfig(
      "serviceDependencies",
      currentDependencies.filter((dependency) => dependency !== "logService")
    );
  }
}

function MultiSelectDropdown({
  value,
  options,
  onChange
}: {
  value: ServiceDependencyOption[];
  options: Array<{ value: ServiceDependencyOption; label: string }>;
  onChange: (value: ServiceDependencyOption[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    function updatePosition() {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const maxHeight = Math.max(160, Math.min(280, viewportHeight - rect.bottom - 16));

      setMenuStyle({
        left: rect.left,
        width: rect.width,
        top: rect.bottom + 8,
        maxHeight
      });
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      const clickedTrigger = containerRef.current?.contains(target);
      const clickedMenu = menuRef.current?.contains(target);
      if (!clickedTrigger && !clickedMenu) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    updatePosition();
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  const summary = value.length ? formatDependencyLabels(value) : "Select dependencies";

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-left text-sm text-slate-100"
      >
        <span className="truncate">{summary}</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && menuStyle && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[80] rounded-xl border border-slate-700 bg-slate-950 p-2 shadow-glow"
              style={{
                left: menuStyle.left,
                top: menuStyle.top,
                width: menuStyle.width
              }}
            >
              <div className="grid max-h-[inherit] gap-1 overflow-y-auto" style={{ maxHeight: menuStyle.maxHeight }}>
                {options.map((option) => {
                  const checked = value.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        onChange(checked ? value.filter((item) => item !== option.value) : [...value, option.value])
                      }
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                        checked
                          ? "bg-cyan-400/15 text-cyan-100"
                          : "text-slate-300 hover:bg-slate-900 hover:text-slate-100"
                      }`}
                    >
                      <span>{option.label}</span>
                      <span
                        className={`inline-flex h-5 w-5 items-center justify-center rounded border ${
                          checked
                            ? "border-cyan-300/50 bg-cyan-400/20 text-cyan-200"
                            : "border-slate-700 bg-slate-900 text-transparent"
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}


