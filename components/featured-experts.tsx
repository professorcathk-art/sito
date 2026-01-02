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

interface Category {
  id: string;
  name: string;
}

export function FeaturedExperts() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Fetch categories from Supabase
  useEffect(() => {
    async function fetchCategories() {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("id, name")
          .order("name");

        if (error) {
          console.error("Error fetching categories:", error);
        } else if (data) {
          setCategories(data);
        }
      } catch (error) {
        console.error("Error:", error);
      }
    }
    fetchCategories();
  }, [supabase]);

  // Fetch featured experts from Supabase
  useEffect(() => {
    async function fetchFeaturedExperts() {
      setLoading(true);
      try {
        let query = supabase
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
            categories(name),
            countries(name)
          `)
          .eq("listed_on_marketplace", true)
          .order("created_at", { ascending: false });

        // Filter by category if selected
        if (selectedCategory) {
          query = query.eq("category_id", selectedCategory).limit(3);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching experts:", error);
          setExperts([]);
        } else if (data) {
          let expertsList: Expert[] = [];

          if (selectedCategory) {
            // Show up to 3 experts for selected category
            expertsList = data.slice(0, 3).map((profile: any) => ({
              id: profile.id,
              name: profile.name || "Anonymous",
              title: profile.title || "",
              category: (profile.categories as any)?.name || "",
              bio: profile.bio || "",
              location: (profile.countries as any)?.name || "",
              verified: profile.verified || false,
              avatarUrl: profile.avatar_url || undefined,
            }));
          } else {
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

            expertsList = Object.values(expertsByCategory).flat();
          }

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
  }, [selectedCategory, supabase]);

  return (
    <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-custom-text mb-1 sm:mb-2 tracking-tight">Featured Experts</h2>
            <p className="text-sm sm:text-base text-custom-text/80">Discover top industry professionals</p>
          </div>
          <Link
            href="/directory"
            className="text-custom-text hover:text-cyber-green font-semibold transition-colors text-sm sm:text-base self-start sm:self-auto"
          >
            View All →
          </Link>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-6 sm:mb-8 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap ${
              selectedCategory === null
                ? "bg-dark-green-800 text-custom-text border border-cyber-green/50 shadow-[0_0_15px_rgba(0,255,136,0.3)]"
                : "bg-dark-green-800/50 text-custom-text hover:bg-dark-green-800 hover:border-cyber-green/50 border border-cyber-green/20"
            }`}
          >
            All Categories
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                selectedCategory === category.id
                  ? "bg-dark-green-800 text-custom-text border border-cyber-green/50 shadow-[0_0_15px_rgba(0,255,136,0.3)]"
                  : "bg-dark-green-800/50 text-custom-text hover:bg-dark-green-800 hover:border-cyber-green/50 border border-cyber-green/20"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-custom-text/80 animate-pulse">Loading experts...</p>
          </div>
        ) : experts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-custom-text/80">No experts found{selectedCategory ? " in this category" : ""}.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {experts.map((expert, index) => (
              <Link
                key={expert.id}
                href={`/expert/${expert.id}`}
                className="group bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 p-4 sm:p-5 rounded-xl hover:bg-dark-green-800/50 hover:border-cyber-green transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.01] sm:hover:scale-[1.02] animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start gap-4 mb-2 sm:mb-3">
                  {expert.avatarUrl ? (
                    <img
                      src={expert.avatarUrl}
                      alt={expert.name}
                      className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-cyber-green/30 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-dark-green-800/50 border-2 border-cyber-green/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg sm:text-2xl text-cyber-green">{expert.name.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base sm:text-lg font-bold text-cyber-green group-hover:text-cyber-green-light transition-colors truncate">{expert.name}</h3>
                      {expert.verified && (
                        <span className="text-cyber-green flex-shrink-0" title="Verified Expert">
                          ✓
                        </span>
                      )}
                    </div>
                    <p className="text-custom-text/80 font-medium text-xs sm:text-sm">{expert.title}</p>
                  </div>
                </div>
                <p className="text-custom-text/70 text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-2">{expert.bio}</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-cyber-green bg-dark-green-900/50 px-2 py-1 rounded-full border border-cyber-green/30 truncate">
                    {expert.category}
                  </span>
                  <span className="text-xs text-custom-text/70 truncate">{expert.location}</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!selectedCategory && (
          <div className="text-center mt-6 sm:mt-8">
            <Link
              href="/directory"
              className="inline-block bg-dark-green-800 text-custom-text px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-bold border border-cyber-green/50 hover:bg-dark-green-700 hover:border-cyber-green transition-all duration-300 transform hover:scale-105"
            >
              View All Experts
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

