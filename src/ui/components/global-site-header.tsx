"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FolderKanban, Layers3, X } from "lucide-react";
import { ANGULAR_VERSIONS } from "@/domain/angular-target";
import { useProjectConfig } from "@/ui/providers/project-config-provider";

export function GlobalSiteHeader() {
  const [isProjectPanelOpen, setIsProjectPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const {
    projectName,
    projectIdentifier,
    angularVersion,
    setProjectName,
    setProjectIdentifier,
    setAngularVersion
  } = useProjectConfig();

  useEffect(() => {
    if (!isProjectPanelOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setIsProjectPanelOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsProjectPanelOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isProjectPanelOpen]);

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-cyan-400/20 bg-slate-950/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-4 md:px-6">
        <Link href="/" className="inline-flex items-center gap-3">
          <img src="/logo.svg" alt="ContractFlow" className="h-8 w-auto md:h-9" />
        </Link>

        <div ref={panelRef} className="relative">
          <button
            type="button"
            aria-expanded={isProjectPanelOpen}
            aria-haspopup="dialog"
            onClick={() => setIsProjectPanelOpen((prev) => !prev)}
            className={`inline-flex items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition ${
              isProjectPanelOpen
                ? "border-cyan-300/40 bg-cyan-400/15 text-cyan-100"
                : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600"
            }`}
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950/80 text-cyan-300">
              <FolderKanban className="h-4 w-4" />
            </span>
            <span className="flex flex-col">
              <span className="font-medium leading-tight">{projectName || "Project setup"}</span>
              <span className="text-xs text-slate-400">Angular {angularVersion}</span>
            </span>
          </button>

          {isProjectPanelOpen ? (
            <div
              role="dialog"
              aria-label="Project setup"
              className="absolute right-0 top-full z-30 mt-2 w-[min(92vw,28rem)] rounded-2xl border border-cyan-400/25 bg-panel p-4 shadow-glow"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-semibold text-cyan-200">
                    <Layers3 className="h-4 w-4" />
                    Project setup
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Define the project identity and the Angular baseline for generated assets.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProjectPanelOpen(false)}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300 hover:border-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                  Close
                </button>
              </div>

              <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-3">
                <div className="grid gap-3">
                  <label className="text-xs text-slate-400">
                    <span className="mb-1 block">Project name</span>
                    <input
                      value={projectName}
                      onChange={(event) => setProjectName(event.target.value)}
                      placeholder="Acme Admin"
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    />
                  </label>

                  <label className="text-xs text-slate-400">
                    <span className="mb-1 block">Project identifier</span>
                    <input
                      value={projectIdentifier}
                      onChange={(event) => setProjectIdentifier(event.target.value)}
                      placeholder="acme-admin"
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    />
                  </label>

                  <label className="text-xs text-slate-400">
                    <span className="mb-1 block">Angular version</span>
                    <select
                      value={angularVersion}
                      onChange={(event) => setAngularVersion(event.target.value as (typeof ANGULAR_VERSIONS)[number])}
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    >
                      {ANGULAR_VERSIONS.map((version) => (
                        <option key={version} value={version}>
                          Angular {version}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Current target</p>
                  <p className="mt-2 text-sm font-semibold text-slate-100">{projectName || "Unnamed project"}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {projectIdentifier || "no-identifier"} · Angular {angularVersion}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
