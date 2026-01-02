"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ProtectedRoute } from "@/components/protected-route";

interface Subscription {
  id: string;
  created_at: string;
  expert: {
    id: string;
    name: string;
    title: string | null;
    avatar_url: string | null;
    verified: boolean;
  };
}

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchSubscriptions();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSubscriptions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select(`
          id,
          created_at,
          profiles:expert_id (
            id,
            name,
            title,
            avatar_url,
            verified
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setSubscriptions(
        (data || []).map((sub: any) => ({
          id: sub.id,
          created_at: sub.created_at,
          expert: sub.profiles,
        }))
      );
    } catch (err) {
      console.error("Error fetching subscriptions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async (expertId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("subscriptions")
        .delete()
        .eq("user_id", user.id)
        .eq("expert_id", expertId);

      if (error) throw error;
      fetchSubscriptions();
    } catch (err) {
      console.error("Error unsubscribing:", err);
      alert("Failed to unsubscribe. Please try again.");
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold text-custom-text mb-8">My Subscriptions</h1>

          {loading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-dark-green-800/50 rounded-lg"></div>
              ))}
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-8 text-center">
              <p className="text-custom-text/80 mb-4">You haven&apos;t subscribed to any experts yet.</p>
              <Link
                href="/directory"
                className="inline-block bg-cyber-green text-dark-green-900 px-6 py-3 rounded-lg font-semibold hover:bg-cyber-green-light transition-colors"
              >
                Browse Experts
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subscriptions.map((subscription) => (
                <div
                  key={subscription.id}
                  className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6"
                >
                  <div className="flex items-start gap-4 mb-4">
                    {subscription.expert.avatar_url ? (
                      <img
                        src={subscription.expert.avatar_url}
                        alt={subscription.expert.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-dark-green-800 flex items-center justify-center">
                        <span className="text-2xl text-cyber-green">
                          {subscription.expert.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Link
                          href={`/expert/${subscription.expert.id}`}
                          className="text-xl font-bold text-custom-text hover:text-cyber-green transition-colors"
                        >
                          {subscription.expert.name}
                        </Link>
                        {subscription.expert.verified && (
                          <span className="text-cyber-green" title="Verified Expert">
                            ✓
                          </span>
                        )}
                      </div>
                      {subscription.expert.title && (
                        <p className="text-custom-text/70 text-sm">{subscription.expert.title}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-custom-text/60 text-sm">
                      Subscribed {new Date(subscription.created_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleUnsubscribe(subscription.expert.id)}
                      className="px-4 py-2 bg-red-900/50 text-red-300 rounded-lg text-sm hover:bg-red-900/70 transition-colors"
                    >
                      Unsubscribe
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

