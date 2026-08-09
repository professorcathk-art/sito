"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SplitAuthShell } from "@/components/auth/split-auth-shell";
import { AuthModeToggle } from "@/components/auth/auth-mode-toggle";
import { LoginForm } from "@/components/login-form";

function LoginPageContent() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const email = searchParams.get("email");

  return (
    <SplitAuthShell>
      <AuthModeToggle mode="signin" redirect={redirect} email={email} />
      <h2 className="mb-1 text-2xl font-semibold tracking-tight text-white">Welcome back</h2>
      <p className="mb-6 text-sm text-slate-400">Sign in to continue to your dashboard</p>
      <LoginForm
        redirect={redirect || undefined}
        email={email || undefined}
        embedded
      />
    </SplitAuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
          Loading…
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
