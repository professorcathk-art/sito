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
  cover_image_url?: string | null;
  e_learning_subtype?: "online-course" | "ebook" | "ai-prompt" | "live-webinar" | "other" | null;
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
            course_id,
            e_learning_subtype,
            courses!inner(id, published, cover_image_url)
          `)
          .eq("product_type", "e-learning")
          .not("course_id", "is", null)
          .eq("courses.published", true)
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

        // Filter out expired live webinars and combine products with profiles
        const now = new Date();
        const productsWithProfiles = productsData
          .filter((product: any) => {
            // Filter out expired live webinars
            if (product.e_learning_subtype === "live-webinar" && product.webinar_expiry_date) {
              const expiryDate = new Date(product.webinar_expiry_date);
              return expiryDate > now;
            }
            return true; // Keep all other products
          })
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
              course_id: product.course_id,
              cover_image_url: product.courses?.cover_image_url || null,
              e_learning_subtype: product.e_learning_subtype || null,
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
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary mb-2">Secret Recipe</h2>
            <p className="text-sm sm:text-base text-text-secondary">Discover e-learning products from industry experts</p>
          </div>
          <div className="text-center py-12">
            <p className="text-text-secondary animate-pulse">Loading courses...</p>
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
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary mb-1 sm:mb-2 tracking-tight">Secret Recipe</h2>
            <p className="text-sm sm:text-base text-text-secondary">Discover e-learning products from industry experts</p>
          </div>
          <Link
            href="/featured-courses"
            className="text-text-primary hover:text-primary font-semibold transition-colors text-sm sm:text-base self-start sm:self-auto"
          >
            View All Secret Recipes →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 overflow-visible">
          {featuredProducts.map((product, index) => (
            <div
              key={product.id}
              className="group animate-fade-in-up relative z-0 transition-all duration-300 ease-out overflow-visible group-hover:z-50"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <Link
                href={product.course_id ? `/courses/${product.course_id}` : `/expert/${product.expert_id}`}
                className="block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] shadow-2xl flex flex-col"
              >
                {/* Cover Image with 4:3 aspect ratio (shorter for landing page) */}
                <div className="relative w-full aspect-[4/3] overflow-hidden bg-transparent rounded-t-xl">
                  {product.cover_image_url ? (
                    <Image
                      src={product.cover_image_url}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800 p-4 overflow-y-auto">
                      {product.description ? (
                        <div 
                          className="text-xs sm:text-sm text-text-primary line-clamp-6 product-preview"
                          dangerouslySetInnerHTML={{ __html: product.description }}
                        />
                      ) : (
                        <div className="text-center text-text-secondary text-sm">
                          No description available
                        </div>
                      )}
                    </div>
                  )}
                  {/* E-learning subtype label */}
                  {product.e_learning_subtype && (
                    <div className="absolute top-2 right-2 z-10">
                      <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-1 rounded-full text-xs font-medium">
                        {product.e_learning_subtype === "online-course" ? "Online Course" :
                         product.e_learning_subtype === "ebook" ? "Ebook" :
                         product.e_learning_subtype === "ai-prompt" ? "AI Prompt" :
                         product.e_learning_subtype === "live-webinar" ? "Live Webinar" :
                         product.e_learning_subtype === "other" ? "Other" :
                         product.e_learning_subtype}
                      </span>
                    </div>
                  )}
                </div>
                {/* Content below image */}
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {product.expert_avatar_url ? (
                      <Image
                        src={product.expert_avatar_url}
                        alt={`${product.expert_name}'s avatar`}
                        width={32}
                        height={32}
                        className="rounded-full object-cover w-8 h-8 flex-shrink-0 border-2 border-border-default"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-50 text-xs font-bold flex-shrink-0 border-2 border-slate-700">
                        {getInitials(product.expert_name)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-text-secondary truncate">by {product.expert_name}</p>
                    </div>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-text-primary group-hover:text-primary transition-all mb-3 line-clamp-2">
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-sm sm:text-base font-bold text-white">
                      {product.price === 0 || !product.price ? (
                        "Free"
                      ) : (
                        `USD $${product.price.toFixed(2)} ${product.pricing_type === "hourly" ? "/hr" : ""}`
                      )}
                    </span>
                    {product.price > 0 && (
                      <span className="text-xs text-text-secondary">
                        {product.pricing_type === "hourly" ? "Hourly" : "One-time"}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
              {/* Description popover - absolute positioned to avoid grid overflow */}
              {product.description && (
                <div className="absolute top-full left-0 w-full pt-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-300 ease-out z-50">
                  <div className="px-4 py-4 bg-slate-800 border border-slate-700 rounded-b-xl shadow-[0_20px_40px_rgba(0,0,0,0.4)] backdrop-blur-md">
                    <div 
                      className="text-xs sm:text-sm text-slate-400 line-clamp-3 product-preview"
                      dangerouslySetInnerHTML={{ __html: product.description }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

