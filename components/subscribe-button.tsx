"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";

interface SubscribeButtonProps {
  expertId: string;
  expertName: string;
}

export function SubscribeButton({ expertId, expertName }: SubscribeButtonProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function checkSubscription() {
      if (!user) return;
      
      try {
        // Check if user is subscribed
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .eq("expert_id", expertId)
          .single();

        setIsSubscribed(!!subscription);

        // Get subscriber count
        const { count } = await supabase
          .from("subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("expert_id", expertId);

        setSubscriberCount(count || 0);
      } catch (error) {
        console.error("Error checking subscription:", error);
      } finally {
        setLoading(false);
      }
    }

    checkSubscription();
  }, [user, expertId, supabase]);

  const handleSubscribe = async () => {
    if (!user) {
      router.push(`/login?redirect=/expert/${expertId}`);
      return;
    }

    if (user.id === expertId) {
      alert("You cannot subscribe to yourself");
      return;
    }

    setSubscribing(true);
    try {
      if (isSubscribed) {
        // Unsubscribe
        const { error } = await supabase
          .from("subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("expert_id", expertId);

        if (error) throw error;
        setIsSubscribed(false);
        setSubscriberCount((prev) => Math.max(0, prev - 1));
      } else {
        // Subscribe
        const { error } = await supabase.from("subscriptions").insert({
          user_id: user.id,
          expert_id: expertId,
        });

        if (error) {
          if (error.code === "23505") {
            // Already subscribed
            setIsSubscribed(true);
          } else {
            throw error;
          }
        } else {
          setIsSubscribed(true);
          setSubscriberCount((prev) => prev + 1);
        }
      }
    } catch (error: any) {
      console.error("Error toggling subscription:", error);
      alert("Failed to update subscription. Please try again.");
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 w-32 bg-surface rounded-lg"></div>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleSubscribe}
        disabled={subscribing || user?.id === expertId}
        className={`px-4 py-2 rounded-lg font-semibold transition-colors text-sm whitespace-nowrap ${
          isSubscribed
            ? "bg-surface border border-border-default text-cyber-green hover:bg-dark-green-800/70"
            : "bg-cyber-green text-white hover:bg-primary-hover"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {subscribing
          ? "Loading..."
          : isSubscribed
          ? "✓ Subscribed"
          : "Subscribe"}
      </button>
      <span className="text-text-secondary text-sm hidden sm:inline">
        {subscriberCount} {subscriberCount === 1 ? "subscriber" : "subscribers"}
      </span>
    </>
  );
}

