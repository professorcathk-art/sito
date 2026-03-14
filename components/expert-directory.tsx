"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import Image from "next/image";

interface Expert {
  id: string;
  name: string;
  title: string;
  category_name: string;
  bio: string;
  country_name: string;
  verified: boolean;
  avatar_url?: string;
}

interface Category {
  id: string;
  name: string;
}

interface Country {
  id: string;
  name: string;
  code: string;
}

export function ExpertDirectory() {
  const searchParams = useSearchParams();
  const categoryFilter = searchParams.get("category");
  const supabase = createClient();
  const { user } = useAuth();
  const [experts, setExperts] = useState<Expert[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryFilter || "");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [connectionStatuses, setConnectionStatuses] = useState<{ [key: string]: "none" | "pending" | "accepted" | "rejected" }>({});
  const [connectingIds, setConnectingIds] = useState<Set<string>>(new Set());

  // Fetch categories and countries
  useEffect(() => {
    async function fetchData() {
      try {
        const [categoriesRes, countriesRes] = await Promise.all([
          supabase.from("categories").select("id, name").order("name"),
          supabase.from("countries").select("id, name, code").order("name"),
        ]);

        if (categoriesRes.data) setCategories(categoriesRes.data);
        if (countriesRes.data) setCountries(countriesRes.data);
      } catch (error) {
        console.error("Error fetching categories/countries:", error);
      }
    }
    fetchData();
  }, [supabase]);

  // Fetch experts from Supabase
  useEffect(() => {
    async function fetchExperts() {
      setLoading(true);
      try {
        let query = supabase
          .from("profiles")
          .select(`
            id,
            name,
            title,
            tagline,
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
          .not("name", "is", null); // Ensure name is not null

        // Filter by category if selected
        if (selectedCategory) {
          query = query.eq("category_id", selectedCategory);
        }

        // Filter by country if selected
        if (selectedLocation) {
          query = query.eq("country_id", selectedLocation);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching experts:", error);
          console.error("Error details:", JSON.stringify(error, null, 2));
          setExperts([]);
        } else if (data) {
          console.log("Fetched experts:", data.length);
          let filtered = data.map((profile: any) => ({
            id: profile.id,
            name: profile.name || "Anonymous",
            title: profile.tagline || profile.title || "", // Use tagline if available, fallback to title
            category_name: (profile.categories as any)?.name || "",
            bio: profile.bio || "",
            country_name: (profile.countries as any)?.name || "",
            verified: profile.verified || false,
            avatar_url: profile.avatar_url || undefined,
          }));

          // Apply search filter
          if (searchQuery) {
            filtered = filtered.filter(
              (expert: any) =>
                expert.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                expert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                expert.category_name.toLowerCase().includes(searchQuery.toLowerCase())
            );
          }

          setExperts(filtered);

          // Fetch connection statuses for all experts
          if (user && filtered.length > 0) {
            const expertIds = filtered.map((e: any) => e.id);
            const { data: connections } = await supabase
              .from("connections")
              .select("expert_id, status, user_id")
              .in("expert_id", expertIds)
              .or(`user_id.eq.${user.id},expert_id.eq.${user.id}`);

            const statusMap: { [key: string]: "none" | "pending" | "accepted" | "rejected" } = {};
            filtered.forEach((expert: any) => {
              if (expert.id === user.id) {
                statusMap[expert.id] = "none"; // Can't connect with yourself
              } else {
                const connection = connections?.find(
                  (c: any) =>
                    (c.user_id === user.id && c.expert_id === expert.id) ||
                    (c.user_id === expert.id && c.expert_id === user.id)
                );
                statusMap[expert.id] = connection
                  ? (connection.status as "pending" | "accepted" | "rejected")
                  : "none";
              }
            });
            setConnectionStatuses(statusMap);
          }
        }
      } catch (error) {
        console.error("Error:", error);
        setExperts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchExperts();
  }, [selectedCategory, selectedLocation, searchQuery, supabase, user]);

  const handleConnect = async (expertId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user || user.id === expertId) {
      return;
    }

    setConnectingIds((prev) => new Set(prev).add(expertId));
    try {
      const { error } = await supabase
        .from("connections")
        .insert({
          user_id: user.id,
          expert_id: expertId,
          status: "pending",
        });

      if (error) {
        if (error.code === "23505") {
          alert("Connection request already sent");
        } else {
          throw error;
        }
      } else {
        setConnectionStatuses((prev) => ({ ...prev, [expertId]: "pending" }));
        alert("Connection request sent!");

        // Send email notification
        await fetch('/api/notify-connection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromUserId: user.id,
            toUserId: expertId,
          }),
        });
      }
    } catch (err) {
      console.error("Error sending connection request:", err);
      alert("Failed to send connection request.");
    } finally {
      setConnectingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(expertId);
        return newSet;
      });
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-2">Featured Experts</h1>
        <p className="text-xl text-text-secondary mb-6">
          Discover industry experts ready to guide your journey
        </p>
        
        {/* Filters */}
        <div className="bg-surface border border-border-default p-6 rounded-xl card-hover mb-6 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Search</label>
              <input
                type="text"
                placeholder="Search by name, title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-custom-bg border border-border-default rounded-md focus:border-white/20 focus:ring-1 focus:ring-white/20 outline-none transition-all text-text-primary placeholder-text-secondary"
              />
            </div>
            
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 bg-custom-bg border border-border-default rounded-md focus:border-white/20 focus:ring-1 focus:ring-white/20 outline-none transition-all text-text-primary"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-custom-bg">
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Location Filter */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Location</label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-4 py-2 bg-custom-bg border border-border-default rounded-md focus:border-white/20 focus:ring-1 focus:ring-white/20 outline-none transition-all text-text-primary"
              >
                <option value="">All Locations</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.id} className="bg-custom-bg">
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Clear Filters */}
          {(selectedCategory || selectedLocation || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCategory("");
                setSelectedLocation("");
                setSearchQuery("");
              }}
              className="mt-4 px-4 py-2 bg-surface text-text-primary border border-border-default rounded-md hover:border-primary transition-colors text-sm"
            >
              Clear All Filters
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-text-secondary animate-pulse">Loading experts...</p>
        </div>
      ) : experts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-secondary text-lg">No experts found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {experts.map((expert: any) => {
            const connectionStatus = connectionStatuses[expert.id] || "none";
            const isConnecting = connectingIds.has(expert.id);
            const isOwnProfile = user?.id === expert.id;

            return (
              <div
                key={expert.id}
                className="group bg-surface border border-border-default rounded-xl card-hover hover:border-primary transition-all duration-300 shadow-2xl flex flex-col overflow-hidden"
              >
                <Link href={`/expert/${expert.id}`} className="flex-1 flex flex-col">
                  {/* Poster-style image section - shorter height */}
                  <div className="relative aspect-[3/2] w-full overflow-hidden bg-slate-800">
                    {expert.avatar_url ? (
                      <Image
                        src={expert.avatar_url}
                        alt={`${expert.name}'s avatar`}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-primary/50">
                          {getInitials(expert.name)}
                        </div>
                      </div>
                    )}
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-white font-bold text-sm sm:text-base truncate">{expert.name}</h3>
                          {expert.verified && (
                            <span className="text-primary flex-shrink-0" title="Verified Expert">
                              ✓
                            </span>
                          )}
                        </div>
                        <p className="text-white/90 text-xs truncate mb-2">{expert.title}</p>
                        <p className="text-white/80 text-xs line-clamp-3">{expert.bio}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Info section below image */}
                  <div className="p-3 sm:p-4 flex-1 flex flex-col">
                    <div className="mb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-text-primary font-bold text-sm sm:text-base truncate">{expert.name}</h3>
                        {expert.verified && (
                          <span className="text-primary flex-shrink-0 text-sm" title="Verified Expert">
                            ✓
                          </span>
                        )}
                      </div>
                      <p className="text-text-secondary text-xs truncate mb-2">{expert.title}</p>
                    </div>
                    
                    {/* Bio section - show more text */}
                    {expert.bio && (
                      <p className="text-text-secondary text-xs sm:text-sm mb-3 line-clamp-4 leading-relaxed">
                        {expert.bio}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-2 mt-auto">
                      {expert.category_name && (
                        <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-full text-xs font-medium truncate">
                          {expert.category_name}
                        </span>
                      )}
                      {expert.country_name && (
                        <span className="text-xs text-text-secondary truncate">{expert.country_name}</span>
                      )}
                    </div>
                  </div>
                </Link>
                
                {/* Connect Button */}
                {!isOwnProfile && user && (
                  <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-0 border-t border-border-default">
                    {connectionStatus === "none" && (
                      <button
                        onClick={(e) => handleConnect(expert.id, e)}
                        disabled={isConnecting}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isConnecting ? "Connecting..." : "Connect"}
                      </button>
                    )}
                    {connectionStatus === "pending" && (
                      <div className="w-full text-center py-2 rounded-md bg-surface text-text-secondary border border-border-default text-xs sm:text-sm">
                        Connection Pending
                      </div>
                    )}
                    {connectionStatus === "accepted" && (
                      <div className="w-full text-center py-2 rounded-md bg-surface text-text-secondary border border-primary text-xs sm:text-sm">
                        Connected
                      </div>
                    )}
                    {connectionStatus === "rejected" && (
                      <div className="w-full text-center py-2 rounded-md bg-surface text-text-secondary border border-red-500/30 text-xs sm:text-sm">
                        Connection Rejected
                      </div>
                    )}
                  </div>
                )}
                {!user && (
                  <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-0 border-t border-border-default">
                    <Link
                      href={`/expert/${expert.id}`}
                      className="block w-full bg-surface text-text-primary py-2 rounded-md font-medium hover:bg-surface/80 transition-colors text-xs sm:text-sm text-center border border-border-default"
                    >
                      View Profile
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Signup CTA Section */}
      <div className="mt-12 mb-8 bg-surface border border-border-default rounded-xl card-hover p-6 sm:p-8 text-center shadow-2xl">
        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-3 sm:mb-4">
          Can&apos;t find an expert here?
        </h2>
        <p className="text-text-secondary mb-4 sm:mb-6 text-sm sm:text-base max-w-2xl mx-auto">
          Tell us what you want to learn, and we&apos;ll match you with the perfect expert from our network of 100+ industry professionals. Your learning journey starts here.
        </p>
        <Link
          href="/register"
          className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-medium transition-all duration-300 text-sm sm:text-base"
        >
          Sign Up Now
        </Link>
      </div>
    </div>
  );
}

