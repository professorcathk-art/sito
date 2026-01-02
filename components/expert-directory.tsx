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
            categories(name),
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
          setExperts([]);
        } else if (data) {
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
        <h1 className="text-4xl font-bold text-custom-text mb-2 text-glow">Expert Directory</h1>
        <p className="text-xl text-custom-text/80 mb-6">
          Discover industry experts ready to guide your journey
        </p>
        
        {/* Filters */}
        <div className="bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 p-6 rounded-xl mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-custom-text mb-2">Search</label>
              <input
                type="text"
                placeholder="Search by name, title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg focus:ring-2 focus:ring-cyber-green focus:border-cyber-green text-custom-text placeholder-custom-text/50"
              />
            </div>
            
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-custom-text mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg focus:ring-2 focus:ring-cyber-green focus:border-cyber-green text-custom-text"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-dark-green-900">
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Location Filter */}
            <div>
              <label className="block text-sm font-medium text-custom-text mb-2">Location</label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg focus:ring-2 focus:ring-cyber-green focus:border-cyber-green text-custom-text"
              >
                <option value="">All Locations</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.id} className="bg-dark-green-900">
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
              className="mt-4 px-4 py-2 bg-dark-green-800/50 text-custom-text border border-cyber-green/30 rounded-lg hover:bg-dark-green-800 hover:border-cyber-green transition-colors text-sm"
            >
              Clear All Filters
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-custom-text/80 animate-pulse">Loading experts...</p>
        </div>
      ) : experts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-custom-text/80 text-lg">No experts found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {experts.map((expert: any) => {
            const connectionStatus = connectionStatuses[expert.id] || "none";
            const isConnecting = connectingIds.has(expert.id);
            const isOwnProfile = user?.id === expert.id;

            return (
              <div
                key={expert.id}
                className="bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 p-4 sm:p-6 rounded-xl hover:bg-dark-green-800/50 hover:border-cyber-green hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.02] flex flex-col"
              >
                <Link href={`/expert/${expert.id}`} className="flex-1">
                  <div className="flex items-start gap-3 mb-3 sm:mb-4">
                    {expert.avatar_url ? (
                      <Image
                        src={expert.avatar_url}
                        alt={`${expert.name}'s avatar`}
                        width={48}
                        height={48}
                        className="rounded-full object-cover w-12 h-12 flex-shrink-0 border-2 border-cyber-green/50"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-dark-green-700 flex items-center justify-center text-custom-text text-lg font-bold flex-shrink-0 border-2 border-cyber-green/50">
                        {getInitials(expert.name)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base sm:text-xl font-bold text-custom-text truncate">{expert.name}</h3>
                        {expert.verified && (
                          <span className="text-cyber-green animate-pulse-glow flex-shrink-0" title="Verified Expert">
                            ✓
                          </span>
                        )}
                      </div>
                      <p className="text-custom-text/80 font-medium text-xs sm:text-sm truncate">{expert.title}</p>
                    </div>
                  </div>
                  <p className="text-custom-text/70 text-sm mb-3 sm:mb-4 line-clamp-2">{expert.bio}</p>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs text-cyber-green bg-dark-green-900/50 px-2 py-1 rounded-full border border-cyber-green/30 truncate">
                      {expert.category_name}
                    </span>
                    <span className="text-xs text-custom-text/70 truncate">{expert.country_name}</span>
                  </div>
                </Link>
                
                {/* Connect Button */}
                {!isOwnProfile && user && (
                  <div className="mt-auto pt-3 border-t border-cyber-green/20">
                    {connectionStatus === "none" && (
                      <button
                        onClick={(e) => handleConnect(expert.id, e)}
                        disabled={isConnecting}
                        className="w-full bg-cyber-green text-custom-text py-2 rounded-lg font-semibold hover:bg-cyber-green-light transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(0,255,136,0.3)]"
                      >
                        {isConnecting ? "Connecting..." : "Connect"}
                      </button>
                    )}
                    {connectionStatus === "pending" && (
                      <div className="w-full text-center py-2 rounded-lg bg-dark-green-700/50 text-custom-text/80 border border-cyber-green/30 text-sm">
                        Connection Pending
                      </div>
                    )}
                    {connectionStatus === "accepted" && (
                      <div className="w-full text-center py-2 rounded-lg bg-dark-green-700/50 text-custom-text/80 border border-cyber-green/30 text-sm">
                        Connected
                      </div>
                    )}
                    {connectionStatus === "rejected" && (
                      <div className="w-full text-center py-2 rounded-lg bg-dark-green-700/50 text-custom-text/80 border border-red-500/30 text-sm">
                        Connection Rejected
                      </div>
                    )}
                  </div>
                )}
                {!user && (
                  <div className="mt-auto pt-3 border-t border-cyber-green/20">
                    <Link
                      href={`/expert/${expert.id}`}
                      className="block w-full bg-dark-green-800/50 text-custom-text py-2 rounded-lg font-semibold hover:bg-dark-green-800 transition-colors text-sm text-center border border-cyber-green/30"
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
    </div>
  );
}

