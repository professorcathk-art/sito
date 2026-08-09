"use client";

import Link from "next/link";

export function AuthModeToggle({
  mode,
  redirect,
  email,
}: {
  mode: "signin" | "signup";
  redirect?: string | null;
  email?: string | null;
}) {
  const qs = new URLSearchParams();
  if (redirect) qs.set("redirect", redirect);
  if (email) qs.set("email", email);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  return (
    <div className="mb-6 grid grid-cols-2 rounded-xl border border-slate-800 bg-slate-950/80 p-1">
      <Link
        href={`/login${suffix}`}
        className={`rounded-lg py-2.5 text-center text-sm font-semibold transition-colors ${
          mode === "signin"
            ? "bg-slate-100 text-slate-950 shadow-sm"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        Sign In
      </Link>
      <Link
        href={`/signup${suffix}`}
        className={`rounded-lg py-2.5 text-center text-sm font-semibold transition-colors ${
          mode === "signup"
            ? "bg-slate-100 text-slate-950 shadow-sm"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        Create Account
      </Link>
    </div>
  );
}
