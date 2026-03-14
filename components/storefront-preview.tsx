"use client";

import { useMemo } from "react";
import Image from "next/image";
import type { StorefrontBlock } from "@/types/storefront";
import { FONT_FAMILIES, getCardCssVars } from "@/lib/storefront-theme-config";

export interface DesignState {
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  buttonTextColor: string;
  fontFamily: string;
  cardStyle: string;
  buttonRadius: string;
  themePreset?: string;
  glowElement?: string;
}

function BlocksPreview({
  blocks,
  profileData,
  expertName,
  expertBio,
  expertAvatar,
  verified,
  products,
  fontClass,
}: {
  blocks: StorefrontBlock[];
  profileData?: { name: string; title: string; bio: string; avatarUrl: string; website?: string; linkedin?: string; instagramUrl?: string };
  expertName: string;
  expertBio: string;
  expertAvatar?: string;
  verified: boolean;
  products: Array<{ id: string; name: string; price: number; pricing_type: string }>;
  fontClass: string;
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
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-[var(--store-card-border)]">
                  <Image src={headerAvatar} alt={headerName} fill className="object-cover" />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-[var(--store-card-bg)] border-2 border-[var(--store-card-border)] flex items-center justify-center">
                  <svg className="w-12 h-12 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--store-text)" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
              <div className={`text-center ${fontClass}`}>
                <div className="flex items-center justify-center gap-2">
                  <h1 className="text-2xl font-bold text-[var(--store-text)]">{headerName}</h1>
                  {verified && <span title="Verified" className="text-[var(--store-text)]">✓</span>}
                </div>
                {headerTagline && <p className="text-sm mt-1 opacity-80 text-[var(--store-text)]">{headerTagline}</p>}
                <p className="text-sm mt-2 opacity-80 line-clamp-3 text-[var(--store-text)]">{headerBio || "Expert bio"}</p>
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
                    className="flex items-center gap-3 bg-[var(--store-card-bg)] border border-[var(--store-card-border)] rounded-xl p-3 hover:opacity-90 transition-all min-w-0"
                  >
                    {link.thumbnailUrl && (
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                        <Image src={link.thumbnailUrl} alt="" fill className="object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 text-left">
                      <span className="font-semibold block text-sm text-[var(--store-text)]">{link.title}</span>
                      {link.description && <span className="text-xs opacity-80 block mt-0.5 line-clamp-1 text-[var(--store-text)]">{link.description}</span>}
                    </div>
                    <span className="text-xs shrink-0 text-[var(--store-text)]">→</span>
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
              <h2 className="text-lg font-semibold mb-3 text-[var(--store-text)]">Products</h2>
              {displayed.slice(0, 3).map((product) => (
                <div key={product.id} className="bg-[var(--store-card-bg)] border border-[var(--store-card-border)] rounded-xl p-4 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[var(--store-text)] truncate">{product.name}</h3>
                      <p className="text-sm opacity-70 mt-1 text-[var(--store-text)]">
                        {product.price === 0 ? "Free" : `$${product.price} ${product.pricing_type === "hourly" ? "/hr" : ""}`}
                      </p>
                    </div>
                    <div className="bg-[var(--store-btn-bg)] text-[var(--store-btn-text)] w-24 text-sm py-2 rounded-lg text-center font-semibold flex-shrink-0">
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
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[var(--store-card-bg)]">
                  <Image src={imgUrl} alt={title || ""} fill className="object-cover" />
                </div>
              )}
              {title && <h3 className="text-lg font-semibold text-[var(--store-text)]">{title}</h3>}
              {text && <p className="text-sm opacity-80 text-[var(--store-text)]">{text}</p>}
            </div>
          );
        }
        if (block.type === "faq") {
          const items = (block.data.items as Array<{ question: string; answer: string }>) || [];
          return (
            <div key={block.id} className="space-y-3">
              <h2 className="text-lg font-semibold mb-3 text-[var(--store-text)]">FAQ</h2>
              {items.filter((i) => i.question || i.answer).map((item, idx) => (
                <div key={idx} className="bg-[var(--store-card-bg)] border border-[var(--store-card-border)] rounded-xl p-4">
                  {item.question && <h4 className="font-medium mb-2 text-[var(--store-text)]">{item.question}</h4>}
                  {item.answer && <p className="text-sm opacity-80 text-[var(--store-text)]">{item.answer}</p>}
                </div>
              ))}
            </div>
          );
        }
        if (block.type === "testimonials") {
          const items = (block.data.items as Array<{ name: string; quote: string; avatarUrl?: string }>) || [];
          return (
            <div key={block.id} className="space-y-3">
              <h2 className="text-lg font-semibold mb-3 text-[var(--store-text)]">Testimonials</h2>
              {items.filter((i) => i.name || i.quote).map((item, idx) => (
                <div key={idx} className="bg-[var(--store-card-bg)] border border-[var(--store-card-border)] rounded-xl p-4">
                  {item.quote && <p className="text-sm opacity-90 italic text-[var(--store-text)]">&quot;{item.quote}&quot;</p>}
                  {item.name && <p className="text-sm font-medium mt-2 text-[var(--store-text)]">— {item.name}</p>}
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
  designState: DesignState;
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
    website?: string;
    linkedin?: string;
    instagramUrl?: string;
  };
}

export function StorefrontPreview({
  designState,
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
  const cssVars = useMemo(() => {
    const card = getCardCssVars(designState.cardStyle as "flat" | "glass" | "brutalist" | "soft-shadow");
    const btnRadius = designState.buttonRadius === "pill" ? "9999px" : designState.buttonRadius === "sharp" ? "0" : "0.5rem";
    return {
      "--store-bg": designState.backgroundColor,
      "--store-text": designState.textColor,
      "--store-btn-bg": designState.buttonColor,
      "--store-btn-text": designState.buttonTextColor,
      "--store-card-bg": card.bg,
      "--store-card-border": card.border,
      "--store-btn-radius": btnRadius,
    } as React.CSSProperties;
  }, [designState]);

  const fontClass = FONT_FAMILIES.find((f) => f.id === designState.fontFamily)?.class || "font-store-inter";

  return (
    <div className="sticky top-4 flex justify-center min-w-0">
      <div className="relative w-[375px] min-w-[375px] h-[812px] bg-slate-800 rounded-[2.5rem] p-2 shadow-2xl flex-shrink-0">
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-10" aria-hidden />
        <div
          className="relative w-full min-w-[343px] h-full rounded-[2rem] overflow-y-auto overflow-x-hidden"
          style={{
            ...cssVars,
            background: designState.backgroundColor.startsWith("linear") ? designState.backgroundColor : "var(--store-bg)",
            color: "var(--store-text)",
          }}
        >
          {designState.glowElement && <div className={designState.glowElement} aria-hidden />}
          <div className={`p-6 space-y-6 ${fontClass}`}>
            {storefrontBlocks && storefrontBlocks.length > 0 ? (
              <BlocksPreview
                blocks={storefrontBlocks}
                profileData={profileData}
                expertName={expertName}
                expertBio={expertBio}
                expertAvatar={expertAvatar}
                verified={verified}
                products={products}
                fontClass={fontClass}
              />
            ) : (
              <>
                <div className="flex flex-col items-center space-y-4">
                  {expertAvatar ? (
                    <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-[var(--store-card-border)]">
                      <Image src={expertAvatar} alt={expertName} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-[var(--store-card-bg)] border-2 border-[var(--store-card-border)] flex items-center justify-center">
                      <svg className="w-12 h-12 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--store-text)" }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <h1 className="text-2xl font-bold text-[var(--store-text)]">{expertName}</h1>
                      {verified && <span className="text-[var(--store-text)]" title="Verified">✓</span>}
                    </div>
                    <p className="text-sm mt-2 opacity-80 line-clamp-3 text-[var(--store-text)]">{bioOverride || expertBio || "Expert bio goes here"}</p>
                  </div>
                </div>
                {customLinks.length > 0 && (
                  <div className="flex justify-center gap-4">
                    {customLinks.sort((a, b) => a.order - b.order).map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-[var(--store-card-bg)] border border-[var(--store-card-border)] flex items-center justify-center hover:opacity-80 transition-colors"
                      >
                        {link.icon ? <span className="text-lg">{link.icon}</span> : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--store-text)" }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        )}
                      </a>
                    ))}
                  </div>
                )}
                {customLinks.length > 0 && (
                  <div className="space-y-3">
                    {customLinks.sort((a, b) => a.order - b.order).map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-center py-3 px-4 font-semibold rounded-lg bg-[var(--store-btn-bg)] text-[var(--store-btn-text)] hover:opacity-90"
                        style={{ borderRadius: "var(--store-btn-radius)" }}
                      >
                        {link.title}
                      </a>
                    ))}
                  </div>
                )}
                {showProducts && products.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-lg font-semibold mb-3 text-[var(--store-text)]">Products</h2>
                    {products.slice(0, 3).map((product) => (
                      <div key={product.id} className="bg-[var(--store-card-bg)] border border-[var(--store-card-border)] rounded-xl p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-[var(--store-text)] truncate">{product.name}</h3>
                            <p className="text-sm opacity-70 mt-1 text-[var(--store-text)]">
                              {product.price === 0 ? "Free" : `$${product.price} ${product.pricing_type === "hourly" ? "/hr" : ""}`}
                            </p>
                          </div>
                          <div className="bg-[var(--store-btn-bg)] text-[var(--store-btn-text)] w-24 text-sm py-2 rounded-lg text-center font-semibold flex-shrink-0" style={{ borderRadius: "var(--store-btn-radius)" }}>
                            View
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {showAppointments && (
                  <div className="py-3 px-4 font-semibold rounded-lg bg-[var(--store-btn-bg)] text-[var(--store-btn-text)] text-center" style={{ borderRadius: "var(--store-btn-radius)" }}>
                    Book 1-on-1 Session
                  </div>
                )}
                {showBlog && (
                  <div className="space-y-3">
                    <h2 className="text-lg font-semibold mb-3 text-[var(--store-text)]">Latest Posts</h2>
                    <div className="bg-[var(--store-card-bg)] border border-[var(--store-card-border)] rounded-xl p-4">
                      <div className="h-4 rounded w-3/4 mb-2 opacity-50" style={{ backgroundColor: "var(--store-text)" }} />
                      <div className="h-3 rounded w-1/2 opacity-50" style={{ backgroundColor: "var(--store-text)" }} />
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
