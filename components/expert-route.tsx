"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export function ExpertRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [isExpert, setIsExpert] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkExpertStatus() {
      if (authLoading) return;
      
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("category_id, bio, name")
          .eq("id", user.id)
          .single();

        // Check if user has completed expert profile (has category_id and bio)
        const hasExpertProfile = !!(profile?.category_id && profile?.bio && profile?.name);
        setIsExpert(hasExpertProfile);

        if (!hasExpertProfile) {
          // Don't redirect automatically, show message instead
        }
      } catch (error) {
        console.error("Error checking expert status:", error);
        setIsExpert(false);
      } finally {
        setChecking(false);
      }
    }

    checkExpertStatus();
  }, [user, authLoading, router, supabase]);

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-green-950">
        <div className="text-custom-text/80 animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!isExpert) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-green-950 px-4">
        <div className="max-w-2xl w-full bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 rounded-2xl shadow-lg p-8 text-center">
          <h2 className="text-3xl font-bold text-custom-text mb-4">Expert Profile Required</h2>
          <p className="text-custom-text/80 mb-6">
            You need to complete your expert profile to access this feature. Complete your profile with your category, bio, and other details to unlock expert features.
          </p>
          <Link
            href="/profile/setup"
            className="inline-block bg-cyber-green text-custom-text px-6 py-3 rounded-lg font-semibold hover:bg-cyber-green-light transition-colors shadow-[0_0_15px_rgba(0,255,136,0.3)]"
          >
            Complete Your Profile
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
