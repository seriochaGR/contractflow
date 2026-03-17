"use client";

import dynamic from "next/dynamic";
import { ChangeEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Braces, Check, Code2, Copy, FileCode2, FlaskConical, Settings2, Upload } from "lucide-react";
import { AngularCrudComponentArtifacts, defaultEngineConfig, EngineConfig, SourceType } from "@/domain/types";
import type { UsageMetricEventName, UsageMetricOutputKey } from "@/domain/usage-metrics";
import { AppMainHeader } from "@/ui/components/app-main-header";
import {
  ConventionsConfigPanel,
  SettingsPanelContent,
  SettingsTab
} from "@/ui/components/conventions-config-panel";
import { useProjectConfig } from "@/ui/providers/project-config-provider";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface EngineResponse {
  typescript: string;
  angularService: string;
  angularServiceDependencies: string;
  angularMockService: string;
  angularCrudComponents: AngularCrudComponentArtifacts;
  jsonMocks: string;
}

type OutputTab = "typescript" | "service" | "serviceDependencies" | "serviceMock" | "components" | "mocks";
type CrudComponentView = "list" | "form";
type CopyTarget = "main" | "componentTs" | "componentHtml" | null;

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

const EMPTY_CRUD_COMPONENTS: AngularCrudComponentArtifacts = {
  listTs: "// CRUD list component output",
  listHtml: "<!-- CRUD list template output -->",
  formTs: "// CRUD form component output",
  formHtml: "<!-- CRUD form template output -->"
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
  const { angularVersion } = useProjectConfig();
  const [sourceType, setSourceType] = useState<SourceType>("csharp");
  const [input, setInput] = useState(EXAMPLES.csharp);
  const [rootModelName, setRootModelName] = useState("RootModel");
  const [config, setConfig] = useState<EngineConfig>(defaultEngineConfig);
  const [output, setOutput] = useState<EngineResponse | null>(null);
  const [outputTab, setOutputTab] = useState<OutputTab>("typescript");
  const [crudComponentView, setCrudComponentView] = useState<CrudComponentView>("list");
  const [showSettings, setShowSettings] = useState(false);
  const [isOutputRailExpanded, setIsOutputRailExpanded] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("contracts");
  const [error, setError] = useState("");
  const [notification, setNotification] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [copiedTarget, setCopiedTarget] = useState<CopyTarget>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setConfig((prev) => (prev.angularVersion === angularVersion ? prev : { ...prev, angularVersion }));
  }, [angularVersion]);

  useEffect(() => {
    if (!notification || notification.kind !== "success") return;
    const timeoutId = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timeoutId);
  }, [notification]);

  useEffect(() => {
    if (!copiedTarget) return;
    const timeoutId = setTimeout(() => setCopiedTarget(null), 1500);
    return () => clearTimeout(timeoutId);
  }, [copiedTarget]);

  const enabledOutputTabs = useMemo(() => {
    const tabs: OutputTab[] = [];
    if (config.enableContracts) tabs.push("typescript");
    if (config.enableServices) tabs.push("service");
    if (config.enableServices) tabs.push("serviceDependencies");
    if (config.enableServices) tabs.push("serviceMock");
    if (config.enableComponents) tabs.push("components");
    if (config.enableMocks) tabs.push("mocks");
    return tabs;
  }, [config.enableContracts, config.enableServices, config.enableComponents, config.enableMocks]);

  const outputTabs = useMemo(
    () =>
      [
        { key: "typescript" as OutputTab, label: "Contracts", icon: <Braces className="h-4 w-4" />, enabled: config.enableContracts },
        { key: "service" as OutputTab, label: "Service", icon: <Code2 className="h-4 w-4" />, enabled: config.enableServices },
        {
          key: "serviceDependencies" as OutputTab,
          label: "Dependencies",
          icon: <Code2 className="h-4 w-4" />,
          enabled: config.enableServices
        },
        {
          key: "serviceMock" as OutputTab,
          label: "Mock Service",
          icon: <FlaskConical className="h-4 w-4" />,
          enabled: config.enableServices
        },
        {
          key: "components" as OutputTab,
          label: "CRUD Components",
          icon: <Code2 className="h-4 w-4" />,
          enabled: config.enableComponents
        },
        { key: "mocks" as OutputTab, label: "JSON Mocks", icon: <FlaskConical className="h-4 w-4" />, enabled: config.enableMocks }
      ].filter((tab) => tab.enabled),
    [config.enableContracts, config.enableServices, config.enableComponents, config.enableMocks]
  );

  const enabledSettingsTabs = useMemo(() => {
    const tabs: SettingsTab[] = [];
    if (config.enableContracts) tabs.push("contracts");
    if (config.enableServices) tabs.push("service");
    if (config.enableServices) tabs.push("serviceMock");
    if (config.enableComponents) tabs.push("components");
    if (config.enableMocks) tabs.push("mocks");
    return tabs;
  }, [config.enableContracts, config.enableServices, config.enableComponents, config.enableMocks]);

  const selectedOutputTab = outputTabs.find((tab) => tab.key === outputTab) ?? outputTabs[0] ?? null;
  const headerIcon = showSettings ? <Settings2 className="h-4 w-4" /> : selectedOutputTab?.icon;
  const headerLabel = showSettings ? "Settings" : (selectedOutputTab?.label ?? "Output");

  useEffect(() => {
    if (enabledOutputTabs.length === 0) return;
    if (!enabledOutputTabs.includes(outputTab)) setOutputTab(enabledOutputTabs[0]);
  }, [enabledOutputTabs, outputTab]);

  useEffect(() => {
    if (enabledSettingsTabs.length === 0) return;
    if (!enabledSettingsTabs.includes(settingsTab)) setSettingsTab(enabledSettingsTabs[0]);
  }, [enabledSettingsTabs, settingsTab]);

  const crudComponents = output?.angularCrudComponents ?? EMPTY_CRUD_COMPONENTS;
  const selectedCrudOutput =
    crudComponentView === "list"
      ? { title: "List Component", ts: crudComponents.listTs, html: crudComponents.listHtml }
      : { title: "Form Component", ts: crudComponents.formTs, html: crudComponents.formHtml };

  const outputValue =
    enabledOutputTabs.length === 0
      ? "// Enable at least one output section in Settings."
      : outputTab === "typescript"
        ? output?.typescript ?? "// TypeScript output"
        : outputTab === "service"
          ? output?.angularService ?? "// Angular service output"
          : outputTab === "serviceDependencies"
            ? output?.angularServiceDependencies ?? "// Angular service dependencies output"
            : outputTab === "serviceMock"
              ? output?.angularMockService ?? "// Angular mock service output"
              : output?.jsonMocks ?? "// JSON mocks output";

  const outputLanguage = outputTab === "mocks" ? "json" : "typescript";
  const inputLanguage = sourceType === "json" ? "json" : "csharp";

  async function trackMetric(
    name: UsageMetricEventName,
    details: Partial<{ sourceType: SourceType; output: UsageMetricOutputKey }> = {}
  ) {
    try {
      await fetch("/api/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, ...details })
      });
    } catch {
      // Metrics must not block the main UX.
    }
  }

  async function runGeneration() {
    if (!config.enableContracts && !config.enableServices && !config.enableComponents && !config.enableMocks) {
      const message = "Enable at least one output section (contracts, services, components, or mocks) in Settings.";
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
        angularServiceDependencies: payload.angularServiceDependencies,
        angularMockService: payload.angularMockService,
        angularCrudComponents: payload.angularCrudComponents ?? EMPTY_CRUD_COMPONENTS,
        jsonMocks: payload.jsonMocks
      });
      const enabledNames = [
        config.enableContracts ? "TypeScript contracts" : null,
        config.enableServices ? "Angular service" : null,
        config.enableServices ? "Angular mock service" : null,
        config.enableComponents ? "CRUD components" : null,
        config.enableMocks ? "JSON mocks" : null
      ].filter(Boolean);
      setNotification({ kind: "success", message: `Generation completed: ${enabledNames.join(", ")} ready.` });
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
    file.text().then((text) => {
      setInput(text);
      void trackMetric("input_uploaded", { sourceType });
    });
  }

  function loadExample(nextType: SourceType) {
    setSourceType(nextType);
    setInput(nextType === "csharp" ? EXAMPLES.csharp : EXAMPLES.json);
  }

  function updateConfig<K extends keyof EngineConfig>(key: K, value: EngineConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  async function copyValue(target: CopyTarget, value: string) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopiedTarget(target);
    if (target === "main") {
      void trackMetric("output_copied", { output: outputTab as UsageMetricOutputKey });
      return;
    }
    void trackMetric("output_copied", { output: "components" });
  }

  function selectOutput(tab: OutputTab) {
    setOutputTab(tab);
    setShowSettings(false);
    setIsOutputRailExpanded(false);
    void trackMetric("output_selected", { output: tab as UsageMetricOutputKey });
  }

  return (
    <main className="mx-auto flex h-[calc(100vh-4rem)] max-w-[1600px] flex-col overflow-hidden px-4 py-4 md:px-6">
      <section className="animate-rise mb-4 rounded-2xl border border-cyan-400/25 bg-panel/90 p-4 shadow-glow backdrop-blur-xl">
        <AppMainHeader isLoading={isLoading} onGenerate={runGeneration} />
        <ConventionsConfigPanel config={config} notification={notification} />
      </section>

      <section className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)]">
        <article className="flex min-h-0 flex-col rounded-2xl border border-slate-800 bg-panel/90 p-3 backdrop-blur-xl">
          <div className="mb-3 flex min-h-11 flex-wrap items-center justify-between gap-2">
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
          <div className="mb-3 flex min-h-11 min-w-0 items-center gap-2 text-sm font-semibold text-slate-100">
            {headerIcon}
            <span className="truncate">{headerLabel}</span>
          </div>

          <div className="relative min-h-0 flex flex-1 overflow-hidden rounded-lg border border-slate-800">
            <div className="relative min-w-0 flex-1 overflow-hidden">
              {!showSettings && outputTab !== "components" ? (
                <button
                  type="button"
                  onClick={() => void copyValue("main", outputValue)}
                  className="absolute right-16 top-3 z-10 inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900/90 px-2.5 py-1.5 text-xs text-slate-200 shadow-sm hover:border-slate-500"
                >
                  {copiedTarget === "main" ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedTarget === "main" ? "Copied" : "Copy"}
                </button>
              ) : null}

              {showSettings ? (
                <div className="h-full" />
              ) : outputTab === "components" ? (
                <div className="flex h-full min-h-0 flex-col bg-slate-950/60">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-3 py-2">
                    <div className="inline-flex rounded-lg border border-slate-700 bg-slate-900/80 p-1 text-sm">
                      <button
                        type="button"
                        onClick={() => setCrudComponentView("list")}
                        className={`rounded-md px-3 py-1.5 ${crudComponentView === "list" ? "bg-cyan-400 text-slate-950" : "text-slate-300"}`}
                      >
                        List Component
                      </button>
                      <button
                        type="button"
                        onClick={() => setCrudComponentView("form")}
                        className={`rounded-md px-3 py-1.5 ${crudComponentView === "form" ? "bg-cyan-400 text-slate-950" : "text-slate-300"}`}
                      >
                        Form Component
                      </button>
                    </div>
                    <div className="text-xs text-slate-400">{selectedCrudOutput.title}</div>
                  </div>

                  <div className="grid min-h-0 flex-1 gap-px bg-slate-800 lg:grid-cols-2">
                    <SplitEditorPane
                      label={`${contextualFilename(crudComponentView, "ts")}`}
                      language="typescript"
                      value={selectedCrudOutput.ts}
                      copied={copiedTarget === "componentTs"}
                      onCopy={() => void copyValue("componentTs", selectedCrudOutput.ts)}
                    />
                    <SplitEditorPane
                      label={`${contextualFilename(crudComponentView, "html")}`}
                      language="html"
                      value={selectedCrudOutput.html}
                      copied={copiedTarget === "componentHtml"}
                      onCopy={() => void copyValue("componentHtml", selectedCrudOutput.html)}
                    />
                  </div>
                </div>
              ) : (
                <MonacoEditor
                  height="100%"
                  language={outputLanguage}
                  theme="vs-dark"
                  value={outputValue}
                  options={{ ...editorOptions, readOnly: true }}
                />
              )}
            </div>

            {showSettings ? (
              <aside className="absolute inset-y-0 right-0 z-20 flex w-[30rem] max-w-[92vw] border-l border-slate-800 bg-slate-950/95 shadow-[-12px_0_24px_rgba(15,23,42,0.28)]">
                <div className="min-w-0 flex-1 border-r border-slate-800 bg-panel/95">
                  <div className="flex h-full flex-col">
                    <div className="border-b border-slate-800 px-4 py-3">
                      <h2 className="flex items-center gap-2 text-sm font-semibold text-cyan-200">
                        <Settings2 className="h-4 w-4" /> Configuration
                      </h2>
                      <p className="mt-1 text-xs text-slate-400">Adjust generation rules without leaving the output context.</p>
                    </div>
                    <div className="tool-scroll flex-1 overflow-y-auto p-4">
                      <SettingsPanelContent
                        config={config}
                        rootModelName={rootModelName}
                        settingsTab={settingsTab}
                        error={error}
                        onRootModelNameChange={setRootModelName}
                        onSettingsTabChange={setSettingsTab}
                        onUpdateConfig={updateConfig}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex w-14 shrink-0 flex-col gap-2 bg-slate-950/90 p-2">
                  <div className="flex flex-1 flex-col gap-1">
                    {outputTabs.map((tab) => (
                      <SidebarRailButton
                        key={tab.key}
                        active={false}
                        onClick={() => selectOutput(tab.key)}
                        icon={tab.icon}
                        label={tab.label}
                        expanded={false}
                      />
                    ))}
                  </div>
                  <SidebarRailButton
                    active
                    onClick={() => setShowSettings(false)}
                    icon={<Settings2 className="h-4 w-4" />}
                    label="Settings"
                    alignBottom
                    expanded
                  />
                </div>
              </aside>
            ) : (
              <>
                <div
                  className="absolute inset-y-0 right-0 z-20 w-14"
                  onMouseEnter={() => setIsOutputRailExpanded(true)}
                  onMouseLeave={() => setIsOutputRailExpanded(false)}
                >
                  <div className="flex h-full w-14 flex-col gap-2 border-l border-slate-800 bg-slate-950/95 p-2 shadow-[-12px_0_24px_rgba(15,23,42,0.28)]">
                    <div className="flex flex-1 flex-col gap-1">
                      {outputTabs.map((tab) => (
                        <SidebarRailButton
                          key={tab.key}
                          active={outputTab === tab.key}
                          onClick={() => selectOutput(tab.key)}
                          icon={tab.icon}
                          label={tab.label}
                          expanded={false}
                        />
                      ))}
                    </div>
                    <SidebarRailButton
                      active={false}
                      onClick={() => {
                        setShowSettings(true);
                        void trackMetric("settings_opened");
                      }}
                      icon={<Settings2 className="h-4 w-4" />}
                      label="Settings"
                      alignBottom
                      expanded={false}
                    />
                  </div>
                </div>

                {isOutputRailExpanded ? (
                  <div
                    className="absolute inset-y-2 right-14 z-30 w-44 rounded-l-xl border border-r-0 border-slate-800 bg-slate-950/98 p-2 shadow-[-16px_0_30px_rgba(15,23,42,0.34)]"
                    onMouseEnter={() => setIsOutputRailExpanded(true)}
                    onMouseLeave={() => setIsOutputRailExpanded(false)}
                  >
                    <div className="flex h-full flex-col gap-1">
                      {outputTabs.map((tab) => (
                        <SidebarRailButton
                          key={tab.key}
                          active={outputTab === tab.key}
                          onClick={() => selectOutput(tab.key)}
                          icon={tab.icon}
                          label={tab.label}
                          expanded
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}

function SplitEditorPane({
  label,
  language,
  value,
  copied,
  onCopy
}: {
  label: string;
  language: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="min-h-0 flex flex-col overflow-hidden bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2 text-xs text-slate-400">
        <span>{label}</span>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900/90 px-2 py-1 text-slate-200 hover:border-slate-500"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <MonacoEditor
          height="100%"
          language={language}
          theme="vs-dark"
          value={value}
          options={{ ...editorOptions, readOnly: true }}
        />
      </div>
    </div>
  );
}

function contextualFilename(view: CrudComponentView, extension: "ts" | "html") {
  return view === "list" ? `list.component.${extension}` : `form.component.${extension}`;
}

function SidebarRailButton({
  active,
  onClick,
  icon,
  label,
  alignBottom = false,
  expanded = false
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  alignBottom?: boolean;
  expanded?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-pressed={active}
      className={`flex h-10 w-full items-center overflow-hidden rounded-lg border px-3 text-sm transition ${expanded ? "justify-start gap-3" : "justify-center gap-0"} ${alignBottom ? "mt-auto" : ""} ${active
        ? "border-cyan-300/40 bg-cyan-400/15 text-cyan-200"
        : "border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-600 hover:text-slate-100"
      }`}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>
      <span
        className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-150 ${expanded ? "max-w-[10rem] opacity-100" : "max-w-0 opacity-0"}`}
      >
        {label}
      </span>
    </button>
  );
}
