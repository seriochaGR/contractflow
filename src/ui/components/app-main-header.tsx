import { Play, Settings2 } from "lucide-react";

interface AppMainHeaderProps {
  isLoading: boolean;
  showSettings: boolean;
  onGenerate: () => void;
  onToggleSettings: () => void;
}

export function AppMainHeader({
  isLoading,
  showSettings,
  onGenerate,
  onToggleSettings
}: AppMainHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <img src="/logo.svg" alt="ContractFlow" className="mb-2 h-9 w-auto md:h-10" />
        <p className="text-sm text-slate-300">
          VS Code style transpiler for C#, JSON, TypeScript contracts, Angular services, and mocks.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleSettings}
          className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
            showSettings
              ? "border-cyan-300/40 bg-cyan-400/15 text-cyan-200"
              : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600"
          }`}
        >
          <Settings2 className="h-4 w-4" />
          Settings
        </button>
        <button
          type="button"
          onClick={onGenerate}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-900 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Play className="h-4 w-4" />
          {isLoading ? "Generating..." : "Generate"}
        </button>
      </div>
    </div>
  );
}
