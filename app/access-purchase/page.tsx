"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Navigation } from "@/components/navigation";

function AccessPurchaseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email")?.trim();
  const type = searchParams.get("type") || "course";

  const [checking, setChecking] = useState(true);
  const [hasAccount, setHasAccount] = useState(false);
  const [formData, setFormData] = useState({ name: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const dest = type === "appointment" ? "/appointments/manage?tab=my-bookings" : "/courses/manage";
  const completePurchaseUrl = `/complete-purchase?dest=${encodeURIComponent(dest)}`;
  const loginHref = `/login?redirect=${encodeURIComponent(completePurchaseUrl)}&email=${encodeURIComponent(email || "")}`;

  useEffect(() => {
    if (!email) {
      router.push("/");
      return;
    }
    fetch(`/api/check-email?email=${encodeURIComponent(email)}`)
      .then((res) => res.json())
      .then((data) => {
        setHasAccount(!!data.exists);
      })
      .catch(() => setHasAccount(false))
      .finally(() => setChecking(false));
  }, [email, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email!,
        password: formData.password,
        options: { data: { name: formData.name } },
      });

      if (signUpError) {
        setError(signUpError.message || "Registration failed. Please try again.");
        return;
      }

      if (authData.user) {
        let defaultCountryId = null;
        try {
          const { data: defaultCountry } = await supabase
            .from("countries")
            .select("id")
            .or("name.eq.Remote,code.eq.HK")
            .limit(1)
            .maybeSingle();
          defaultCountryId = defaultCountry?.id || null;
        } catch {
          /* ignore */
        }

        const profileData: Record<string, unknown> = {
          id: authData.user.id,
          name: formData.name,
          email: email,
        };
        if (defaultCountryId) (profileData as any).country_id = defaultCountryId;

        const { error: profileError } = await supabase.from("profiles").upsert(profileData, { onConflict: "id" });
        if (profileError) {
          console.warn("Profile upsert error (trigger may have created it):", profileError);
        }

        fetch("/api/send-registration-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userEmail: email, userName: formData.name }),
        }).catch(() => {});

        const res = await fetch("/api/fulfill-pending-purchases", { method: "POST" });
        const data = await res.json();
        const fulfilledType = data?.fulfilled?.appointments?.length ? "appointment" : data?.fulfilled?.courses?.length ? "course" : null;
        const redirectDest = fulfilledType === "appointment" ? "/appointments/manage?tab=my-bookings" : "/courses/manage";

        router.push(redirectDest);
        router.refresh();
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!email) return null;

  return (
    <div className="min-h-screen bg-custom-bg">
      <Navigation />
      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <Link href="/" className="text-3xl font-bold text-cyber-green inline-block mb-2">
              Sito
            </Link>
            <h1 className="text-3xl font-bold text-custom-text mb-2">Access Your Purchase</h1>
            <p className="text-text-secondary">
              {type === "appointment" ? "Sign in or create an account to view your booking." : "Sign in or create an account to access your course."}
            </p>
          </div>

          {checking ? (
            <div className="text-center py-12 text-text-secondary animate-pulse">Checking...</div>
          ) : hasAccount ? (
            <div className="bg-surface border border-border-default p-8 rounded-xl shadow-2xl text-center">
              <p className="text-custom-text mb-6">You already have an account. Sign in to access your purchase.</p>
              <Link
                href={loginHref}
                className="block w-full py-3 bg-cyber-green text-slate-900 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
              >
                Sign In
              </Link>
              <p className="mt-4 text-sm text-text-secondary">
                We&apos;ll add your {type === "appointment" ? "booking" : "course"} to your account when you sign in.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-surface border border-border-default p-8 rounded-xl shadow-2xl">
              <p className="text-custom-text mb-6">Create a password to access your purchase.</p>
              {error && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 text-red-200 rounded-md text-sm">{error}</div>
              )}
              <div className="mb-4">
                <label className="block text-sm font-medium text-text-primary mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full px-4 py-2 bg-custom-bg/50 border border-border-default rounded-md text-text-secondary cursor-not-allowed"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-text-primary mb-2">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                  required
                  className="w-full px-4 py-2 bg-custom-bg border border-border-default rounded-md text-text-primary"
                  placeholder="John Doe"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-text-primary mb-2">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData((f) => ({ ...f, password: e.target.value }))}
                  required
                  minLength={8}
                  className="w-full px-4 py-2 bg-custom-bg border border-border-default rounded-md text-text-primary"
                  placeholder="••••••••"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-text-primary mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData((f) => ({ ...f, confirmPassword: e.target.value }))}
                  required
                  minLength={8}
                  className="w-full px-4 py-2 bg-custom-bg border border-border-default rounded-md text-text-primary"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-cyber-green text-slate-900 font-semibold rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {loading ? "Creating account..." : "Create Account & Access"}
              </button>
            </form>
          )}

          <p className="text-center mt-6 text-text-secondary text-sm">
            {hasAccount ? (
              <>Don&apos;t remember your password?{" "}
                <Link href="/login?reset=1" className="text-cyber-green hover:underline">Reset it</Link>
              </>
            ) : (
              <>Already have an account?{" "}
                <Link href={loginHref} className="text-cyber-green font-semibold hover:underline">Sign in</Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AccessPurchasePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-custom-bg flex items-center justify-center">
        <div className="text-text-secondary animate-pulse">Loading...</div>
      </div>
    }>
      <AccessPurchaseContent />
    </Suspense>
  );
}
