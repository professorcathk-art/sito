"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Navigation } from "@/components/navigation";
import Link from "next/link";
import Image from "next/image";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  pricing_type: "one-off" | "hourly";
  expert_id: string;
  expert_name: string;
  expert_avatar_url?: string;
  expert_tagline?: string;
  created_at: string;
}

export default function FeaturedCoursesPage() {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        console.log("Fetching products...");
        // Fetch products
        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select(`
            id,
            name,
            description,
            price,
            pricing_type,
            expert_id,
            created_at
          `)
          .order("created_at", { ascending: false });

        if (productsError) {
          console.error("Products query error:", productsError);
          throw productsError;
        }

        console.log("Products fetched:", productsData?.length || 0);

        if (!productsData || productsData.length === 0) {
          console.log("No products found");
          setProducts([]);
          setLoading(false);
          return;
        }

        // Get expert IDs
        const expertIds = Array.from(new Set(productsData.map((p: any) => p.expert_id)));
        console.log("Expert IDs:", expertIds);
        
        // Fetch profiles for these experts
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select(`
            id,
            name,
            tagline,
            title,
            avatar_url,
            listed_on_marketplace
          `)
          .in("id", expertIds)
          .eq("listed_on_marketplace", true);

        if (profilesError) {
          console.error("Profiles query error:", profilesError);
          throw profilesError;
        }

        console.log("Profiles fetched:", profilesData?.length || 0);

        // Combine products with profiles
        const combinedData: Product[] = productsData
          .map((product: any) => {
            const profile = profilesData?.find((p: any) => p.id === product.expert_id);
            if (!profile) {
              console.log(`No listed profile found for product ${product.id}, expert ${product.expert_id}`);
              return null;
            }
            return {
              id: product.id,
              name: product.name,
              description: product.description,
              price: product.price,
              pricing_type: product.pricing_type,
              expert_id: product.expert_id,
              expert_name: profile.name || "Anonymous Expert",
              expert_tagline: profile.tagline || profile.title || "",
              expert_avatar_url: profile.avatar_url || undefined,
              created_at: product.created_at,
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null);

        console.log("Combined products:", combinedData.length);

        let filtered = combinedData;

        // Apply search filter
        if (searchQuery) {
          filtered = combinedData.filter(
            (product) =>
              product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
              product.expert_name.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }

        console.log("Final filtered products:", filtered.length);
        setProducts(filtered);
      } catch (error) {
        console.error("Error fetching products:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [supabase, searchQuery]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className="min-h-screen bg-custom-bg">
      <Navigation />
      <div className="pt-16 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-custom-text mb-2 text-glow">Featured Courses</h1>
            <p className="text-base sm:text-xl text-custom-text/80 mb-6">
              Discover courses and services from industry experts
            </p>

            {/* Search */}
            <div className="bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 p-4 sm:p-6 rounded-xl mb-6">
              <label className="block text-sm font-medium text-custom-text mb-2">Search Courses</label>
              <input
                type="text"
                placeholder="Search by course name, description, or expert name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg focus:ring-2 focus:ring-cyber-green focus:border-cyber-green text-custom-text placeholder-custom-text/50 text-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-custom-text/80 animate-pulse">Loading courses...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-custom-text/80 text-lg">
                {searchQuery ? "No courses found matching your search." : "No courses available yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/expert/${product.expert_id}`}
                  className="group bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 p-4 sm:p-6 rounded-xl hover:bg-dark-green-800/50 hover:border-cyber-green hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.02]"
                >
                  <div className="flex items-center gap-3 mb-3 sm:mb-4">
                    {product.expert_avatar_url ? (
                      <Image
                        src={product.expert_avatar_url}
                        alt={`${product.expert_name}'s avatar`}
                        width={48}
                        height={48}
                        className="rounded-full object-cover w-12 h-12 flex-shrink-0 border-2 border-cyber-green/50"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-dark-green-700 flex items-center justify-center text-custom-text text-lg font-bold flex-shrink-0 border-2 border-cyber-green/50">
                        {getInitials(product.expert_name)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-custom-text truncate text-sm sm:text-base">{product.expert_name}</p>
                      {product.expert_tagline && (
                        <p className="text-xs text-custom-text/70 truncate">{product.expert_tagline}</p>
                      )}
                    </div>
                  </div>
                  <h3 className="text-base sm:text-xl font-bold text-cyber-green group-hover:text-glow transition-all mb-2 sm:mb-3 line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-custom-text/70 text-sm mb-3 sm:mb-4 line-clamp-3">{product.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-base sm:text-lg font-bold text-cyber-green">
                      USD ${product.price} {product.pricing_type === "hourly" ? "/hr" : ""}
                    </span>
                    <span className="text-xs text-custom-text/60">
                      {product.pricing_type === "hourly" ? "Hourly" : "One-time"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

