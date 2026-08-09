import { Suspense } from "react";
import { SplitAuthShell } from "@/components/auth/split-auth-shell";
import { AuthModeToggle } from "@/components/auth/auth-mode-toggle";
import { RegisterForm } from "@/components/register-form";
import { SignupQueryBridge } from "@/components/auth/signup-query-bridge";

export default function SignupPage() {
  return (
    <SplitAuthShell>
      <Suspense fallback={<div className="animate-pulse text-slate-500 py-8">Loading…</div>}>
        <SignupQueryBridge />
        <h2 className="mb-1 text-2xl font-semibold tracking-tight text-white">Create your account</h2>
        <p className="mb-6 text-sm text-slate-400">Start learning or launch your storefront</p>
        <RegisterForm embedded />
      </Suspense>
    </SplitAuthShell>
  );
}
