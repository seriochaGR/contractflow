"use client";

import dynamic from "next/dynamic";
import { ChangeEvent, ReactNode, useMemo, useState } from "react";
import {
  Braces,
  Code2,
  DatabaseZap,
  FileCode2,
  FlaskConical,
  X,
  Settings2,
  Sparkles,
  Upload
} from "lucide-react";
import { defaultEngineConfig, EngineConfig, SourceType, TsOutputKind } from "@/domain/types";
import { AppMainHeader } from "@/ui/components/app-main-header";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface EngineResponse {
  typescript: string;
  angularService: string;
  jsonMocks: string;
}

type OutputTab = "typescript" | "service" | "mocks";
type SettingsTab = "contracts" | "service" | "mocks";

const EXAMPLES = {
  csharp: `public class UserDto
{
    public Guid Id { get; set; }
    public string? DisplayName { get; set; }
    public DateTime? BirthDate { get; set; }
    public List<string> Roles { get; set; }
}`,
  json: `{
  "id": "e5f1779e-af4c-4f10-83b8-4db86f8d2a99",
  "displayName": null,
  "birthDate": "2026-01-01T08:30:00Z",
  "roles": ["admin", "editor"]
}`
};

const editorOptions = {
  minimap: { enabled: false },
  fontSize: 14,
  fontFamily: "JetBrains Mono, Cascadia Mono, monospace",
  smoothScrolling: true,
  automaticLayout: true,
  scrollBeyondLastLine: false,
  padding: { top: 12, bottom: 12 }
};

export function ContractFlowWorkbench() {
  const [sourceType, setSourceType] = useState<SourceType>("csharp");
  const [input, setInput] = useState(EXAMPLES.csharp);
  const [rootModelName, setRootModelName] = useState("RootModel");
  const [config, setConfig] = useState<EngineConfig>(defaultEngineConfig);
  const [output, setOutput] = useState<EngineResponse | null>(null);
  const [outputTab, setOutputTab] = useState<OutputTab>("typescript");
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("contracts");
  const [error, setError] = useState("");
  const [notification, setNotification] = useState<{ kind: "success" | "error"; message: string } | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);

  const outputValue =
    outputTab === "typescript"
      ? output?.typescript ?? "// TypeScript output"
      : outputTab === "service"
        ? output?.angularService ?? "// Angular service output"
        : output?.jsonMocks ?? "// JSON mocks output";
  const outputLanguage = outputTab === "mocks" ? "json" : "typescript";
  const inputLanguage = sourceType === "json" ? "json" : "csharp";

  const conventions = useMemo(
    () => [
      { icon: Sparkles, label: `Prefix: ${config.modelPrefix || "(none)"}` },
      { icon: Code2, label: `TS ${config.tsOutputKind}` },
      { icon: DatabaseZap, label: `Date -> ${config.dateMapping}` },
      { icon: Settings2, label: `Inject ${config.injectionStyle}` }
    ],
    [config]
  );

  async function runGeneration() {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/engine/all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceType, input, rootModelName, config })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Engine request failed.");
      setOutput({
        typescript: payload.typescript,
        angularService: payload.angularService,
        jsonMocks: payload.jsonMocks
      });
      setNotification({
        kind: "success",
        message: "Generation completed: TypeScript contracts, Angular service, and JSON mocks are ready."
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setError(message);
      setNotification({ kind: "error", message: `Generation failed: ${message}` });
    } finally {
      setIsLoading(false);
    }
  }

  function onUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    file.text().then((text) => setInput(text));
  }

  function loadExample(nextType: SourceType) {
    setSourceType(nextType);
    setInput(nextType === "csharp" ? EXAMPLES.csharp : EXAMPLES.json);
  }

  function updateConfig<K extends keyof EngineConfig>(key: K, value: EngineConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <main className="mx-auto flex h-[calc(100vh-4rem)] max-w-[1600px] flex-col overflow-hidden px-4 py-4 md:px-6">
      <section className="animate-rise mb-4 rounded-2xl border border-cyan-400/25 bg-panel/90 p-4 shadow-glow backdrop-blur-xl">
        <AppMainHeader
          isLoading={isLoading}
          onGenerate={runGeneration}
        />

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
      </section>

      <section className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        <article className="flex min-h-0 flex-col rounded-2xl border border-slate-800 bg-panel/90 p-3 backdrop-blur-xl">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <FileCode2 className="h-3.5 w-3.5" /> Input Editor
              </div>
              <div className="inline-flex rounded-lg border border-slate-700 bg-slate-900/80 p-1 text-sm">
                <button
                  type="button"
                  onClick={() => loadExample("csharp")}
                  className={`rounded-md px-3 py-1.5 ${sourceType === "csharp" ? "bg-cyan-400 text-slate-950" : "text-slate-300"}`}
                >
                  C#
                </button>
                <button
                  type="button"
                  onClick={() => loadExample("json")}
                  className={`rounded-md px-3 py-1.5 ${sourceType === "json" ? "bg-cyan-400 text-slate-950" : "text-slate-300"}`}
                >
                  JSON
                </button>
              </div>             
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300">
              <Upload className="h-3.5 w-3.5" />
              Upload
              <input type="file" accept=".cs,.json,.txt" onChange={onUpload} className="hidden" />
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-800">
            <MonacoEditor
              height="100%"
              language={inputLanguage}
              theme="vs-dark"
              value={input}
              onChange={(value) => setInput(value ?? "")}
              options={editorOptions}
            />
          </div>
        </article>

        <article className="flex min-h-0 flex-col rounded-2xl border border-slate-800 bg-panel/90 p-3 backdrop-blur-xl">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <TabButton
              active={outputTab === "typescript"}
              onClick={() => setOutputTab("typescript")}
              icon={<Braces className="h-4 w-4" />}
              label="TypeScript"
            />
            <TabButton
              active={outputTab === "service"}
              onClick={() => setOutputTab("service")}
              icon={<Code2 className="h-4 w-4" />}
              label="Angular Service"
            />
            <TabButton
              active={outputTab === "mocks"}
              onClick={() => setOutputTab("mocks")}
              icon={<FlaskConical className="h-4 w-4" />}
              label="JSON Mocks"
            />
            <button
              type="button"
              onClick={() => setShowSettings((prev) => !prev)}
              className={`ml-auto inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                showSettings
                  ? "border-cyan-300/40 bg-cyan-400/15 text-cyan-200"
                  : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600"
              }`}
            >
              <Settings2 className="h-4 w-4" />
              Settings
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-800">
            <MonacoEditor
              height="100%"
              language={outputLanguage}
              theme="vs-dark"
              value={outputValue}
              options={{ ...editorOptions, readOnly: true }}
            />
          </div>
        </article>
      </section>

      {showSettings ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Settings panel"
            className="w-full max-w-4xl rounded-2xl border border-cyan-400/25 bg-panel p-4 shadow-glow"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-base font-semibold text-cyan-200">
                <Settings2 className="h-4 w-4" /> Conventions
              </h2>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300 hover:border-slate-600"
              >
                <X className="h-3.5 w-3.5" />
                Close
              </button>
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-3">
              <div className="mb-3 flex flex-wrap gap-2">
                <TabButton
                  active={settingsTab === "contracts"}
                  onClick={() => setSettingsTab("contracts")}
                  icon={<Braces className="h-4 w-4" />}
                  label="TypeScript Contracts"
                />
                <TabButton
                  active={settingsTab === "service"}
                  onClick={() => setSettingsTab("service")}
                  icon={<Code2 className="h-4 w-4" />}
                  label="Angular Services"
                />
                <TabButton
                  active={settingsTab === "mocks"}
                  onClick={() => setSettingsTab("mocks")}
                  icon={<FlaskConical className="h-4 w-4" />}
                  label="Mocks"
                />
              </div>

              {settingsTab === "contracts" ? (
                <>
                  <p className="mb-3 text-xs text-slate-400">
                    These options affect generated TypeScript models and also influence service/mocks via model shape.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field label="Root Model (JSON input)">
                      <input
                        value={rootModelName}
                        onChange={(event) => setRootModelName(event.target.value)}
                        className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
                      />
                    </Field>
                    <Field label="Prefix">
                      <input
                        value={config.modelPrefix}
                        onChange={(event) => updateConfig("modelPrefix", event.target.value)}
                        className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
                      />
                    </Field>
                    <Field label="Type Output">
                      <select
                        value={config.tsOutputKind}
                        onChange={(event) => updateConfig("tsOutputKind", event.target.value as TsOutputKind)}
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
                        onChange={(event) =>
                          updateConfig("dateMapping", event.target.value as EngineConfig["dateMapping"])
                        }
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
                      onChange={(checked) => updateConfig("camelCaseProperties", checked)}
                      label="camelCase properties"
                    />
                    <Toggle
                      checked={config.nullableAsUnion}
                      onChange={(checked) => updateConfig("nullableAsUnion", checked)}
                      label="Nullable union"
                    />
                  </div>
                </>
              ) : null}

              {settingsTab === "service" ? (
                <>
                  <p className="mb-3 text-xs text-slate-400">
                    These options affect Angular service generation only.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field label="Injection">
                      <select
                        value={config.injectionStyle}
                        onChange={(event) =>
                          updateConfig("injectionStyle", event.target.value as EngineConfig["injectionStyle"])
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
                        onChange={(event) => updateConfig("apiUrlPattern", event.target.value)}
                        className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
                      />
                    </Field>
                    <Field label="Service Suffix">
                      <input
                        value={config.serviceSuffix}
                        onChange={(event) => updateConfig("serviceSuffix", event.target.value)}
                        className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
                      />
                    </Field>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                    <Toggle
                      checked={config.serviceUseSignals}
                      onChange={(checked) => updateConfig("serviceUseSignals", checked)}
                      label="Angular Signals"
                    />
                  </div>
                </>
              ) : null}

              {settingsTab === "mocks" ? (
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
        </div>
      ) : null}
    </main>
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

function TabButton({
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
