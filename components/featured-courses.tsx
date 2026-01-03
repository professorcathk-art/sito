"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
  course_id?: string;
  created_at: string;
}

export function FeaturedCourses() {
  const supabase = createClient();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeaturedProducts() {
      setLoading(true);
      try {
        console.log("FeaturedCourses: Fetching products...");
        // Fetch products from listed experts
        // Only fetch course products, exclude 1-on-1 sessions
        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select(`
            id,
            name,
            description,
            price,
            pricing_type,
            expert_id,
            created_at,
            product_type,
            course_id
          `)
          .eq("product_type", "course")
          .not("course_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(50);

        if (productsError) {
          console.error("FeaturedCourses: Products query error:", productsError);
          throw productsError;
        }

        console.log("FeaturedCourses: Products fetched:", productsData?.length || 0);

        if (!productsData || productsData.length === 0) {
          console.log("FeaturedCourses: No products found");
          setFeaturedProducts([]);
          setLoading(false);
          return;
        }

        // Get expert IDs
        const expertIds = Array.from(new Set(productsData.map((p: any) => p.expert_id)));
        console.log("FeaturedCourses: Expert IDs:", expertIds);
        
        // Fetch profiles for these experts
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select(`
            id,
            name,
            avatar_url,
            listed_on_marketplace
          `)
          .in("id", expertIds)
          .eq("listed_on_marketplace", true);

        if (profilesError) {
          console.error("FeaturedCourses: Profiles query error:", profilesError);
          throw profilesError;
        }

        console.log("FeaturedCourses: Profiles fetched:", profilesData?.length || 0);

        // Combine products with profiles
        const productsWithProfiles = productsData
          .map((product: any) => {
            const profile = profilesData?.find((p: any) => p.id === product.expert_id);
            if (!profile) {
              console.log(`FeaturedCourses: No listed profile for product ${product.id}`);
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
              expert_avatar_url: profile.avatar_url || undefined,
              created_at: product.created_at,
            };
          })
          .filter((item) => item !== null)
          .slice(0, 6) as Product[];

        console.log("FeaturedCourses: Final products:", productsWithProfiles.length);
        setFeaturedProducts(productsWithProfiles);
      } catch (error) {
        console.error("Error:", error);
        setFeaturedProducts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchFeaturedProducts();
  }, [supabase]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  if (loading) {
    return (
      <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-custom-text mb-2 text-glow">Featured Courses</h2>
            <p className="text-sm sm:text-base text-custom-text/80">Discover courses from industry experts</p>
          </div>
          <div className="text-center py-12">
            <p className="text-custom-text/80 animate-pulse">Loading courses...</p>
          </div>
        </div>
      </section>
    );
  }

  if (featuredProducts.length === 0) {
    return null; // Don't show section if no products
  }

  return (
    <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-custom-text mb-1 sm:mb-2 text-glow animate-pulse-glow tracking-tight">Featured Courses</h2>
            <p className="text-sm sm:text-base text-custom-text/80">Discover courses from industry experts</p>
          </div>
          <Link
            href="/featured-courses"
            className="text-custom-text hover:text-cyber-green font-semibold transition-colors text-sm sm:text-base self-start sm:self-auto"
          >
            View All Courses →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {featuredProducts.map((product, index) => (
            <Link
              key={product.id}
              href={`/expert/${product.expert_id}`}
              className="group bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 p-4 sm:p-5 rounded-xl hover:bg-dark-green-800/50 hover:border-cyber-green hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.01] sm:hover:scale-[1.02] animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center gap-3 mb-3">
                {product.expert_avatar_url ? (
                  <Image
                    src={product.expert_avatar_url}
                    alt={`${product.expert_name}'s avatar`}
                    width={40}
                    height={40}
                    className="rounded-full object-cover w-10 h-10 flex-shrink-0 border-2 border-cyber-green/50"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-dark-green-700 flex items-center justify-center text-custom-text text-sm font-bold flex-shrink-0 border-2 border-cyber-green/50">
                    {getInitials(product.expert_name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-custom-text/70 truncate">by {product.expert_name}</p>
                </div>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-cyber-green group-hover:text-glow transition-all mb-3 line-clamp-2">
                {product.name}
              </h3>
              <div className="flex items-center justify-between">
                <span className="text-sm sm:text-base font-bold text-cyber-green">
                  USD ${product.price} {product.pricing_type === "hourly" ? "/hr" : ""}
                </span>
                <span className="text-xs text-custom-text/60">
                  {product.pricing_type === "hourly" ? "Hourly" : "One-time"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

