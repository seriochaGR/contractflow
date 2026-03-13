import { ReactNode } from "react";
import { Braces, Code2, DatabaseZap, FlaskConical, Settings2, Sparkles, X } from "lucide-react";
import { EngineConfig, TsOutputKind } from "@/domain/types";

export type SettingsTab = "contracts" | "service" | "mocks";

interface ConventionsConfigPanelProps {
  config: EngineConfig;
  notification: { kind: "success" | "error"; message: string } | null;
}

interface SettingsPopoverPanelProps {
  config: EngineConfig;
  rootModelName: string;
  showSettings: boolean;
  settingsTab: SettingsTab;
  error: string;
  onCloseSettings: () => void;
  onRootModelNameChange: (value: string) => void;
  onSettingsTabChange: (tab: SettingsTab) => void;
  onUpdateConfig: <K extends keyof EngineConfig>(key: K, value: EngineConfig[K]) => void;
}

export function ConventionsConfigPanel({ config, notification }: ConventionsConfigPanelProps) {
  const enabledSections = [
    config.enableContracts ? "contracts" : null,
    config.enableServices ? "services" : null,
    config.enableMocks ? "mocks" : null
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
        <div className="mb-3 rounded-md border border-slate-700 bg-slate-950/70 p-3">
          <p className="mb-2 text-xs text-slate-400">Enable output sections</p>
          <div className="grid gap-2 text-sm text-slate-300 sm:grid-cols-3">
            <Toggle
              checked={config.enableContracts}
              onChange={(checked) => onUpdateConfig("enableContracts", checked)}
              label="Contracts"
            />
            <Toggle
              checked={config.enableServices}
              onChange={(checked) => onUpdateConfig("enableServices", checked)}
              label="Services"
            />
            <Toggle checked={config.enableMocks} onChange={(checked) => onUpdateConfig("enableMocks", checked)} label="Mocks" />
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {config.enableContracts ? (
            <DialogTabButton
              active={settingsTab === "contracts"}
              onClick={() => onSettingsTabChange("contracts")}
              icon={<Braces className="h-4 w-4" />}
              label="TypeScript Contracts"
            />
          ) : null}
          {config.enableServices ? (
            <DialogTabButton
              active={settingsTab === "service"}
              onClick={() => onSettingsTabChange("service")}
              icon={<Code2 className="h-4 w-4" />}
              label="Angular Services"
            />
          ) : null}
          {config.enableMocks ? (
            <DialogTabButton
              active={settingsTab === "mocks"}
              onClick={() => onSettingsTabChange("mocks")}
              icon={<FlaskConical className="h-4 w-4" />}
              label="Mocks"
            />
          ) : null}
        </div>

        {!config.enableContracts && !config.enableServices && !config.enableMocks ? (
          <div className="rounded-md border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">
            No sections are enabled. Activate at least one section above to configure and generate outputs.
          </div>
        ) : null}

        {config.enableContracts && settingsTab === "contracts" ? (
          <>
            <p className="mb-3 text-xs text-slate-400">
              These options affect generated TypeScript models and also influence service/mocks via model shape.
            </p>
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

        {config.enableServices && settingsTab === "service" ? (
          <>
            <p className="mb-3 text-xs text-slate-400">These options affect Angular service generation only.</p>
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
                    onUpdateConfig("serviceErrorHandling", event.target.value as EngineConfig["serviceErrorHandling"])
                  }
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
                >
                  <option value="catchError">CatchError</option>
                  <option value="loggerService">LoggerService</option>
                </select>
              </Field>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
              <Toggle
                checked={config.serviceUseSignals}
                onChange={(checked) => onUpdateConfig("serviceUseSignals", checked)}
                label="Angular Signals"
              />
            </div>
          </>
        ) : null}

        {config.enableMocks && settingsTab === "mocks" ? (
          <>
            <p className="mb-3 text-xs text-slate-400">
              Mocks are inferred from generated contracts. Adjust contract settings to influence mock structure.
            </p>
            <div className="rounded-md border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">
              No mock-specific toggles yet. Current mock output reflects:
              <ul className="mt-2 list-disc pl-5 text-xs text-slate-400">
                <li>Contract field names and types</li>
                <li>Date mapping (`string` vs `Date`)</li>
                <li>Nullable model rules</li>
              </ul>
            </div>
          </>
        ) : null}
      </div>

      {error ? (
        <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-900/20 px-3 py-2 text-sm text-rose-300">
          {error}
        </div>
      ) : null}
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
