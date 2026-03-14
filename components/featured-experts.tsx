"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Expert {
  id: string;
  name: string;
  title: string;
  category: string;
  bio: string;
  location: string;
  verified: boolean;
  avatarUrl?: string;
}

export function FeaturedExperts() {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Categories removed - no longer fetching for landing page filters

  // Fetch featured experts from Supabase
  useEffect(() => {
    async function fetchFeaturedExperts() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select(`
            id,
            name,
            title,
            bio,
            verified,
            listed_on_marketplace,
            category_id,
            country_id,
            avatar_url,
            categories!profiles_category_id_fkey(name),
            countries(name)
          `)
          .eq("listed_on_marketplace", true)
          .order("created_at", { ascending: false })
          .limit(6);

        if (error) {
          console.error("Error fetching experts:", error);
          setExperts([]);
        } else if (data) {
          // Show 2 experts per category
          const expertsByCategory: { [key: string]: Expert[] } = {};
          
          data.forEach((profile: any) => {
            const categoryName = (profile.categories as any)?.name || "Uncategorized";
            if (!expertsByCategory[categoryName]) {
              expertsByCategory[categoryName] = [];
            }
            if (expertsByCategory[categoryName].length < 2) {
              expertsByCategory[categoryName].push({
                id: profile.id,
                name: profile.name || "Anonymous",
                title: profile.title || "",
                category: categoryName,
                bio: profile.bio || "",
                location: (profile.countries as any)?.name || "",
                verified: profile.verified || false,
                avatarUrl: profile.avatar_url || undefined,
              });
            }
          });

          const expertsList = Object.values(expertsByCategory).flat();
          setExperts(expertsList);
        }
      } catch (error) {
        console.error("Error:", error);
        setExperts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchFeaturedExperts();
  }, [supabase]);

  return (
    <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary mb-1 sm:mb-2 tracking-tight">Featured Experts</h2>
            <p className="text-sm sm:text-base text-text-secondary">Discover top industry professionals</p>
          </div>
          <Link
            href="/directory"
            className="text-text-primary hover:text-primary font-semibold transition-colors text-sm sm:text-base self-start sm:self-auto"
          >
            View All →
          </Link>
        </div>


        {loading ? (
          <div className="text-center py-12">
            <p className="text-text-secondary animate-pulse">Loading experts...</p>
          </div>
        ) : experts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-secondary">No experts found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {experts.map((expert, index) => (
              <Link
                key={expert.id}
                href={`/expert/${expert.id}`}
                className="group bg-surface border border-border-default p-6 rounded-xl hover:border-primary transition-all duration-300 shadow-lg shadow-black/20 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start gap-4 mb-3">
                  {expert.avatarUrl ? (
                    <img
                      src={expert.avatarUrl}
                      alt={expert.name}
                      className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-border-default flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-surface border-2 border-border-default flex items-center justify-center flex-shrink-0">
                      <span className="text-lg sm:text-2xl text-primary">{expert.name.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base sm:text-lg font-bold text-text-primary group-hover:text-primary transition-colors truncate">{expert.name}</h3>
                      {expert.verified && (
                        <span className="text-primary flex-shrink-0" title="Verified Expert">
                          ✓
                        </span>
                      )}
                    </div>
                    <p className="text-text-secondary font-medium text-xs sm:text-sm">{expert.title}</p>
                  </div>
                </div>
                <p className="text-text-secondary text-xs sm:text-sm mb-3 line-clamp-2">{expert.bio}</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-primary bg-transparent px-2 py-1 rounded-full border border-primary truncate">
                    {expert.category}
                  </span>
                  <span className="text-xs text-text-secondary truncate">{expert.location}</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="text-center mt-6 sm:mt-8">
          <Link
            href="/directory"
            className="inline-block bg-primary text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-medium hover:bg-primary-hover transition-all duration-300"
          >
            View All Experts
          </Link>
        </div>
      </div>
    </section>
  );
}

