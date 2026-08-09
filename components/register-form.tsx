"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function RegisterForm({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const email = searchParams.get("email");
    if (email) setFormData((f) => ({ ...f, email }));
  }, [searchParams]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const supabase = createClient();

  const checkEmailExists = async (emailToCheck: string) => {
    if (!emailToCheck || !emailToCheck.includes("@")) {
      setEmailExists(null);
      return;
    }
    try {
      const res = await fetch(`/api/check-email?email=${encodeURIComponent(emailToCheck)}`);
      const data = await res.json();
      setEmailExists(!!data.exists);
    } catch {
      setEmailExists(null);
    }
  };

  useEffect(() => {
    if (formData.email) {
      const t = setTimeout(() => checkEmailExists(formData.email), 500);
      return () => clearTimeout(t);
    } else {
      setEmailExists(null);
    }
  }, [formData.email]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (emailExists) {
      setError("An account with this email already exists. Please sign in instead.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      // Sign up with Supabase
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message || "Registration failed. Please try again.");
        return;
      }

      if (authData.user) {
        // Try to get default country_id (Remote or Hong Kong)
        // But don't fail if countries table doesn't exist - trigger will handle it
        let defaultCountryId = null;
        try {
          const { data: defaultCountry } = await supabase
            .from("countries")
            .select("id")
            .or("name.eq.Remote,code.eq.HK")
            .limit(1)
            .maybeSingle();
          
          defaultCountryId = defaultCountry?.id || null;
        } catch (err) {
          // Countries table might not exist - that's okay, trigger will handle it
          console.warn("Could not fetch country_id:", err);
        }

        // Create user profile in database
        // Include country_id if available, otherwise let trigger handle it
        const profileData: any = {
          id: authData.user.id,
          name: formData.name,
          email: formData.email,
        };
        
        if (defaultCountryId) {
          profileData.country_id = defaultCountryId;
        }

        const { error: profileError } = await supabase.from("profiles").insert(profileData);

        if (profileError) {
          console.error("Profile creation error:", profileError);
          // Continue anyway - profile can be created later via trigger
        }

        // Send registration email (don't wait for it to complete)
        fetch("/api/send-registration-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userEmail: formData.email,
            userName: formData.name,
          }),
        }).catch((err) => {
          console.error("Failed to send registration email:", err);
        });

        // Fulfill pending purchases (guest checkout)
        const fromPayment = searchParams.get("from") === "payment";
        let fulfilledType: "course" | "appointment" | null = null;
        if (fromPayment) {
          try {
            const res = await fetch("/api/fulfill-pending-purchases", { method: "POST" });
            const data = await res.json();
            if (data?.fulfilled) {
              if (data.fulfilled.appointments?.length > 0) fulfilledType = "appointment";
              else if (data.fulfilled.courses?.length > 0) fulfilledType = "course";
            }
          } catch (e) {
            console.warn("Fulfill pending failed:", e);
          }
        }

        const redirect = searchParams.get("redirect");
        const typeParam = searchParams.get("type");
        const intent = searchParams.get("intent");
        const intentQuery =
          intent === "learn" || intent === "teach" ? `?intent=${intent}` : "";
        if (fromPayment) {
          const dest = fulfilledType === "appointment" || typeParam === "appointment"
            ? "/dashboard/my-bookings"
            : "/courses/manage";
          router.push(redirect || dest);
        } else if (redirect) {
          router.push(redirect);
        } else {
          router.push(`/onboarding${intentQuery}`);
        }
        router.refresh();
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    const fromPayment = searchParams.get("from") === "payment";
    const typeParam = searchParams.get("type");
    const redirectParam = searchParams.get("redirect");
    const intent = searchParams.get("intent");
    const intentQuery = intent === "learn" || intent === "teach" ? `?intent=${intent}` : "";
    let oauthRedirect: string;
    if (redirectParam) {
      oauthRedirect = redirectParam;
    } else if (fromPayment) {
      const dest = typeParam === "appointment" ? "/dashboard/my-bookings" : "/courses/manage";
      oauthRedirect = `/complete-purchase?dest=${encodeURIComponent(dest)}`;
    } else {
      oauthRedirect = `/onboarding${intentQuery}`;
    }
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${oauthRedirect.startsWith("/") ? oauthRedirect : `/${oauthRedirect}`}`,
      },
    });
    if (oauthError) setError(oauthError.message);
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
          <label htmlFor="name" className="block text-sm font-medium text-slate-200 mb-2">
            Full Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            required
            className={inputClass}
            placeholder="John Doe"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-200 mb-2">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            className={inputClass}
            placeholder="you@example.com"
          />
          {emailExists && (
            <p className="mt-2 text-sm text-amber-400">
              An account with this email already exists.{" "}
              <Link
                href={`/login?redirect=${encodeURIComponent(searchParams.get("redirect") || "/dashboard")}&email=${encodeURIComponent(formData.email)}`}
                className="text-sky-400 font-semibold hover:underline"
              >
                Sign in instead
              </Link>
            </p>
          )}
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-200 mb-2">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            className={inputClass}
            placeholder="••••••••"
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-200 mb-2">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
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
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>
    </div>
  );
}

