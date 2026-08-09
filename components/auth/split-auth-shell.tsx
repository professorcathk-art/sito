import Link from "next/link";

export function SplitAuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-950">
      {/* Value showcase */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden border-r border-white/5 px-10 py-12 xl:px-14">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 10% 20%, rgba(56,189,248,0.18), transparent 55%), radial-gradient(ellipse 70% 50% at 90% 80%, rgba(99,102,241,0.16), transparent 50%), linear-gradient(160deg, #020617 0%, #0f172a 55%, #020617 100%)",
          }}
        />
        <div className="relative z-10">
          <Link href="/" className="text-2xl font-bold tracking-tight text-white">
            Sito
          </Link>
          <h1 className="mt-10 max-w-md text-4xl font-semibold tracking-tight text-white leading-[1.15]">
            One Account for Learning &amp; Building.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
            Learners and experts share the same login — switch between studying and selling anytime.
          </p>
        </div>

        <div className="relative z-10 mt-12 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-300/90">
              For Learners
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Access premium e-learning modules, download expert guides, and book 1-on-1
              consultations directly.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-300/90">
              For Experts
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Launch your digital storefront in 5 minutes, capture leads, and sell courses &amp;
              appointments globally.
            </p>
          </div>
        </div>

        <p className="relative z-10 mt-10 text-xs text-slate-500">
          Joined by verified practitioners worldwide
        </p>
      </aside>

      {/* Form column */}
      <main className="flex flex-col justify-center px-4 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden text-center">
            <Link href="/" className="text-2xl font-bold text-white">
              Sito
            </Link>
            <p className="mt-2 text-sm text-slate-400">One account for learning &amp; building</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
