import Link from "next/link";

export function GlobalSiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-cyan-400/20 bg-slate-950/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-4 md:px-6">
        <Link href="/" className="inline-flex items-center gap-3">
          <img src="/logo.svg" alt="ContractFlow" className="h-8 w-auto md:h-9" />
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-2 text-sm text-slate-300">
          <span className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5">
            Projects coming soon
          </span>
        </nav>
      </div>
    </header>
  );
}
