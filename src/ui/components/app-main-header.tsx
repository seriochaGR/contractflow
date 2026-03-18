import { Play } from "lucide-react";

interface AppMainHeaderProps {
  isLoading: boolean;
  onGenerate: () => void;
}

export function AppMainHeader({ isLoading, onGenerate }: AppMainHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-cyan-200">ContractFlow Studio</h1>
        <p className="text-sm text-slate-300">Tool for C#, JSON, TypeScript contracts, services, components, and mocks.</p>
      </div>
      <div className="flex items-center gap-2">
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


