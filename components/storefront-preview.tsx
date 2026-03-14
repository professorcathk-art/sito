"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface StorefrontPreviewProps {
  themePreset: string;
  customBrandColor?: string;
  buttonStyle: string;
  customLinks: Array<{ title: string; url: string; icon?: string; order: number }>;
  showProducts: boolean;
  showAppointments: boolean;
  showBlog: boolean;
  bioOverride?: string;
  expertName: string;
  expertBio: string;
  expertAvatar?: string;
  verified: boolean;
  products: Array<{ id: string; name: string; price: number; pricing_type: string }>;
}

export function StorefrontPreview({
  themePreset,
  customBrandColor,
  buttonStyle,
  customLinks,
  showProducts,
  showAppointments,
  showBlog,
  bioOverride,
  expertName,
  expertBio,
  expertAvatar,
  verified,
  products,
}: StorefrontPreviewProps) {
  const [cssVars, setCssVars] = useState<Record<string, string>>({});

  useEffect(() => {
    const vars: Record<string, string> = {};
    if (customBrandColor) {
      vars["--brand-color"] = customBrandColor;
    }
    setCssVars(vars);
  }, [customBrandColor]);

  const getButtonClasses = () => {
    const base = "w-full py-3 px-4 font-semibold transition-all duration-300";
    const brandColor = customBrandColor || "#FFFFFF";
    
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
        return "bg-slate-950 text-slate-50";
      case "minimal-light":
        return "bg-white text-slate-900";
      case "bold-dark":
        return "bg-slate-950 text-slate-50";
      default:
        return "bg-slate-950 text-slate-50";
    }
  };

  return (
    <div className="sticky top-4 flex justify-center">
      {/* Mobile Phone Frame */}
      <div className="relative w-[375px] h-[812px] bg-slate-800 rounded-[2.5rem] p-2 shadow-2xl">
        {/* Phone Notch */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-10"></div>
        
        {/* Screen Content */}
        <div 
          className={`w-full h-full rounded-[2rem] overflow-y-auto ${getThemeClasses()}`}
          style={cssVars}
        >
          {/* Storefront Content */}
          <div className="p-6 space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-4">
              {expertAvatar ? (
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-slate-700">
                  <Image
                    src={expertAvatar}
                    alt={expertName}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-700 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <h1 className="text-2xl font-bold">{expertName}</h1>
                  {verified && (
                    <span className="text-white" title="Verified">✓</span>
                  )}
                </div>
                <p className="text-sm mt-2 opacity-80 line-clamp-3">
                  {bioOverride || expertBio || "Expert bio goes here"}
                </p>
              </div>
            </div>

            {/* Social Links */}
            {customLinks.length > 0 && (
              <div className="flex justify-center gap-4">
                {customLinks
                  .sort((a, b) => a.order - b.order)
                  .map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-slate-700 transition-colors"
                    >
                      {link.icon ? (
                        <span className="text-lg">{link.icon}</span>
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
            {customLinks.length > 0 && (
              <div className="space-y-3">
                {customLinks
                  .sort((a, b) => a.order - b.order)
                  .map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${getButtonClasses()} block text-center border-white/10 hover:opacity-90`}
                      style={customBrandColor && buttonStyle === "outline" ? { 
                        borderColor: customBrandColor,
                        color: customBrandColor 
                      } : customBrandColor ? {
                        backgroundColor: customBrandColor,
                        color: themePreset === "minimal-light" ? "#000000" : "#FFFFFF"
                      } : {}}
                    >
                      {link.title}
                    </a>
                  ))}
              </div>
            )}

            {/* Products */}
            {showProducts && products.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold mb-3">Products</h2>
                {products.slice(0, 3).map((product) => (
                  <div
                    key={product.id}
                    className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:bg-slate-700 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{product.name}</h3>
                        <p className="text-sm opacity-70 mt-1">
                          {product.price === 0 ? "Free" : `$${product.price} ${product.pricing_type === "hourly" ? "/hr" : ""}`}
                        </p>
                      </div>
                      <div className={`${getButtonClasses()} w-24 text-sm`} style={customBrandColor ? {
                        backgroundColor: customBrandColor,
                        color: themePreset === "minimal-light" ? "#000000" : "#FFFFFF"
                      } : {}}>
                        View
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Appointments CTA */}
            {showAppointments && (
              <button
                className={`${getButtonClasses()} w-full`}
                style={customBrandColor ? {
                  backgroundColor: customBrandColor,
                  color: themePreset === "minimal-light" ? "#000000" : "#FFFFFF"
                } : {}}
              >
                Book 1-on-1 Session
              </button>
            )}

            {/* Blog Posts */}
            {showBlog && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold mb-3">Latest Posts</h2>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
