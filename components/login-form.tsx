"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({
  redirect,
  email: initialEmail,
  embedded = false,
}: {
  redirect?: string;
  email?: string;
  embedded?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail || "");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleGoogle = async () => {
    const redirectUrl = redirect ? decodeURIComponent(redirect) : "/dashboard";
    const fullRedirect = redirectUrl.startsWith("http")
      ? redirectUrl
      : `${window.location.origin}${redirectUrl.startsWith("/") ? "" : "/"}${redirectUrl}`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: fullRedirect },
    });
    if (oauthError) setError(oauthError.message);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message || "Invalid email or password");
        return;
      }

      if (data.user) {
        const redirectUrl = redirect ? decodeURIComponent(redirect) : "/dashboard";
        router.push(redirectUrl);
        router.refresh();
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 bg-slate-950 border border-slate-700 text-slate-100 rounded-lg placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all";

  return (
    <div
      className={
        embedded
          ? "space-y-4"
          : "bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-2xl space-y-4"
      }
    >
      {error && (
        <div className="p-3 bg-red-900/30 border border-red-500/50 text-red-200 rounded-md text-sm">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogle}
        className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 py-3 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Continue with Google
      </button>

      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-800" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-slate-950 text-slate-500">or use email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-200 mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={inputClass}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-200 mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={inputClass}
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <p className="text-xs text-slate-500 text-center">
        By continuing, you agree to our{" "}
        <Link href="/terms" className="text-sky-400 hover:text-sky-300 underline font-medium">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-sky-400 hover:text-sky-300 underline font-medium">
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}

