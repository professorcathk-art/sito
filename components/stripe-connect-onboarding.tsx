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

interface Earnings {
  totalAvailable: number;
  totalPending: number;
  totalEarnings: number;
  currency: string;
}

interface Country {
  id: string;
  name: string;
  code: string;
}

export function StripeConnectOnboarding() {
  const { user } = useAuth();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasAccountIdInDb, setHasAccountIdInDb] = useState<boolean>(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [loadingEarnings, setLoadingEarnings] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCountries();
      fetchUserCountry();
      checkAccountStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (accountStatus?.accountId && accountStatus.readyToReceivePayments) {
      fetchEarnings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountStatus?.accountId, accountStatus?.readyToReceivePayments]);

  /**
   * Fetch list of countries for selection
   * Currently limited to Hong Kong only
   */
  const fetchCountries = async () => {
    try {
      const { data, error } = await supabase
        .from("countries")
        .select("id, name, code")
        .eq("code", "HK")
        .single();

      if (error) {
        console.error("Error fetching countries:", error);
        // Fallback: manually set Hong Kong if database query fails
        setCountries([{ id: "hk", name: "Hong Kong", code: "HK" }]);
        return;
      }

      if (data) {
        setCountries([data]);
        // Auto-select Hong Kong
        setSelectedCountry("hk");
      } else {
        // Fallback: manually set Hong Kong
        setCountries([{ id: "hk", name: "Hong Kong", code: "HK" }]);
        setSelectedCountry("hk");
      }
    } catch (err) {
      console.error("Error fetching countries:", err);
      // Fallback: manually set Hong Kong
      setCountries([{ id: "hk", name: "Hong Kong", code: "HK" }]);
      setSelectedCountry("hk");
    }
  };

  /**
   * Fetch user's country from profile
   */
  const fetchUserCountry = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select(`
          country_id,
          countries(code)
        `)
        .eq("id", user.id)
        .single();

      if (profile?.countries && typeof profile.countries === 'object' && 'code' in profile.countries) {
        const countryCode = (profile.countries as any).code?.toLowerCase() || null;
        setUserCountry(countryCode);
        setSelectedCountry(countryCode || "");
      } else if (profile?.country_id) {
        // If country_id exists but countries relation didn't load, fetch it separately
        const { data: countryData } = await supabase
          .from("countries")
          .select("code")
          .eq("id", profile.country_id)
          .single();
        
        if (countryData?.code) {
          const countryCode = countryData.code.toLowerCase();
          setUserCountry(countryCode);
          setSelectedCountry(countryCode);
        }
      } else {
        // Default to Hong Kong if no country set
        setSelectedCountry("hk");
      }
    } catch (err) {
      console.error("Error fetching user country:", err);
      setSelectedCountry("hk"); // Default fallback to Hong Kong
    }
  };

  /**
   * Fetch total earnings for the connected account
   */
  const fetchEarnings = async () => {
    if (!accountStatus?.accountId) return;

    setLoadingEarnings(true);
    try {
      const response = await fetch(
        `/api/stripe/connect/earnings?accountId=${accountStatus.accountId}`
      );

      if (response.ok) {
        const data = await response.json();
        setEarnings({
          totalAvailable: data.totalAvailable || 0,
          totalPending: data.totalPending || 0,
          totalEarnings: data.totalEarnings || 0,
          currency: data.currency || "USD",
        });
      } else {
        console.error("Failed to fetch earnings");
      }
    } catch (err) {
      console.error("Error fetching earnings:", err);
    } finally {
      setLoadingEarnings(false);
    }
  };

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
        setHasAccountIdInDb(false);
        setAccountStatus({
          accountId: null,
          readyToReceivePayments: false,
          onboardingComplete: false,
          requirementsStatus: "no_account",
        });
        setLoading(false);
        return;
      }

      // Track that we have an account ID in database
      setHasAccountIdInDb(true);

      // Fetch account status from Stripe API
      const response = await fetch(
        `/api/stripe/connect/account-status?accountId=${profile.stripe_connect_account_id}`
      );

      if (!response.ok) {
        const data = await response.json();
        
        // Handle case where account doesn't exist (test account with live keys)
        if (data.accountNotFound && data.cleared) {
          // Account was cleared, refresh to show create account option
          setAccountStatus({
            accountId: null,
            readyToReceivePayments: false,
            onboardingComplete: false,
            requirementsStatus: "no_account",
          });
          setError("Previous test account was cleared. Please create a new account for live mode.");
          setLoading(false);
          return;
        }
        
        // If account status fails but we have an account ID in database, 
        // set accountStatus with the ID so Reset button appears
        setAccountStatus({
          accountId: profile.stripe_connect_account_id,
          readyToReceivePayments: false,
          onboardingComplete: false,
          requirementsStatus: "error",
        });
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
      
      // If we have an account ID in database but status check failed,
      // ensure hasAccountIdInDb is set so Reset button appears
      if (hasAccountIdInDb && !accountStatus?.accountId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("stripe_connect_account_id")
          .eq("id", user?.id)
          .single();
        
        if (profile?.stripe_connect_account_id) {
          setAccountStatus({
            accountId: profile.stripe_connect_account_id,
            readyToReceivePayments: false,
            onboardingComplete: false,
            requirementsStatus: "error",
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create a new Stripe Connect account
   */
  const handleCreateAccount = async () => {
    if (!user) return;

    if (!selectedCountry) {
      setError("Please select your country");
      return;
    }

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

      // Convert country code to lowercase for Stripe (Stripe uses lowercase: 'us', 'gb', etc.)
      const stripeCountryCode = selectedCountry.toLowerCase();

      const response = await fetch("/api/stripe/connect/create-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: profile.name || "User",
          contactEmail: profile.email,
          country: stripeCountryCode,
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
   * Reset/clear the Stripe Connect account
   * Useful when switching from test to live mode
   */
  const handleResetAccount = async () => {
    if (!confirm("Are you sure you want to reset your Stripe account? This will clear your current account and allow you to create a new one. This is useful when switching from test mode to live mode.")) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/connect/reset-account", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to reset account");
      }

      // Clear the account ID flag
      setHasAccountIdInDb(false);
      // Refresh account status (should show no account now)
      await checkAccountStatus();
    } catch (err: any) {
      console.error("Error resetting account:", err);
      setError(err.message || "Failed to reset account");
    } finally {
      setLoading(false);
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
        // Show detailed error message if available
        const errorMessage = data.details 
          ? `${data.error}\n\nDetails: ${data.details}`
          : data.error || "Failed to create account link";
        throw new Error(errorMessage);
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
      <div className="bg-surface border border-border-default rounded-md p-6">
        <p className="text-text-secondary">Please sign in to set up payments.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-surface border border-border-default rounded-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-custom-bg rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-custom-bg rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border-default rounded-md p-6">
      <h2 className="text-2xl font-bold text-custom-text mb-4">
        Stripe Connect Setup
      </h2>

      {error && (
        <div className="mb-4 p-4 bg-red-900/30 border border-red-500/50 rounded-md">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {!accountStatus?.accountId || (error && (accountStatus?.requirementsStatus === "error" || hasAccountIdInDb)) ? (
        /**
         * No account exists OR account status check failed - show create/reset options
         */
        <div className="space-y-4">
          {error && (
            <div className="mb-4 p-4 bg-red-900/30 border border-red-500/50 rounded-md">
              <p className="text-red-300 mb-2 font-semibold">⚠️ {error}</p>
              {(accountStatus?.accountId || hasAccountIdInDb) && (
                <div className="mt-3 p-3 bg-yellow-900/30 border border-yellow-500/50 rounded">
                  <p className="text-yellow-200 text-sm mb-2">
                    <strong>Problem detected:</strong> You have a Stripe account ID in the database, but Stripe can&apos;t find it.
                  </p>
                  <p className="text-yellow-200 text-sm mb-2">
                    This usually happens when:
                  </p>
                  <ul className="text-yellow-200 text-sm list-disc list-inside mb-2 space-y-1">
                    <li>You created a test account but are now using live mode keys</li>
                    <li>The account was deleted from Stripe Dashboard</li>
                    <li>You&apos;re using the wrong Stripe account (test vs live)</li>
                  </ul>
                  <p className="text-yellow-300 text-sm font-semibold">
                    Solution: Click &quot;Reset Account&quot; below to clear the invalid account ID, then create a new account.
                  </p>
                </div>
              )}
            </div>
          )}
          <p className="text-text-secondary mb-4">
            Connect your Stripe account to start receiving payments. You will be able to
            accept payments from customers and receive payouts directly to your bank account.
          </p>

          {/* Country Selection */}
          <div>
            <label className="block text-sm font-medium text-custom-text mb-2">
              Select Your Country <span className="text-red-400">*</span>
            </label>
            <p className="text-xs text-text-secondary mb-2">
              This determines which Stripe region your account will be created in. 
              Make sure it matches your business location.
            </p>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full px-4 py-2 bg-custom-bg border border-border-default rounded-md text-custom-text focus:border-white/20 focus:outline-none"
              disabled={creating || true}
              required
            >
              {countries.length === 0 ? (
                <option value="hk">Hong Kong</option>
              ) : (
                countries.map((country) => (
                  <option key={country.id} value={country.code.toLowerCase()}>
                    {country.name}
                  </option>
                ))
              )}
            </select>
            <p className="text-xs text-text-secondary mt-2">
              Currently, built-in payment processing is only available for Hong Kong users.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {(accountStatus?.accountId || hasAccountIdInDb) ? (
              <>
                <button
                  onClick={handleResetAccount}
                  disabled={loading || creating}
                  className="flex-1 px-6 py-3 bg-yellow-600 text-white font-semibold rounded-md hover:bg-yellow-700 transition-colors disabled:opacity-50 text-sm"
                >
                  {loading ? "Resetting..." : "Reset Account"}
                </button>
                <button
                  onClick={handleCreateAccount}
                  disabled={creating || !selectedCountry || loading}
                  className="flex-1 px-6 py-3 bg-cyber-green text-slate-900 font-semibold rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? "Creating Account..." : "Create New Account"}
                </button>
              </>
            ) : (
              <button
                onClick={handleCreateAccount}
                disabled={creating || !selectedCountry}
                className="w-full px-6 py-3 bg-cyber-green text-slate-900 font-semibold rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? "Creating Account..." : "Create Stripe Account"}
              </button>
            )}
          </div>
          
          {(accountStatus?.accountId || hasAccountIdInDb) && (
            <div className="p-3 bg-custom-bg border border-border-default rounded-md">
              <p className="text-xs text-text-secondary text-center">
                <strong>Reset Account:</strong> This will clear the invalid account ID from your database. 
                After resetting, you can create a new Stripe account for live mode.
              </p>
            </div>
          )}
        </div>
      ) : (
        /**
         * Account exists - show status and onboarding options
         */
        <div className="space-y-4">
          {/* Account Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Account Status:</span>
              <span
                className={`font-semibold ${
                  accountStatus.readyToReceivePayments
                    ? "text-green-300"
                    : accountStatus.onboardingComplete
                    ? "text-yellow-300"
                    : "text-yellow-300"
                }`}
              >
                {accountStatus.readyToReceivePayments
                  ? "Complete"
                  : accountStatus.onboardingComplete
                  ? "In Progress"
                  : "In Progress"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Payment Ready:</span>
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
                <div className="mt-2 p-4 bg-yellow-900/30 border border-yellow-500/50 rounded-md">
                  <p className="text-yellow-300 font-semibold mb-2">
                    ⚠️ Action Required
                  </p>
                  <p className="text-yellow-200 text-sm mb-2">
                    Your Stripe account needs additional information to be verified. 
                    This is required before you can receive payments.
                  </p>
                  <p className="text-yellow-300/80 text-xs">
                    Status: {accountStatus.requirementsStatus === "currently_due" 
                      ? "Information needed" 
                      : accountStatus.requirementsStatus === "past_due"
                      ? "Deadline missed - please complete soon"
                      : accountStatus.requirementsStatus}
                  </p>
                </div>
              )}
          </div>

          {/* Onboarding Button - Show if not ready to receive payments */}
          {!accountStatus.readyToReceivePayments && (
            <div className="space-y-3">
              <button
                onClick={handleStartOnboarding}
                disabled={onboarding}
                className="w-full px-6 py-3 bg-cyber-green text-slate-900 font-semibold rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {onboarding
                  ? "Redirecting to Stripe..."
                  : accountStatus.onboardingComplete
                  ? "Complete Onboarding"
                  : "Onboard to Collect Payments"}
              </button>
              <p className="text-text-secondary text-sm text-center">
                Click the button above to complete your Stripe account setup. 
                You will need to provide business information, bank details, and identity verification.
              </p>
            </div>
          )}

          {accountStatus.readyToReceivePayments && (
            <div className="space-y-4">
              <div className="p-4 bg-green-900/30 border border-green-500/50 rounded-md">
                <p className="text-green-300 font-semibold mb-1">
                  ✓ Account Ready!
                </p>
                <p className="text-green-200 text-sm">
                  Your account is fully set up and ready to receive payments. 
                  You can now create products and start accepting payments.
                </p>
              </div>

              {/* Total Earnings Display */}
              <div className="p-4 bg-custom-bg border border-border-default rounded-md">
                <h3 className="text-lg font-bold text-custom-text mb-3">
                  Total Earnings
                </h3>
                {loadingEarnings ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-surface rounded w-1/2"></div>
                  </div>
                ) : earnings ? (
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-cyber-green">
                        {earnings.currency} {earnings.totalEarnings.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-sm text-text-secondary space-y-1">
                      <div className="flex justify-between">
                        <span>Available:</span>
                        <span className="text-custom-text">
                          {earnings.currency} {earnings.totalAvailable.toFixed(2)}
                        </span>
                      </div>
                      {earnings.totalPending > 0 && (
                        <div className="flex justify-between">
                          <span>Pending:</span>
                          <span className="text-custom-text">
                            {earnings.currency} {earnings.totalPending.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary mt-2">
                      Funds are automatically transferred to your connected bank account according to your payout schedule.
                    </p>
                    {accountStatus?.accountId && (
                      <a
                        href={`https://dashboard.stripe.com/connect/accounts/overview/${accountStatus.accountId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-3 px-4 py-2 bg-white/5 border border-border-default text-cyber-green rounded-md hover:bg-cyber-green/30 transition-colors text-sm font-medium"
                      >
                        View Stripe Dashboard →
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-text-secondary text-sm">
                    No earnings data available yet.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={checkAccountStatus}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-border-default text-custom-text rounded-md hover:bg-surface transition-colors disabled:opacity-50 text-sm"
            >
              Refresh Status
            </button>
            <button
              onClick={handleResetAccount}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-yellow-500/50 text-yellow-300 rounded-md hover:bg-yellow-900/30 transition-colors disabled:opacity-50 text-sm"
            >
              Reset Account
            </button>
          </div>
          
          <p className="text-xs text-text-secondary text-center mt-2">
            Reset Account: Clear your current Stripe account to create a new one (useful when switching from test to live mode)
          </p>
        </div>
      )}
    </div>
  );
}

