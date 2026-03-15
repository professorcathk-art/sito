"use client";

import { useMemo } from "react";
import Image from "next/image";
import type { StorefrontBlock } from "@/types/storefront";
import { FONT_FAMILIES, getCardCssVars, THEME_PRESET_VALUES } from "@/lib/storefront-theme-config";

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
                  {verified && (
                  <svg className="w-5 h-5 text-blue-500 inline-block shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-label="Verified">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                )}
                </div>
                {headerTagline && <p className="text-sm mt-1 opacity-80 text-[var(--store-text)]">{headerTagline}</p>}
                <p className="text-sm mt-2 opacity-80 line-clamp-3 text-[var(--store-text)]">{headerBio || "Expert bio"}</p>
              </div>
            </div>
          );
        }
        if (block.type === "links") {
          const items = (block.data.items as Array<{ title: string; url: string; icon?: string; order: number; description?: string; thumbnailUrl?: string; emoji?: string }>) || [];
          const textAlign = (block.data.textAlign as "left" | "center" | "right") || "left";
          const alignClass = textAlign === "center" ? "text-center" : textAlign === "right" ? "text-right" : "text-left";
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
                    className="group flex items-center p-3 bg-[var(--store-card-bg)] border border-[var(--store-card-border)] rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-pointer"
                  >
                    {link.emoji?.trim() ? (
                      <div className="w-12 h-12 rounded-xl flex-shrink-0 bg-[var(--store-card-border)]/30 flex items-center justify-center text-2xl">
                        {link.emoji.trim()}
                      </div>
                    ) : link.thumbnailUrl ? (
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                        <Image src={link.thumbnailUrl} alt="" fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[var(--store-card-border)]/30 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--store-text)" }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                    )}
                    <div className={`flex-1 min-w-0 ml-3 ${alignClass}`}>
                      <span className="font-semibold block text-sm text-[var(--store-text)]">{link.title}</span>
                      {link.description && <span className="text-xs opacity-70 block mt-0.5 line-clamp-1 text-[var(--store-text)]">{link.description}</span>}
                    </div>
                    <svg className="w-5 h-5 opacity-40 group-hover:translate-x-1 transition-transform flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--store-text)" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
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
        if (block.type === "rich_text") {
          const content = (block.data.content as string) || "";
          if (!content.trim()) return null;
          return (
            <div key={block.id} className="w-full">
              <div className="prose prose-sm max-w-none text-[var(--store-text)]" dangerouslySetInnerHTML={{ __html: content }} />
            </div>
          );
        }
        if (block.type === "image_banner") {
          const imageUrl = block.data.imageUrl as string;
          if (!imageUrl) return null;
          return (
            <div key={block.id} className="w-full">
              <img src={imageUrl} alt="Banner" className="w-full h-auto rounded-2xl object-cover shadow-sm" />
            </div>
          );
        }
        if (block.type === "bullet_list") {
          const items = (block.data.items as string[]) || [];
          if (items.length === 0) return null;
          return (
            <div key={block.id} className="w-full">
              <ul className="space-y-2 list-none">
                {items.filter(Boolean).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-[var(--store-text)]">
                    <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center bg-[var(--store-btn-bg)]/30" style={{ color: "var(--store-btn-bg)" }}>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="text-sm opacity-90">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        }
        if (block.type === "social_media") {
          const platforms = (block.data.platforms as string[]) || [];
          if (platforms.length === 0) return null;
          return (
            <div key={block.id} className="w-full flex justify-center gap-4 py-2">
              {platforms.slice(0, 5).map((p) => (
                <div key={p} className="w-8 h-8 rounded-full bg-[var(--store-card-bg)] border border-[var(--store-card-border)] flex items-center justify-center">
                  <span className="text-sm opacity-70">{p === "instagram" ? "📷" : p === "tiktok" ? "🎵" : p === "linkedin" ? "💼" : p === "twitter" ? "𝕏" : "▶"}</span>
                </div>
              ))}
            </div>
          );
        }
        if (block.type === "book_me") {
          return (
            <div key={block.id} className="w-full flex justify-center">
              <div className="py-3 px-6 font-semibold bg-[var(--store-btn-bg)] text-[var(--store-btn-text)] rounded-full text-sm">
                Book Me
              </div>
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
  const themePreset = designState.themePreset as string | undefined;
  const isPearlSilk = themePreset === "pearl-silk" || themePreset === "soft-gradient";
  const isFluidAura = themePreset === "fluid-aura";
  const isMidnightGlass = themePreset === "midnight-glass";

  const cssVars = useMemo(() => {
    const presetValues = themePreset && themePreset in THEME_PRESET_VALUES
      ? THEME_PRESET_VALUES[themePreset as keyof typeof THEME_PRESET_VALUES]
      : null;
    const cardStyle = (presetValues?.cardStyle ?? designState.cardStyle) as "flat" | "glass" | "brutalist" | "soft-shadow";
    const card = getCardCssVars(cardStyle);
    const btnRadius = (presetValues?.buttonRadius ?? designState.buttonRadius) === "pill" ? "9999px" : designState.buttonRadius === "sharp" ? "0" : "0.5rem";
    return {
      "--store-bg": presetValues?.backgroundColor ?? designState.backgroundColor,
      "--store-text": presetValues?.textColor ?? designState.textColor,
      "--store-btn-bg": presetValues?.buttonColor ?? designState.buttonColor,
      "--store-btn-text": presetValues?.buttonTextColor ?? designState.buttonTextColor,
      "--store-card-bg": card.bg,
      "--store-card-border": card.border,
      "--store-btn-radius": btnRadius,
    } as React.CSSProperties;
  }, [designState, themePreset]);

  const backgroundStyle = useMemo(() => {
    if (isFluidAura) return "#050505";
    if (isPearlSilk) return "conic-gradient(at top right, #fdf2f8 0%, #f8fafc 50%, #fffbeb 100%)";
    if (isMidnightGlass) return "#0A0A0A";
    if (themePreset === "minimal") return "#FAFAFA";
    if (themePreset === "neo-brutalist") return "#FEF08A";
    if (designState.backgroundColor.startsWith("linear") || designState.backgroundColor.startsWith("conic")) return designState.backgroundColor;
    if (designState.backgroundColor.startsWith("#")) return designState.backgroundColor;
    return "var(--store-bg)";
  }, [designState.backgroundColor, isFluidAura, isPearlSilk, isMidnightGlass, themePreset]);

  const fontClass = FONT_FAMILIES.find((f) => f.id === designState.fontFamily)?.class || "font-store-inter";
  const fontVarMap: Record<string, string> = {
    inter: "var(--font-inter)",
    roboto: "var(--font-roboto)",
    playfair: "var(--font-playfair)",
    "space-grotesk": "var(--font-space-grotesk)",
    "dm-sans": "var(--font-dm-sans)",
  };
  const fontFamilyStyle = fontVarMap[designState.fontFamily] || "var(--font-inter)";

  return (
    <div className="sticky top-4 flex justify-center min-w-0">
      <div className="relative w-[375px] min-w-[375px] h-[812px] bg-slate-800 rounded-[2.5rem] p-2 shadow-2xl flex-shrink-0">
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-10" aria-hidden />
        <div
          className="relative w-full min-w-[343px] h-full rounded-[2rem] overflow-y-auto overflow-x-hidden"
          style={{
            ...cssVars,
            background: backgroundStyle,
            color: "var(--store-text)",
            fontFamily: fontFamilyStyle,
          }}
        >
          {isFluidAura && (
            <>
              <div className="absolute top-0 -left-4 w-32 h-32 bg-fuchsia-600 rounded-full mix-blend-screen opacity-40 -z-10" style={{ filter: "blur(64px)" }} aria-hidden />
              <div className="absolute top-0 -right-4 w-32 h-32 bg-cyan-600 rounded-full mix-blend-screen opacity-40 -z-10" style={{ filter: "blur(64px)" }} aria-hidden />
              <div className="absolute -bottom-4 left-8 w-32 h-32 bg-violet-600 rounded-full mix-blend-screen opacity-40 -z-10" style={{ filter: "blur(64px)" }} aria-hidden />
            </>
          )}
          {!isFluidAura && designState.glowElement && <div className={designState.glowElement} aria-hidden />}
          <div className={`p-6 space-y-6 ${fontClass}`} style={{ fontFamily: fontFamilyStyle }}>
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
                      {verified && (
                      <svg className="w-5 h-5 text-blue-500 inline-block shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-label="Verified">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                      </svg>
                    )}
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
