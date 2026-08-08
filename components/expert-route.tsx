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
  const [missing, setMissing] = useState<string[]>([]);

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

        const gaps: string[] = [];
        if (!profile?.name?.trim()) gaps.push("display name");
        if (!profile?.bio?.trim()) gaps.push("bio");
        if (!profile?.category_id) gaps.push("area of expertise");

        setMissing(gaps);
        setIsExpert(gaps.length === 0);
      } catch (error) {
        console.error("Error checking expert status:", error);
        setIsExpert(false);
        setMissing(["profile details"]);
      } finally {
        setChecking(false);
      }
    }

    checkExpertStatus();
  }, [user, authLoading, router, supabase]);

  if (authLoading || checking) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-slate-400 animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!isExpert) {
    return (
      <div className="flex items-center justify-center px-4 py-16">
        <div className="max-w-xl w-full rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center shadow-xl">
          <h2 className="text-2xl font-bold text-slate-50 mb-3">Complete your creator profile</h2>
          <p className="text-slate-400 mb-4 text-sm leading-relaxed">
            Unlock Products and Earnings by finishing your expert profile
            {missing.length > 0 ? (
              <>
                {" "}
                — still needed: <span className="text-slate-200 font-medium">{missing.join(", ")}</span>
              </>
            ) : null}
            .
          </p>
          <Link
            href="/dashboard/storefront?tab=profile"
            className="inline-block rounded-xl bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-white transition-colors"
          >
            Go to Storefront Profile
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
