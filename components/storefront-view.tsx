"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { CourseEnrollment } from "@/components/course-enrollment";

interface StorefrontViewProps {
  expertId: string;
  expertName: string;
  expertBio: string;
  bioOverride?: string;
  avatarUrl?: string;
  verified: boolean;
  themePreset: string;
  customBrandColor?: string;
  buttonStyle: string;
  customLinks: Array<{ title: string; url: string; icon?: string; order: number }>;
  website?: string;
  linkedin?: string;
  instagramUrl?: string;
  products: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    pricing_type: string;
    product_type?: string;
    course_id?: string;
    e_learning_subtype?: string;
  }>;
  blogPosts: Array<{
    id: string;
    title: string;
    description?: string;
    featured_image_url?: string;
    published_at: string;
  }>;
  hasAppointments: boolean;
}

export function StorefrontView({
  expertId,
  expertName,
  expertBio,
  bioOverride,
  avatarUrl,
  verified,
  themePreset,
  customBrandColor,
  buttonStyle,
  customLinks,
  website,
  linkedin,
  instagramUrl,
  products,
  blogPosts,
  hasAppointments,
}: StorefrontViewProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const [cssVars, setCssVars] = useState<Record<string, string>>({});

  useEffect(() => {
    const vars: Record<string, string> = {};
    if (customBrandColor) {
      vars["--brand-color"] = customBrandColor;
    }
    setCssVars(vars);
  }, [customBrandColor]);

  const getButtonClasses = () => {
    const base = "w-full py-4 px-6 font-semibold transition-all duration-300 text-center";
    
    switch (buttonStyle) {
      case "rounded-full":
        return `${base} rounded-full`;
      case "rounded-md":
        return `${base} rounded-md`;
      case "hard-edge":
        return `${base} rounded-none`;
      case "outline":
        return `${base} rounded-md border-2 bg-transparent`;
      default:
        return `${base} rounded-md`;
    }
  };

  const getThemeClasses = () => {
    switch (themePreset) {
      case "midnight-glass":
        return "bg-[#0A0A0A] text-white min-h-screen";
      case "minimal-light":
        return "bg-white text-black min-h-screen";
      case "bold-dark":
        return "bg-black text-white min-h-screen";
      default:
        return "bg-[#0A0A0A] text-white min-h-screen";
    }
  };

  const getButtonStyle = () => {
    if (!customBrandColor) return {};
    
    if (buttonStyle === "outline") {
      return {
        borderColor: customBrandColor,
        color: customBrandColor,
      };
    }
    
    return {
      backgroundColor: customBrandColor,
      color: themePreset === "minimal-light" ? "#000000" : "#FFFFFF",
    };
  };

  // Combine custom links with social links
  const allLinks = [
    ...customLinks,
    ...(website ? [{ title: "Website", url: website, icon: "🌐", order: 1000 }] : []),
    ...(linkedin ? [{ title: "LinkedIn", url: linkedin, icon: "💼", order: 1001 }] : []),
    ...(instagramUrl ? [{ title: "Instagram", url: instagramUrl, icon: "📷", order: 1002 }] : []),
  ].sort((a, b) => a.order - b.order);

  return (
    <div className={`${getThemeClasses()} relative`} style={cssVars}>
      {/* Background blur effect for glass theme */}
      {themePreset === "midnight-glass" && (
        <div className="fixed inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] ambient-glow opacity-30"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] ambient-glow opacity-20"></div>
        </div>
      )}

      {/* Mobile-first container - centered on desktop */}
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Avatar Section */}
        <div className="flex flex-col items-center space-y-4 mb-8">
          {avatarUrl ? (
            <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-white/10">
              <Image
                src={avatarUrl}
                alt={expertName}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-28 h-28 rounded-full mesh-gradient border-2 border-white/5 flex items-center justify-center">
              <svg className="w-14 h-14 text-gray-700 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <h1 className="text-3xl font-bold">{expertName}</h1>
              {verified && (
                <span className="text-white" title="Verified Expert">✓</span>
              )}
            </div>
            <p className="text-sm opacity-80 leading-relaxed">
              {bioOverride || expertBio || "Welcome to my storefront"}
            </p>
          </div>
        </div>

        {/* Social Icons Row */}
        {allLinks.length > 0 && (
          <div className="flex justify-center gap-4 mb-6">
            {allLinks.slice(0, 5).map((link, idx) => (
              <a
                key={idx}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all duration-300"
              >
                {link.icon ? (
                  <span className="text-xl">{link.icon}</span>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                )}
              </a>
            ))}
          </div>
        )}

        {/* Custom Links */}
        {allLinks.length > 0 && (
          <div className="space-y-3 mb-6">
            {allLinks.map((link, idx) => (
              <a
                key={idx}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${getButtonClasses()} block hover:opacity-90`}
                style={getButtonStyle()}
              >
                {link.title}
              </a>
            ))}
          </div>
        )}

        {/* Products */}
        {products.length > 0 && (
          <div className="space-y-3 mb-6">
            <h2 className="text-lg font-semibold mb-4">Products & Services</h2>
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-all duration-300 card-hover"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                    {product.description && (
                      <p className="text-sm opacity-70 line-clamp-2 mb-3" dangerouslySetInnerHTML={{ __html: product.description }} />
                    )}
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold">
                        {product.price === 0 ? "Free" : `$${product.price} ${product.pricing_type === "hourly" ? "/hr" : ""}`}
                      </span>
                      {product.e_learning_subtype && (
                        <span className="text-xs px-2 py-1 bg-white/10 rounded-full">
                          {product.e_learning_subtype}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {product.course_id && user && (
                  <div className="mt-4">
                    <CourseEnrollment
                      courseId={product.course_id}
                      expertId={expertId}
                      coursePrice={product.price}
                      isFree={product.price === 0}
                      currentUserId={user.id}
                    />
                  </div>
                )}
                {!product.course_id && (
                  <Link
                    href={`/expert/${expertId}`}
                    className={`${getButtonClasses()} mt-4 inline-block`}
                    style={getButtonStyle()}
                  >
                    Learn More
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Appointments CTA */}
        {hasAppointments && (
          <Link
            href={`/appointments/book/${expertId}`}
            className={`${getButtonClasses()} mb-6 block`}
            style={getButtonStyle()}
          >
            Book 1-on-1 Session
          </Link>
        )}

        {/* Blog Posts */}
        {blogPosts.length > 0 && (
          <div className="space-y-3 mb-6">
            <h2 className="text-lg font-semibold mb-4">Latest Posts</h2>
            {blogPosts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.id}`}
                className="block bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-all duration-300 card-hover"
              >
                {post.featured_image_url && (
                  <div className="relative w-full h-48 rounded-lg overflow-hidden mb-3">
                    <Image
                      src={post.featured_image_url}
                      alt={post.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <h3 className="font-semibold text-lg mb-2">{post.title}</h3>
                {post.description && (
                  <p className="text-sm opacity-70 line-clamp-2">{post.description}</p>
                )}
              </Link>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-white/5">
          <p className="text-xs opacity-50">Powered by Sito</p>
        </div>
      </div>
    </div>
  );
}
