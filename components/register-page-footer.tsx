"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function RegisterPageFooter() {
  const searchParams = useSearchParams();
  const fromPayment = searchParams.get("from") === "payment";
  const type = searchParams.get("type");
  const redirect = searchParams.get("redirect");
  const email = searchParams.get("email");
  const loginRedirect =
    redirect
      ? redirect
      : fromPayment && type === "appointment"
        ? "/appointments/manage?tab=my-bookings"
        : fromPayment && type === "course"
          ? "/courses/manage"
          : undefined;
  const loginHref = loginRedirect
    ? `/login?redirect=${encodeURIComponent(loginRedirect)}${email ? `&email=${encodeURIComponent(email)}` : ""}`
    : "/login";

  return (
    <p className="text-center mt-6 text-text-secondary">
      Already have an account?{" "}
      <Link href={loginHref} className="text-cyber-green font-semibold hover:text-white hover:underline">
        Sign in
      </Link>
    </p>
  );
}
