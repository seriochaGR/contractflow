"use client";

import dynamic from "next/dynamic";
import { ChangeEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Braces, Check, Code2, Copy, FileCode2, FlaskConical, Settings2, Upload } from "lucide-react";
import { defaultEngineConfig, EngineConfig, SourceType } from "@/domain/types";
import { AppMainHeader } from "@/ui/components/app-main-header";
import {
  ConventionsConfigPanel,
  SettingsPopoverPanel,
  SettingsTab
} from "@/ui/components/conventions-config-panel";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface EngineResponse {
  typescript: string;
  angularService: string;
  jsonMocks: string;
}

type OutputTab = "typescript" | "service" | "mocks";

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
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!notification || notification.kind !== "success") return;
    const timeoutId = setTimeout(() => {
      setNotification(null);
    }, 4000);
    return () => clearTimeout(timeoutId);
  }, [notification]);

  useEffect(() => {
    if (!copied) return;
    const timeoutId = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timeoutId);
  }, [copied]);

  const enabledOutputTabs = useMemo(() => {
    const tabs: OutputTab[] = [];
    if (config.enableContracts) tabs.push("typescript");
    if (config.enableServices) tabs.push("service");
    if (config.enableMocks) tabs.push("mocks");
    return tabs;
  }, [config.enableContracts, config.enableServices, config.enableMocks]);
  const outputTabs = useMemo(
    () =>
      [
        {
          key: "typescript" as OutputTab,
          label: "Contracts",
          icon: <Braces className="h-4 w-4" />,
          enabled: config.enableContracts
        },
        {
          key: "service" as OutputTab,
          label: "Angular Service",
          icon: <Code2 className="h-4 w-4" />,
          enabled: config.enableServices
        },
        {
          key: "mocks" as OutputTab,
          label: "JSON Mocks",
          icon: <FlaskConical className="h-4 w-4" />,
          enabled: config.enableMocks
        }
      ].filter((tab) => tab.enabled),
    [config.enableContracts, config.enableServices, config.enableMocks]
  );
  const enabledSettingsTabs = useMemo(() => {
    const tabs: SettingsTab[] = [];
    if (config.enableContracts) tabs.push("contracts");
    if (config.enableServices) tabs.push("service");
    if (config.enableMocks) tabs.push("mocks");
    return tabs;
  }, [config.enableContracts, config.enableServices, config.enableMocks]);

  useEffect(() => {
    if (enabledOutputTabs.length === 0) return;
    if (!enabledOutputTabs.includes(outputTab)) {
      setOutputTab(enabledOutputTabs[0]);
    }
  }, [enabledOutputTabs, outputTab]);

  useEffect(() => {
    if (enabledSettingsTabs.length === 0) return;
    if (!enabledSettingsTabs.includes(settingsTab)) {
      setSettingsTab(enabledSettingsTabs[0]);
    }
  }, [enabledSettingsTabs, settingsTab]);

  const outputValue =
    enabledOutputTabs.length === 0
      ? "// Enable at least one output section in Settings."
      : outputTab === "typescript"
        ? output?.typescript ?? "// TypeScript output"
        : outputTab === "service"
          ? output?.angularService ?? "// Angular service output"
          : output?.jsonMocks ?? "// JSON mocks output";
  const outputLanguage = outputTab === "mocks" ? "json" : "typescript";
  const inputLanguage = sourceType === "json" ? "json" : "csharp";

  async function runGeneration() {
    if (!config.enableContracts && !config.enableServices && !config.enableMocks) {
      const message = "Enable at least one output section (contracts, services, or mocks) in Settings.";
      setError(message);
      setNotification({ kind: "error", message });
      return;
    }

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
      const enabledNames = [
        config.enableContracts ? "TypeScript contracts" : null,
        config.enableServices ? "Angular service" : null,
        config.enableMocks ? "JSON mocks" : null
      ].filter(Boolean);
      setNotification({
        kind: "success",
        message: `Generation completed: ${enabledNames.join(", ")} ready.`
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

  async function copyCurrentOutput() {
    if (!outputValue) return;
    await navigator.clipboard.writeText(outputValue);
    setCopied(true);
  }

  return (
    <main className="mx-auto flex h-[calc(100vh-4rem)] max-w-[1600px] flex-col overflow-hidden px-4 py-4 md:px-6">
      <section className="animate-rise mb-4 rounded-2xl border border-cyan-400/25 bg-panel/90 p-4 shadow-glow backdrop-blur-xl">
        <AppMainHeader isLoading={isLoading} onGenerate={runGeneration} />
        <ConventionsConfigPanel
          config={config}
          notification={notification}
        />
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
            {outputTabs.map((tab) => (
              <TabButton
                key={tab.key}
                active={outputTab === tab.key}
                onClick={() => setOutputTab(tab.key)}
                icon={tab.icon}
                label={tab.label}
              />
            ))}
            <div className="relative ml-auto">
              <button
                type="button"
                onClick={() => setShowSettings((prev) => !prev)}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${showSettings
                    ? "border-cyan-300/40 bg-cyan-400/15 text-cyan-200"
                    : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600"
                  }`}
              >
                <Settings2 className="h-4 w-4" />
                Settings
              </button>
              <SettingsPopoverPanel
                config={config}
                rootModelName={rootModelName}
                showSettings={showSettings}
                settingsTab={settingsTab}
                error={error}
                onCloseSettings={() => setShowSettings(false)}
                onRootModelNameChange={setRootModelName}
                onSettingsTabChange={setSettingsTab}
                onUpdateConfig={updateConfig}
              />
            </div>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={copyCurrentOutput}
              className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900/90 px-2.5 py-1.5 text-xs text-slate-200 shadow-sm hover:border-slate-500"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
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

    </main>
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
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition ${active
          ? "border-cyan-300/40 bg-cyan-400/15 text-cyan-200"
          : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600"
        }`}
    >
      {icon}
      {label}
    </button>
  );
}
