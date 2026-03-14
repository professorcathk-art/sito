"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { StorefrontBlock } from "@/types/storefront";
import { THEME_PRESETS, type ThemePresetId } from "@/lib/storefront-theme-config";

function BlocksPreview({
  blocks,
  profileData,
  expertName,
  expertBio,
  expertAvatar,
  verified,
  products,
  cardClass,
  getButtonClasses,
  getButtonStyle,
}: {
  blocks: StorefrontBlock[];
  profileData?: { name: string; title: string; bio: string; avatarUrl: string; website?: string; linkedin?: string; instagramUrl?: string };
  expertName: string;
  expertBio: string;
  expertAvatar?: string;
  verified: boolean;
  products: Array<{ id: string; name: string; price: number; pricing_type: string }>;
  cardClass: string;
  getButtonClasses: () => string;
  getButtonStyle: () => React.CSSProperties;
}) {
  const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order);
  const name = profileData?.name || expertName;
  const bio = profileData?.bio ?? expertBio;
  const avatar = profileData?.avatarUrl || expertAvatar;

  return (
    <>
      {sortedBlocks.map((block) => {
        if (block.type === "header") {
          const d = block.data;
          const headerName = (d.name as string) || name;
          const headerTagline = (d.tagline as string) || profileData?.title || "";
          const headerBio = (d.bio as string) || bio;
          const headerAvatar = (d.avatarUrl as string) || avatar;
          return (
            <div key={block.id} className="flex flex-col items-center space-y-4">
              {headerAvatar ? (
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-slate-700">
                  <Image src={headerAvatar} alt={headerName} fill className="object-cover" />
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
                  <h1 className="text-2xl font-bold">{headerName}</h1>
                  {verified && <span title="Verified">✓</span>}
                </div>
                {headerTagline && <p className="text-sm mt-1 opacity-80">{headerTagline}</p>}
                <p className="text-sm mt-2 opacity-80 line-clamp-3">{headerBio || "Expert bio"}</p>
              </div>
            </div>
          );
        }
        if (block.type === "links") {
          const items = (block.data.items as Array<{ title: string; url: string; icon?: string; order: number; description?: string; thumbnailUrl?: string }>) || [];
          return (
            <div key={block.id} className="space-y-3">
              {items
                .filter((l) => l.title && l.url)
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3 hover:border-slate-600 transition-all"
                  >
                    {link.thumbnailUrl && (
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                        <Image src={link.thumbnailUrl} alt="" fill className="object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 text-left">
                      <span className="font-semibold block text-sm">{link.title}</span>
                      {link.description && <span className="text-xs opacity-80 block mt-0.5 line-clamp-1">{link.description}</span>}
                    </div>
                    <span className="text-xs shrink-0">→</span>
                  </a>
                ))}
            </div>
          );
        }
        if (block.type === "products") {
          const selectedIds = block.data.selectedProductIds as string[] | undefined;
          const legacyShow = (block.data.showProducts as boolean) !== false;
          const displayed =
            selectedIds !== undefined ? products.filter((p) => selectedIds.includes(p.id)) : legacyShow ? products : [];
          if (displayed.length === 0) return null;
          return (
            <div key={block.id} className="space-y-3">
              <h2 className="text-lg font-semibold mb-3">Products</h2>
              {displayed.slice(0, 3).map((product) => (
                <div key={product.id} className={`${cardClass} p-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{product.name}</h3>
                      <p className="text-sm opacity-70 mt-1">
                        {product.price === 0 ? "Free" : `$${product.price} ${product.pricing_type === "hourly" ? "/hr" : ""}`}
                      </p>
                    </div>
                    <div className={`${getButtonClasses()} w-24 text-sm`} style={getButtonStyle()}>
                      View
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        }
        if (block.type === "image_text") {
          const d = block.data;
          const imgUrl = d.imageUrl as string;
          const title = d.title as string;
          const text = d.text as string;
          return (
            <div key={block.id} className="space-y-3">
              {imgUrl && (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-800">
                  <Image src={imgUrl} alt={title || ""} fill className="object-cover" />
                </div>
              )}
              {title && <h3 className="text-lg font-semibold">{title}</h3>}
              {text && <p className="text-sm opacity-80">{text}</p>}
            </div>
          );
        }
        if (block.type === "faq") {
          const items = (block.data.items as Array<{ question: string; answer: string }>) || [];
          return (
            <div key={block.id} className="space-y-3">
              <h2 className="text-lg font-semibold mb-3">FAQ</h2>
              {items.filter((i) => i.question || i.answer).map((item, idx) => (
                <div key={idx} className={`${cardClass} p-4`}>
                  {item.question && <h4 className="font-medium mb-2">{item.question}</h4>}
                  {item.answer && <p className="text-sm opacity-80">{item.answer}</p>}
                </div>
              ))}
            </div>
          );
        }
        if (block.type === "testimonials") {
          const items = (block.data.items as Array<{ name: string; quote: string; avatarUrl?: string }>) || [];
          return (
            <div key={block.id} className="space-y-3">
              <h2 className="text-lg font-semibold mb-3">Testimonials</h2>
              {items.filter((i) => i.name || i.quote).map((item, idx) => (
                <div key={idx} className={`${cardClass} p-4`}>
                  {item.quote && <p className="text-sm opacity-90 italic">&quot;{item.quote}&quot;</p>}
                  {item.name && <p className="text-sm font-medium mt-2">— {item.name}</p>}
                </div>
              ))}
            </div>
          );
        }
        return null;
      })}
    </>
  );
}

interface StorefrontPreviewProps {
  themePreset: ThemePresetId;
  fontFamily?: string;
  backgroundType?: "solid" | "gradient" | "mesh";
  backgroundColor?: string;
  cardStyle?: string;
  buttonStyle: string;
  customBrandColor?: string;
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
  storefrontBlocks?: StorefrontBlock[];
  profileData?: {
    name: string;
    title: string;
    bio: string;
    avatarUrl: string;
    website: string;
    linkedin: string;
    instagramUrl: string;
  };
}

export function StorefrontPreview({
  themePreset,
  fontFamily = "font-sans",
  backgroundType,
  backgroundColor,
  cardStyle,
  buttonStyle,
  customBrandColor,
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
  storefrontBlocks,
  profileData,
}: StorefrontPreviewProps) {
  const [cssVars, setCssVars] = useState<Record<string, string>>({});

  const preset = THEME_PRESETS[themePreset] ?? THEME_PRESETS.minimal;
  const isLightTheme = themePreset === "minimal" || themePreset === "soft-gradient" || themePreset === "neo-brutalist";

  useEffect(() => {
    const vars: Record<string, string> = {};
    if (customBrandColor) vars["--brand-color"] = customBrandColor;
    if (backgroundColor) vars["--storefront-bg"] = backgroundColor;
    setCssVars(vars);
  }, [customBrandColor, backgroundColor]);

  const getButtonClasses = () => {
    const base = "w-full py-3 px-4 font-semibold transition-all duration-300";
    const radius = buttonStyle === "rounded-full" ? "rounded-full" : buttonStyle === "sharp" ? "rounded-none" : "rounded-md";
    return `${base} ${preset.button} ${radius}`;
  };

  const getButtonStyle = () => {
    if (customBrandColor) {
      return {
        backgroundColor: customBrandColor,
        color: isLightTheme ? "#111827" : "#FFFFFF",
      };
    }
    return {};
  };

  const wrapperClass = [preset.wrapper, fontFamily].filter(Boolean).join(" ");

  return (
    <div className="sticky top-4 flex justify-center">
      {/* Mobile Phone Frame */}
      <div className="relative w-[375px] h-[812px] bg-slate-800 rounded-[2.5rem] p-2 shadow-2xl">
        {/* Phone Notch */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-10"></div>
        
        {/* Screen Content */}
        <div
          className={`relative w-full h-full rounded-[2rem] overflow-y-auto ${wrapperClass}`}
          style={{ ...cssVars, ...(backgroundColor && backgroundType === "solid" ? { backgroundColor } : {}) }}
        >
          {preset.glowElement && <div className={preset.glowElement} aria-hidden />}
          {/* Storefront Content */}
          <div className="p-6 space-y-6">
            {storefrontBlocks && storefrontBlocks.length > 0 ? (
              <BlocksPreview
                blocks={storefrontBlocks}
                profileData={profileData}
                expertName={expertName}
                expertBio={expertBio}
                expertAvatar={expertAvatar}
                verified={verified}
                products={products}
                cardClass={preset.card}
                getButtonClasses={getButtonClasses}
                getButtonStyle={getButtonStyle}
              />
            ) : (
              <>
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
                      className={`${getButtonClasses()} block text-center hover:opacity-90`}
                      style={getButtonStyle()}
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
                  <div key={product.id} className={`${preset.card} p-4`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{product.name}</h3>
                        <p className="text-sm opacity-70 mt-1">
                          {product.price === 0 ? "Free" : `$${product.price} ${product.pricing_type === "hourly" ? "/hr" : ""}`}
                        </p>
                      </div>
                      <div className={`${getButtonClasses()} w-24 text-sm`} style={getButtonStyle()}>
                        View
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Appointments CTA */}
            {showAppointments && (
              <button className={`${getButtonClasses()} w-full`} style={getButtonStyle()}>
                Book 1-on-1 Session
              </button>
            )}

            {/* Blog Posts */}
            {showBlog && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold mb-3">Latest Posts</h2>
                <div className={`${preset.card} p-4`}>
                  <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                </div>
              </div>
            )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
