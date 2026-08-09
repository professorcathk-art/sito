"use client";

import { useSearchParams } from "next/navigation";
import { AuthModeToggle } from "@/components/auth/auth-mode-toggle";

/** Reads query params for the signup toggle (must be under Suspense). */
export function SignupQueryBridge() {
  const searchParams = useSearchParams();
  return (
    <AuthModeToggle
      mode="signup"
      redirect={searchParams.get("redirect")}
      email={searchParams.get("email")}
    />
  );
}
