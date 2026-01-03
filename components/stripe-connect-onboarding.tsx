/**
 * Stripe Connect Onboarding Component
 * 
 * This component allows users to:
 * 1. Create a Stripe Connect account
 * 2. Start the onboarding process
 * 3. Check their onboarding status
 * 
 * The component displays:
 * - Current account status
 * - Onboarding completion status
 * - Button to start/continue onboarding
 */

"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";

interface AccountStatus {
  accountId: string | null;
  readyToReceivePayments: boolean;
  onboardingComplete: boolean;
  requirementsStatus: string;
}

export function StripeConnectOnboarding() {
  const { user } = useAuth();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      checkAccountStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /**
   * Check if user has a Stripe Connect account and get its status
   */
  const checkAccountStatus = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // First check if account exists in database
      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_connect_account_id, name, email")
        .eq("id", user.id)
        .single();

      if (!profile?.stripe_connect_account_id) {
        setAccountStatus({
          accountId: null,
          readyToReceivePayments: false,
          onboardingComplete: false,
          requirementsStatus: "no_account",
        });
        setLoading(false);
        return;
      }

      // Fetch account status from Stripe API
      const response = await fetch(
        `/api/stripe/connect/account-status?accountId=${profile.stripe_connect_account_id}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch account status");
      }

      const data = await response.json();
      setAccountStatus({
        accountId: data.accountId,
        readyToReceivePayments: data.readyToReceivePayments,
        onboardingComplete: data.onboardingComplete,
        requirementsStatus: data.requirementsStatus,
      });
    } catch (err: any) {
      console.error("Error checking account status:", err);
      setError(err.message || "Failed to check account status");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create a new Stripe Connect account
   */
  const handleCreateAccount = async () => {
    if (!user) return;

    setCreating(true);
    setError(null);

    try {
      // Get user profile for name and email
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, email")
        .eq("id", user.id)
        .single();

      if (!profile?.email) {
        throw new Error("Please complete your profile with email address first");
      }

      const response = await fetch("/api/stripe/connect/create-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: profile.name || "User",
          contactEmail: profile.email,
          country: "us", // TODO: Get from user profile or location
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create account");
      }

      // Refresh account status
      await checkAccountStatus();
    } catch (err: any) {
      console.error("Error creating account:", err);
      setError(err.message || "Failed to create account");
    } finally {
      setCreating(false);
    }
  };

  /**
   * Start or continue onboarding process
   */
  const handleStartOnboarding = async () => {
    if (!accountStatus?.accountId) return;

    setOnboarding(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/connect/create-account-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: accountStatus.accountId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create account link");
      }

      const data = await response.json();

      // Redirect to Stripe onboarding
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error("Error starting onboarding:", err);
      setError(err.message || "Failed to start onboarding");
      setOnboarding(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6">
        <p className="text-custom-text/80">Please sign in to set up payments.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-dark-green-900/50 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-dark-green-900/50 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-custom-text mb-4">
        Stripe Connect Setup
      </h2>

      {error && (
        <div className="mb-4 p-4 bg-red-900/30 border border-red-500/50 rounded-lg">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {!accountStatus?.accountId ? (
        /**
         * No account exists - show create account option
         */
        <div>
          <p className="text-custom-text/80 mb-4">
            Connect your Stripe account to start receiving payments. You will be able to
            accept payments from customers and receive payouts directly to your bank account.
          </p>
          <button
            onClick={handleCreateAccount}
            disabled={creating}
            className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors disabled:opacity-50"
          >
            {creating ? "Creating Account..." : "Create Stripe Account"}
          </button>
        </div>
      ) : (
        /**
         * Account exists - show status and onboarding options
         */
        <div className="space-y-4">
          {/* Account Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-custom-text/80">Account Status:</span>
              <span
                className={`font-semibold ${
                  accountStatus.onboardingComplete
                    ? "text-green-300"
                    : "text-yellow-300"
                }`}
              >
                {accountStatus.onboardingComplete
                  ? "Complete"
                  : "In Progress"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-custom-text/80">Payment Ready:</span>
              <span
                className={`font-semibold ${
                  accountStatus.readyToReceivePayments
                    ? "text-green-300"
                    : "text-red-300"
                }`}
              >
                {accountStatus.readyToReceivePayments ? "Yes" : "No"}
              </span>
            </div>

            {accountStatus.requirementsStatus &&
              accountStatus.requirementsStatus !== "complete" && (
                <div className="mt-2 p-3 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
                  <p className="text-yellow-300 text-sm">
                    Action required: {accountStatus.requirementsStatus}
                  </p>
                </div>
              )}
          </div>

          {/* Onboarding Button */}
          {!accountStatus.onboardingComplete && (
            <button
              onClick={handleStartOnboarding}
              disabled={onboarding}
              className="w-full px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors disabled:opacity-50"
            >
              {onboarding
                ? "Redirecting to Stripe..."
                : "Onboard to Collect Payments"}
            </button>
          )}

          {accountStatus.onboardingComplete &&
            accountStatus.readyToReceivePayments && (
              <div className="p-4 bg-green-900/30 border border-green-500/50 rounded-lg">
                <p className="text-green-300">
                  ✓ Your account is set up and ready to receive payments!
                </p>
              </div>
            )}

          {/* Refresh Status Button */}
          <button
            onClick={checkAccountStatus}
            disabled={loading}
            className="w-full px-4 py-2 border border-cyber-green/30 text-custom-text rounded-lg hover:bg-dark-green-800/50 transition-colors disabled:opacity-50 text-sm"
          >
            Refresh Status
          </button>
        </div>
      )}
    </div>
  );
}

