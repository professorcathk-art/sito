"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function RegisterForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

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
          // Don't block user flow if email fails
        });

        // Redirect to onboarding
        router.push("/onboarding");
        router.refresh();
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-border-default p-8 rounded-xl shadow-lg shadow-black/20">
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 text-red-200 rounded-lg">
          {error}
        </div>
      )}
      <div className="mb-4">
        <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-2">
          Full Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 bg-custom-bg border border-border-default rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-text-primary placeholder-text-secondary"
          placeholder="John Doe"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-2">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 bg-custom-bg border border-border-default rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-text-primary placeholder-text-secondary"
          placeholder="you@example.com"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-2">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 bg-custom-bg border border-border-default rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-text-primary placeholder-text-secondary"
          placeholder="••••••••"
        />
      </div>
      <div className="mb-6">
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-primary mb-2">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 bg-custom-bg border border-border-default rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-text-primary placeholder-text-secondary"
          placeholder="••••••••"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
      >
        {loading ? "Creating account..." : "Create Account"}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border-default"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-surface text-text-secondary">Or continue with</span>
        </div>
      </div>

      <button
        type="button"
        onClick={async () => {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: `${window.location.origin}/onboarding`,
            },
          });
          if (error) {
            setError(error.message);
          }
        }}
        className="w-full mt-4 flex items-center justify-center gap-3 bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary-hover transition-colors"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
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
        Sign up with Google
      </button>
    </form>
  );
}

