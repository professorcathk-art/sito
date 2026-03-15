"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { CourseEnrollment } from "@/components/course-enrollment";
import { BookingModal } from "@/components/booking-modal";
import type { StorefrontBlock } from "@/types/storefront";
import { FONT_FAMILIES, getCardCssVars, getButtonStyleClasses } from "@/lib/storefront-theme-config";

function getDomainFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function LinkThumbnail({ thumbnailUrl, url, emoji }: { thumbnailUrl?: string; url: string; emoji?: string }) {
  const [faviconFailed, setFaviconFailed] = useState(false);
  const domain = useMemo(() => getDomainFromUrl(url), [url]);

  if (emoji?.trim()) {
    return (
      <div className="w-12 h-12 rounded-xl flex-shrink-0 bg-white/5 flex items-center justify-center text-2xl">
        {emoji.trim()}
      </div>
    );
  }
  if (thumbnailUrl) {
    return (
      <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
        <Image src={thumbnailUrl} alt="" fill className="object-cover" />
      </div>
    );
  }
  if (domain && !faviconFailed) {
    return (
      <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-white/5 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
          alt=""
          className="w-8 h-8 object-contain"
          onError={() => setFaviconFailed(true)}
        />
      </div>
    );
  }
  return null;
}

export interface StorefrontDesignState {
  backgroundColor: string;
  backgroundImageUrl?: string;
  textColor: string;
  subheadlineColor?: string;
  buttonColor: string;
  buttonTextColor: string;
  fontFamily: string;
  cardStyle: string;
  buttonRadius: string;
  buttonStyle?: string;
  themePreset?: string;
  glowElement?: string;
}

interface StorefrontViewProps {
  expertId: string;
  expertName: string;
  expertBio: string;
  expertTagline?: string;
  bioOverride?: string;
  avatarUrl?: string;
  verified: boolean;
  designState: StorefrontDesignState;
  customLinks: Array<{ title: string; url: string; icon?: string; order: number }>;
  website?: string;
  linkedin?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  twitterUrl?: string;
  youtubeUrl?: string;
  storefrontBackgroundImageUrl?: string;
  products: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    pricing_type: string;
    product_type?: string;
    course_id?: string;
    e_learning_subtype?: string;
    cover_image_url?: string | null;
  }>;
  blogPosts: Array<{
    id: string;
    title: string;
    description?: string;
    featured_image_url?: string;
    published_at: string;
  }>;
  hasAppointments: boolean;
  storefrontBlocks?: StorefrontBlock[];
}

export function StorefrontView({
  expertId,
  expertName,
  expertBio,
  expertTagline,
  bioOverride,
  avatarUrl,
  verified,
  designState,
  customLinks,
  website,
  linkedin,
  instagramUrl,
  tiktokUrl,
  twitterUrl,
  youtubeUrl,
  storefrontBackgroundImageUrl,
  products,
  blogPosts,
  hasAppointments,
  storefrontBlocks = [],
}: StorefrontViewProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const [openBookingModal, setOpenBookingModal] = useState(false);

  const isFluidAura = designState.themePreset === "fluid-aura";
  const isPearlSilk = designState.themePreset === "pearl-silk" || designState.themePreset === "soft-gradient";
  const isDarkTheme = ["neon-cyber", "glass-ocean", "liquid-velvet", "midnight-glass"].includes(designState.themePreset || "");
  const effectiveBgImage = storefrontBackgroundImageUrl || designState.backgroundImageUrl;
  const cssVars = useMemo(() => {
    let card = getCardCssVars(designState.cardStyle as "flat" | "glass" | "brutalist" | "soft-shadow");
    if (isFluidAura) {
      card = { bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.1)" };
    } else if (isPearlSilk) {
      card = { bg: "rgba(255,255,255,0.4)", border: "rgba(255,255,255,0.6)" };
    }
    const btnRadius = designState.buttonRadius === "pill" ? "9999px" : designState.buttonRadius === "sharp" ? "0" : "0.5rem";
    return {
      "--store-bg-color": isFluidAura ? "#050505" : isPearlSilk ? undefined : designState.backgroundColor,
      "--store-bg-image": effectiveBgImage ? `url(${effectiveBgImage})` : "none",
      "--store-bg": isFluidAura ? "#050505" : isPearlSilk ? undefined : designState.backgroundColor,
      "--store-text": isFluidAura ? "#f1f5f9" : isPearlSilk ? "#1A1A1A" : designState.textColor,
      "--store-subheadline": designState.subheadlineColor || (isFluidAura ? "rgba(241,245,249,0.7)" : isPearlSilk ? "#4B5563" : designState.textColor),
      "--store-btn-bg": isFluidAura ? "rgba(255,255,255,0.1)" : isPearlSilk ? "#1A1A1A" : designState.buttonColor,
      "--store-btn-text": designState.buttonTextColor,
      "--store-card-bg": card.bg,
      "--store-card-border": card.border,
      "--store-btn-radius": btnRadius,
    } as React.CSSProperties;
  }, [designState, isFluidAura, isPearlSilk, effectiveBgImage]);

  const fontClass = FONT_FAMILIES.find((f) => f.id === designState.fontFamily)?.class || "font-store-inter";
  const fontVarMap: Record<string, string> = {
    inter: "var(--font-inter)",
    roboto: "var(--font-roboto)",
    playfair: "var(--font-playfair)",
    "space-grotesk": "var(--font-space-grotesk)",
    "dm-sans": "var(--font-dm-sans)",
    "jetbrains-mono": "var(--font-jetbrains-mono)",
  };
  const fontFamilyStyle = fontVarMap[designState.fontFamily] || "var(--font-inter)";

  const allLinks = [
    ...customLinks,
    ...(website ? [{ title: "Website", url: website, icon: "🌐", order: 1000 }] : []),
    ...(linkedin ? [{ title: "LinkedIn", url: linkedin, icon: "💼", order: 1001 }] : []),
    ...(instagramUrl ? [{ title: "Instagram", url: instagramUrl, icon: "📷", order: 1002 }] : []),
    ...(tiktokUrl ? [{ title: "TikTok", url: tiktokUrl, icon: "🎵", order: 1003 }] : []),
    ...(twitterUrl ? [{ title: "X", url: twitterUrl, icon: "𝕏", order: 1004 }] : []),
    ...(youtubeUrl ? [{ title: "YouTube", url: youtubeUrl, icon: "▶", order: 1005 }] : []),
  ].sort((a, b) => a.order - b.order);

  const blocksToRender: StorefrontBlock[] =
    storefrontBlocks.length > 0
      ? storefrontBlocks
      : [
          { id: "default-header", type: "header", order: 0, data: { name: expertName, tagline: expertTagline, bio: bioOverride || expertBio, avatarUrl } },
          ...(allLinks.length > 0
            ? [{ id: "default-links", type: "links" as const, order: 1, data: { items: allLinks.map((l, i) => ({ title: l.title, url: l.url, icon: l.icon, order: i })) } }]
            : []),
          ...(products.length > 0 ? [{ id: "default-products", type: "products" as const, order: 2, data: { showProducts: true } }] : []),
        ];

  if (blocksToRender.length > 0) {
    const sortedBlocks = [...blocksToRender].sort((a, b) => a.order - b.order);

    const wrapperClass = isFluidAura
      ? "min-h-screen relative overflow-hidden bg-[#050505]"
      : "min-h-screen relative";
    const hasBgImage = !!effectiveBgImage;
    const background =
      hasBgImage
        ? `url(${effectiveBgImage})`
        : isFluidAura
          ? undefined
          : isPearlSilk
            ? "conic-gradient(at top right, #fdf2f8 0%, #f8fafc 50%, #fffbeb 100%)"
            : designState.backgroundColor.startsWith("linear")
              ? designState.backgroundColor
              : designState.backgroundColor.startsWith("conic")
                ? designState.backgroundColor
                : "var(--store-bg-color, var(--store-bg))";
    const buttonStyleClass = getButtonStyleClasses(
      (designState.buttonStyle as "default" | "glass" | "neon" | "organic") || "default",
      designState.buttonColor,
      designState.buttonTextColor,
      designState.buttonRadius
    );
    return (
      <div
        className={`${wrapperClass} ${fontClass} ${hasBgImage ? "bg-cover bg-center bg-fixed bg-no-repeat" : ""}`}
        style={{
          ...cssVars,
          ...(background && {
            background,
            ...(hasBgImage && {
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              backgroundAttachment: "fixed",
            }),
          }),
          color: "var(--store-text)",
          fontFamily: fontFamilyStyle,
        }}
      >
        {isFluidAura && (
          <>
            <div className="absolute top-0 -left-4 w-96 h-96 bg-fuchsia-600 rounded-full mix-blend-screen opacity-40 animate-blob -z-10" style={{ filter: "blur(128px)" }} aria-hidden />
            <div className="absolute top-0 -right-4 w-96 h-96 bg-cyan-600 rounded-full mix-blend-screen opacity-40 animate-blob -z-10" style={{ filter: "blur(128px)", animationDelay: "2s" }} aria-hidden />
            <div className="absolute -bottom-8 left-20 w-96 h-96 bg-violet-600 rounded-full mix-blend-screen opacity-40 animate-blob -z-10" style={{ filter: "blur(128px)", animationDelay: "4s" }} aria-hidden />
          </>
        )}
        {!isFluidAura && designState.glowElement && <div className={designState.glowElement} aria-hidden />}
        {!isFluidAura && !["neon-cyber", "glass-ocean", "liquid-velvet", "midnight-glass"].includes(designState.themePreset || "") && (
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0" aria-hidden>
            <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[50%] rounded-full bg-indigo-100/50 blur-[120px] mix-blend-multiply" />
            <div className="absolute top-[20%] -right-[20%] w-[60%] h-[60%] rounded-full bg-rose-100/50 blur-[120px] mix-blend-multiply" />
            <div className="absolute -bottom-[10%] left-[10%] w-[80%] h-[50%] rounded-full bg-blue-100/50 blur-[120px] mix-blend-multiply" />
          </div>
        )}
        <div className="w-full min-h-screen flex flex-col items-center pb-12 relative z-0">
          <main className="w-full max-w-4xl sm:max-w-5xl md:max-w-6xl lg:max-w-7xl xl:max-w-7xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 flex flex-col gap-8">
            {sortedBlocks.map((block) => {
              if (block.type === "header") {
                const d = block.data;
                const name = (d.name as string) || expertName;
                const tagline = (d.tagline as string) || expertTagline || "";
                const bio = (d.bio as string) || bioOverride || expertBio || "";
                const img = (d.avatarUrl as string) || avatarUrl;
                const avatarRingClass = isFluidAura ? "ring-4 ring-white/20 shadow-xl" : "ring-4 ring-white shadow-xl";
                const nameClass = isFluidAura ? "text-2xl font-bold text-slate-100 mt-4 text-center tracking-tight" : "text-2xl font-bold text-slate-900 mt-4 text-center tracking-tight";
                const bioClass = isFluidAura ? "text-slate-400 text-sm text-center mt-2 leading-relaxed px-4 max-w-full" : "text-slate-500 text-sm text-center mt-2 leading-relaxed px-4 max-w-full";
                return (
                  <section key={block.id} className="flex flex-col items-center text-center">
                    {img ? (
                      <div className={`relative w-24 h-24 rounded-full overflow-hidden flex-shrink-0 ${avatarRingClass}`}>
                        <Image src={img} alt={name} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className={`w-24 h-24 rounded-full bg-[var(--store-card-bg)] flex items-center justify-center flex-shrink-0 ${avatarRingClass}`}>
                        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--store-text)" }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-2">
                      <h1 className={nameClass}>{name}</h1>
                      {verified && (
                        <svg className="w-5 h-5 text-blue-500 inline-block shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-label="Verified">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                      )}
                    </div>
                    {tagline && <p className="text-[var(--store-subheadline)] text-sm mt-1">{tagline}</p>}
                    {bio && <p className={bioClass}>{bio}</p>}
                    {(website || linkedin || instagramUrl || tiktokUrl || twitterUrl || youtubeUrl) && (
                      <div className="flex gap-3 mt-4 justify-center">
                        {website && <a href={website} target="_blank" rel="noopener noreferrer" className="text-[var(--store-text)] opacity-70 hover:opacity-100 transition-colors" aria-label="Website">🌐</a>}
                        {linkedin && <a href={linkedin} target="_blank" rel="noopener noreferrer" className="text-[var(--store-text)] opacity-70 hover:opacity-100 transition-colors" aria-label="LinkedIn">💼</a>}
                        {instagramUrl && <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--store-text)] opacity-70 hover:opacity-100 transition-colors" aria-label="Instagram">📷</a>}
                        {tiktokUrl && <a href={tiktokUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--store-text)] opacity-70 hover:opacity-100 transition-colors" aria-label="TikTok">🎵</a>}
                        {twitterUrl && <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--store-text)] opacity-70 hover:opacity-100 transition-colors" aria-label="X">𝕏</a>}
                        {youtubeUrl && <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--store-text)] opacity-70 hover:opacity-100 transition-colors" aria-label="YouTube">▶</a>}
                      </div>
                    )}
                  </section>
                );
              }
              if (block.type === "links") {
                const items = (block.data.items as Array<{ title: string; url: string; icon?: string; order: number; description?: string; thumbnailUrl?: string; emoji?: string }>) || [];
                const links = items.filter((l) => l.title && l.url).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                const textAlign = (block.data.textAlign as "left" | "center" | "right") || "left";
                if (links.length === 0) return null;
                const alignClass = textAlign === "center" ? "text-center" : textAlign === "right" ? "text-right" : "text-left";
                const linkClass = isFluidAura
                  ? "group relative w-full flex items-center gap-4 p-3 bg-white/[0.03] backdrop-blur-3xl border border-white/10 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] rounded-2xl hover:scale-[1.02] hover:bg-white/[0.06] transition-all duration-300"
                  : isPearlSilk
                    ? "group relative w-full flex items-center gap-4 p-3 bg-white/60 backdrop-blur-xl border border-white/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-2xl hover:scale-[1.02] hover:bg-white transition-all duration-300"
                    : "group relative w-full flex items-center gap-4 p-3 bg-[var(--store-card-bg)] backdrop-blur-xl border border-[var(--store-card-border)] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] rounded-2xl hover:scale-[1.02] hover:opacity-90 transition-all duration-300";
                const linkTitleClass = isFluidAura || isDarkTheme ? "font-semibold text-[var(--store-text)]" : isPearlSilk ? "font-semibold text-slate-800" : "font-semibold text-[var(--store-text)]";
                const linkDescClass = "text-xs text-[var(--store-subheadline)] line-clamp-1";
                const linkIconBgClass = isFluidAura || isDarkTheme ? "w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-400 group-hover:text-slate-200 group-hover:bg-white/20 transition-colors" : isPearlSilk ? "w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-slate-800 group-hover:bg-slate-100 transition-colors" : "w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[var(--store-text)] opacity-70 group-hover:opacity-100 transition-colors";
                return (
                  <section key={block.id} className="flex flex-col gap-3 w-full">
                    {links.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={linkClass}
                      >
                        <LinkThumbnail thumbnailUrl={link.thumbnailUrl} url={link.url} emoji={link.emoji} />
                        <div className={`flex flex-col flex-grow min-w-0 ${alignClass}`}>
                          <span className={linkTitleClass}>{link.title}</span>
                          {link.description && <span className={`mt-0.5 ${linkDescClass}`}>{link.description}</span>}
                        </div>
                        <div className={linkIconBgClass}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </a>
                    ))}
                  </section>
                );
              }
              if (block.type === "products") {
                const selectedIds = block.data.selectedProductIds as string[] | undefined;
                const legacyShow = (block.data.showProducts as boolean) !== false;
                const displayedProducts =
                  selectedIds !== undefined
                    ? products.filter((p) => selectedIds.includes(p.id))
                    : legacyShow
                      ? products
                      : [];
                if (displayedProducts.length === 0) return null;
                const productCardClass = isFluidAura
                  ? "w-full bg-white/[0.03] backdrop-blur-3xl border border-white/10 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] rounded-2xl p-4 flex flex-col gap-3"
                  : isPearlSilk
                    ? "w-full bg-white/60 backdrop-blur-xl border border-white/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-2xl p-4 flex flex-col gap-3"
                    : "w-full bg-[var(--store-card-bg)] backdrop-blur-xl border border-[var(--store-card-border)] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)] rounded-2xl p-4 flex flex-col gap-3";
                const productTitleClass = isFluidAura || isDarkTheme ? "font-bold text-[var(--store-text)] truncate" : isPearlSilk ? "font-bold text-slate-800 truncate" : "font-bold text-[var(--store-text)] truncate";
                const productPriceClass = isFluidAura || isDarkTheme
                  ? "text-sm font-medium text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded-md w-fit"
                  : isPearlSilk ? "text-sm font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md w-fit" : "text-sm font-medium text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded-md w-fit";
                const productBtnClass = `w-full text-sm font-semibold py-2 rounded-xl shadow-md transition-all block text-center ${buttonStyleClass}`;
                return (
                  <section key={block.id} className="flex flex-col gap-4 w-full">
                    {displayedProducts.map((product) =>
                      product.course_id && user ? (
                        <div key={product.id} className={productCardClass}>
                          <div className="flex items-start gap-4">
                            {product.cover_image_url && (
                              <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                                <Image src={product.cover_image_url} alt={product.name} fill className="object-cover" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className={productTitleClass}>{product.name}</h3>
                              <span className={`mt-1.5 inline-block ${productPriceClass}`}>
                                {product.price === 0 ? "Free" : `$${product.price} ${product.pricing_type === "hourly" ? "/hr" : ""}`}
                              </span>
                            </div>
                          </div>
                          <div>
                            <CourseEnrollment
                              courseId={product.course_id}
                              expertId={expertId}
                              coursePrice={product.price}
                              isFree={product.price === 0}
                              currentUserId={user.id}
                              customBrandColor={designState.buttonColor}
                              customButtonTextColor={designState.buttonTextColor}
                              themePreset={designState.themePreset || "default"}
                            />
                          </div>
                        </div>
                      ) : (
                        <div key={product.id} className={productCardClass}>
                          <div className="flex items-start gap-4">
                            {product.cover_image_url && (
                              <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                                <Image src={product.cover_image_url} alt={product.name} fill className="object-cover" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className={productTitleClass}>{product.name}</h3>
                              <span className={`mt-1.5 inline-block ${productPriceClass}`}>
                                {product.price === 0 ? "Free" : `$${product.price} ${product.pricing_type === "hourly" ? "/hr" : ""}`}
                              </span>
                            </div>
                          </div>
                          <Link href={product.course_id ? `/courses/${product.course_id}` : `/expert/${expertId}`} className={productBtnClass}>
                            Get it now
                          </Link>
                        </div>
                      )
                    )}
                  </section>
                );
              }
              if (block.type === "image_text") {
                const d = block.data;
                const imageUrl = d.imageUrl as string;
                const title = d.title as string;
                const text = d.text as string;
                const alignment = (d.alignment as string) || "left";
                if (!imageUrl && !text) return null;
                return (
                  <section key={block.id} className={`flex flex-col ${alignment === "right" ? "sm:flex-row-reverse" : "sm:flex-row"} gap-6 items-center`}>
                    {imageUrl && (
                      <div className="relative w-full sm:w-1/2 aspect-video rounded-xl overflow-hidden flex-shrink-0">
                        <Image src={imageUrl} alt={title || ""} fill className="object-cover" />
                      </div>
                    )}
                    <div className="flex-1">
                      {title && <h3 className="text-lg font-semibold text-[var(--store-text)] mb-2">{title}</h3>}
                      {text && <div className="text-[var(--store-subheadline)] text-sm prose max-w-none" dangerouslySetInnerHTML={{ __html: text }} />}
                    </div>
                  </section>
                );
              }
              if (block.type === "faq") {
                const items = (block.data.items as Array<{ question: string; answer: string }>) || [];
                if (items.length === 0) return null;
                return (
                  <section key={block.id} className="space-y-2">
                    <h2 className="text-xl font-semibold text-[var(--store-text)] mb-4">FAQ</h2>
                    {items.map((item, idx) => (
                      <details key={idx} className="bg-[var(--store-card-bg)] border border-[var(--store-card-border)] rounded-xl overflow-hidden group">
                        <summary className="px-4 py-3 cursor-pointer text-[var(--store-text)] font-medium list-none flex items-center justify-between">
                          {item.question}
                          <span className="opacity-70 group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <div className="px-4 pb-3 text-[var(--store-subheadline)] text-sm border-t border-[var(--store-card-border)] pt-2">{item.answer}</div>
                      </details>
                    ))}
                  </section>
                );
              }
              if (block.type === "testimonials") {
                const items = (block.data.items as Array<{ name: string; quote: string; avatarUrl?: string }>) || [];
                if (items.length === 0) return null;
                return (
                  <section key={block.id} className="space-y-4">
                    {items.map((item, idx) => (
                      <div key={idx} className="bg-[var(--store-card-bg)] border border-[var(--store-card-border)] rounded-xl p-4">
                        <p className="text-[var(--store-text)] text-sm italic opacity-90">&quot;{item.quote}&quot;</p>
                        <p className="text-[var(--store-subheadline)] text-xs mt-2">— {item.name}</p>
                      </div>
                    ))}
                  </section>
                );
              }
              if (block.type === "rich_text") {
                const content = (block.data.content as string) || "";
                if (!content.trim()) return null;
                const isDark = designState.textColor.toLowerCase().startsWith("#f") || designState.textColor.toLowerCase().includes("fff");
                const proseClass = isDark ? "prose prose-sm sm:prose-base prose-invert w-full max-w-none" : "prose prose-sm sm:prose-base w-full max-w-none";
                const cardClass = isFluidAura
                  ? "w-full bg-white/[0.06] backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-sm text-slate-300"
                  : "w-full bg-white/40 backdrop-blur-md rounded-2xl p-6 border border-white/60 shadow-sm text-slate-700";
                return (
                  <section key={block.id} className="w-full">
                    <div className={cardClass}>
                      <div className={`${proseClass} text-[var(--store-text)]`} dangerouslySetInnerHTML={{ __html: content }} />
                    </div>
                  </section>
                );
              }
              if (block.type === "image_banner") {
                const imageUrl = block.data.imageUrl as string;
                if (!imageUrl) return null;
                return (
                  <section key={block.id} className="w-full">
                    <img src={imageUrl} alt="Banner" className="w-full h-auto rounded-2xl object-cover shadow-sm" />
                  </section>
                );
              }
              if (block.type === "bullet_list") {
                const items = (block.data.items as string[]) || [];
                if (items.length === 0) return null;
                const brandColor = designState.buttonColor;
                const listCardClass = isFluidAura
                  ? "w-full bg-white/[0.06] backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-sm text-slate-300 prose prose-sm"
                  : "w-full bg-white/40 backdrop-blur-md rounded-2xl p-6 border border-white/60 shadow-sm text-slate-700 prose prose-sm";
                return (
                  <section key={block.id} className="w-full">
                    <div className={listCardClass}>
                      <ul className="space-y-2 list-none">
                        {items.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-[var(--store-text)]">
                            <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: `${brandColor}30`, color: brandColor }}>
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </span>
                            <span className="text-sm opacity-90">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                );
              }
              if (block.type === "social_media") {
                const platforms = (block.data.platforms as string[]) || [];
                const urls: Record<string, string> = {
                  instagram: instagramUrl || "",
                  tiktok: tiktokUrl || "",
                  linkedin: linkedin || "",
                  twitter: twitterUrl || "",
                  youtube: youtubeUrl || "",
                };
                const toShow = platforms.filter((p) => urls[p]);
                if (toShow.length === 0) return null;
                const iconSize = 28;
                const socialIcons: Record<string, JSX.Element> = {
                  instagram: (
                    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor" aria-label="Instagram">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  ),
                  tiktok: (
                    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor" aria-label="TikTok">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                    </svg>
                  ),
                  linkedin: (
                    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor" aria-label="LinkedIn">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  ),
                  twitter: (
                    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor" aria-label="X (Twitter)">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  ),
                  youtube: (
                    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor" aria-label="YouTube">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                  ),
                };
                return (
                  <section key={block.id} className="w-full flex justify-center">
                    <div className="flex items-center justify-center gap-6">
                      {toShow.map((p) => (
                        <a
                          key={p}
                          href={urls[p]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="opacity-70 hover:opacity-100 transition-opacity"
                          style={{ color: "var(--store-text)" }}
                        >
                          {socialIcons[p]}
                        </a>
                      ))}
                    </div>
                  </section>
                );
              }
              if (block.type === "book_me") {
                const btnClass = isFluidAura
                  ? "py-4 px-8 font-semibold transition-all duration-300 text-center bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur-md rounded-full"
                  : isPearlSilk
                    ? "py-4 px-8 font-semibold transition-all duration-300 text-center bg-[#1A1A1A] text-white hover:bg-[#2A2A2A] rounded-full shadow-lg"
                    : `py-4 px-8 font-semibold transition-all duration-300 text-center ${buttonStyleClass}`;
                return (
                  <section key={block.id} className="w-full flex justify-center">
                    <button
                      type="button"
                      onClick={() => setOpenBookingModal(true)}
                      className={btnClass}
                    >
                      Book Me
                    </button>
                  </section>
                );
              }
              return null;
            })}

            <a
              href="https://www.sito.club"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--store-text)] text-sm opacity-60 hover:opacity-80 transition-colors mt-12 pb-8"
            >
              ⚡️ Powered by Sito
            </a>
          </main>
        </div>
        {openBookingModal && hasAppointments && (
          <BookingModal
            expertId={expertId}
            expertName={expertName}
            product={null}
            onClose={() => setOpenBookingModal(false)}
          />
        )}
      </div>
    );
  }


  return (
    <div
      className={`min-h-screen ${fontClass}`}
      style={{
        ...cssVars,
        background: designState.backgroundColor.startsWith("linear") ? designState.backgroundColor : "var(--store-bg)",
        color: "var(--store-text)",
        fontFamily: fontFamilyStyle,
      }}
    >
      {designState.glowElement && <div className={designState.glowElement} aria-hidden />}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 md:gap-12">
          <aside className="md:col-span-4 md:sticky md:top-24 h-fit">
            <div className="flex flex-col items-center md:items-start">
              {avatarUrl ? (
                <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-2 border-[var(--store-card-border)] flex-shrink-0">
                  <Image src={avatarUrl} alt={expertName} fill className="object-cover" />
                </div>
              ) : (
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-[var(--store-card-bg)] border-2 border-[var(--store-card-border)] flex items-center justify-center flex-shrink-0">
                  <svg className="w-16 h-16 md:w-20 md:h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--store-text)" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
              <div className="mt-6 text-center md:text-left w-full">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <h1 className="text-2xl md:text-3xl font-bold text-[var(--store-text)] tracking-tight">{expertName}</h1>
                  {verified && (
                    <svg className="w-5 h-5 text-blue-500 inline-block shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-label="Verified Expert">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                  )}
                </div>
                <p className="text-[var(--store-subheadline)] text-sm md:text-base leading-relaxed">{bioOverride || expertBio || "Welcome to my storefront"}</p>
              </div>
              {hasAppointments && (
                <button
                  type="button"
                  onClick={() => setOpenBookingModal(true)}
                  className="w-full py-4 px-6 font-semibold transition-all text-center bg-[var(--store-btn-bg)] text-[var(--store-btn-text)] hover:opacity-90 rounded-lg mt-6"
                  style={{ borderRadius: "var(--store-btn-radius)" }}
                >
                  Book Me
                </button>
              )}
              {allLinks.length > 0 && (
                <div className="flex flex-col gap-3 w-full mt-6">
                  {allLinks.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-4 px-6 font-semibold transition-all text-center bg-[var(--store-btn-bg)] text-[var(--store-btn-text)] hover:opacity-90 rounded-lg"
                      style={{ borderRadius: "var(--store-btn-radius)" }}
                    >
                      {link.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </aside>
          <main className="md:col-span-8 space-y-8 mt-8 md:mt-0">
            {products.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-[var(--store-text)] tracking-tight mb-6">Products & Services</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {products.map((product) => (
                    <div key={product.id} className="bg-[var(--store-card-bg)] border border-[var(--store-card-border)] rounded-xl overflow-hidden transition-all duration-300 hover:opacity-95">
                      {product.cover_image_url && (
                        <div className="relative w-full aspect-video bg-[var(--store-card-bg)]">
                          <Image src={product.cover_image_url} alt={product.name} fill className="object-cover rounded-t-xl" />
                        </div>
                      )}
                      <div className="p-5">
                        <h3 className="text-lg font-semibold text-[var(--store-text)] tracking-tight mb-2">{product.name}</h3>
                        {product.description && (
                          <div className="text-[var(--store-subheadline)] text-sm leading-relaxed line-clamp-2 mb-3 product-preview" dangerouslySetInnerHTML={{ __html: product.description }} />
                        )}
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-lg font-bold text-[var(--store-text)]">
                            {product.price === 0 ? "Free" : `$${product.price} ${product.pricing_type === "hourly" ? "/hr" : ""}`}
                          </span>
                        </div>
                        {product.course_id && user ? (
                          <CourseEnrollment
                            courseId={product.course_id}
                            expertId={expertId}
                            coursePrice={product.price}
                            isFree={product.price === 0}
                            currentUserId={user.id}
                            customBrandColor={designState.buttonColor}
                            customButtonTextColor={designState.buttonTextColor}
                            themePreset={designState.themePreset || "default"}
                          />
                        ) : (
                          <Link
                            href={`/expert/${expertId}`}
                            className="block w-full py-4 px-6 font-semibold text-center bg-[var(--store-btn-bg)] text-[var(--store-btn-text)] hover:opacity-90 rounded-lg"
                            style={{ borderRadius: "var(--store-btn-radius)" }}
                          >
                            Learn More
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {blogPosts.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-[var(--store-text)] tracking-tight mb-6">Latest Posts</h2>
                <div className="space-y-3">
                  {blogPosts.map((post) => (
                    <Link key={post.id} href={`/blog/${post.id}`} className="block bg-[var(--store-card-bg)] border border-[var(--store-card-border)] rounded-xl overflow-hidden transition-all duration-300 hover:opacity-95">
                      {post.featured_image_url && (
                        <div className="relative w-full h-48">
                          <Image src={post.featured_image_url} alt={post.title} fill className="object-cover" />
                        </div>
                      )}
                      <div className="p-5">
                        <h3 className="text-lg font-semibold text-[var(--store-text)] tracking-tight mb-2">{post.title}</h3>
                        {post.description && <p className="text-[var(--store-subheadline)] text-sm leading-relaxed line-clamp-2">{post.description}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
            <a href="https://www.sito.club" target="_blank" rel="noopener noreferrer" className="block text-center pt-8 border-t border-[var(--store-card-border)] text-[var(--store-subheadline)] text-sm hover:opacity-80 pb-8">
              ⚡️ Powered by Sito
            </a>
          </main>
        </div>
      </div>
      {openBookingModal && hasAppointments && (
        <BookingModal
          expertId={expertId}
          expertName={expertName}
          product={null}
          onClose={() => setOpenBookingModal(false)}
        />
      )}
    </div>
  );
}
