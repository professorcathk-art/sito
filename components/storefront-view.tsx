"use client";

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { CourseEnrollment } from "@/components/course-enrollment";
import type { StorefrontBlock } from "@/types/storefront";
import { FONT_FAMILIES, getCardCssVars } from "@/lib/storefront-theme-config";

export interface StorefrontDesignState {
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
  products,
  blogPosts,
  hasAppointments,
  storefrontBlocks = [],
}: StorefrontViewProps) {
  const { user } = useAuth();
  const supabase = createClient();

  const isFluidAura = designState.themePreset === "fluid-aura";
  const isPearlSilk = designState.themePreset === "pearl-silk" || designState.themePreset === "soft-gradient";
  const cssVars = useMemo(() => {
    let card = getCardCssVars(designState.cardStyle as "flat" | "glass" | "brutalist" | "soft-shadow");
    if (isFluidAura) {
      card = { bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.1)" };
    } else if (isPearlSilk) {
      card = { bg: "rgba(255,255,255,0.4)", border: "rgba(255,255,255,0.6)" };
    }
    const btnRadius = designState.buttonRadius === "pill" ? "9999px" : designState.buttonRadius === "sharp" ? "0" : "0.5rem";
    return {
      "--store-bg": isFluidAura ? "#050505" : isPearlSilk ? undefined : designState.backgroundColor,
      "--store-text": isFluidAura ? "#f1f5f9" : isPearlSilk ? "#1A1A1A" : designState.textColor,
      "--store-btn-bg": isFluidAura ? "rgba(255,255,255,0.1)" : isPearlSilk ? "#1A1A1A" : designState.buttonColor,
      "--store-btn-text": designState.buttonTextColor,
      "--store-card-bg": card.bg,
      "--store-card-border": card.border,
      "--store-btn-radius": btnRadius,
    } as React.CSSProperties;
  }, [designState, isFluidAura, isPearlSilk]);

  const fontClass = FONT_FAMILIES.find((f) => f.id === designState.fontFamily)?.class || "font-store-inter";
  const fontVarMap: Record<string, string> = {
    inter: "var(--font-inter)",
    roboto: "var(--font-roboto)",
    playfair: "var(--font-playfair)",
    "space-grotesk": "var(--font-space-grotesk)",
    "dm-sans": "var(--font-dm-sans)",
  };
  const fontFamilyStyle = fontVarMap[designState.fontFamily] || "var(--font-inter)";

  const allLinks = [
    ...customLinks,
    ...(website ? [{ title: "Website", url: website, icon: "🌐", order: 1000 }] : []),
    ...(linkedin ? [{ title: "LinkedIn", url: linkedin, icon: "💼", order: 1001 }] : []),
    ...(instagramUrl ? [{ title: "Instagram", url: instagramUrl, icon: "📷", order: 1002 }] : []),
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
    const background =
      isFluidAura
        ? undefined
        : isPearlSilk
          ? "conic-gradient(at top right, #fdf2f8 0%, #f8fafc 50%, #fffbeb 100%)"
          : designState.backgroundColor.startsWith("linear")
            ? designState.backgroundColor
            : "var(--store-bg)";
    return (
      <div
        className={`${wrapperClass} ${fontClass}`}
        style={{
          ...cssVars,
          ...(background && { background }),
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
        <div className="w-full min-h-screen flex flex-col items-center pb-12 relative z-0">
          <main className="w-full max-w-2xl sm:max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 flex flex-col gap-8">
            {sortedBlocks.map((block) => {
              if (block.type === "header") {
                const d = block.data;
                const name = (d.name as string) || expertName;
                const tagline = (d.tagline as string) || expertTagline || "";
                const bio = (d.bio as string) || bioOverride || expertBio || "";
                const img = (d.avatarUrl as string) || avatarUrl;
                return (
                  <section key={block.id} className="flex flex-col items-center text-center">
                    {img ? (
                      <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-[var(--store-card-border)] flex-shrink-0">
                        <Image src={img} alt={name} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-[var(--store-card-bg)] border-2 border-[var(--store-card-border)] flex items-center justify-center flex-shrink-0">
                        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--store-text)" }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <h1 className="text-2xl font-bold text-[var(--store-text)]">{name}</h1>
                      {verified && (
                        <svg className="w-5 h-5 text-blue-500 inline-block shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-label="Verified">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                      )}
                    </div>
                    {tagline && <p className="text-[var(--store-text)] text-sm mt-1 opacity-80">{tagline}</p>}
                    {bio && <p className="text-[var(--store-text)] text-sm mt-2 max-w-full opacity-80">{bio}</p>}
                    {(website || linkedin || instagramUrl) && (
                      <div className="flex gap-3 mt-4">
                        {website && <a href={website} target="_blank" rel="noopener noreferrer" className="text-[var(--store-text)] opacity-70 hover:opacity-100 transition-colors">🌐</a>}
                        {linkedin && <a href={linkedin} target="_blank" rel="noopener noreferrer" className="text-[var(--store-text)] opacity-70 hover:opacity-100 transition-colors">💼</a>}
                        {instagramUrl && <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--store-text)] opacity-70 hover:opacity-100 transition-colors">📷</a>}
                      </div>
                    )}
                  </section>
                );
              }
              if (block.type === "links") {
                const items = (block.data.items as Array<{ title: string; url: string; icon?: string; order: number; description?: string; thumbnailUrl?: string }>) || [];
                const links = items.filter((l) => l.title && l.url).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                if (links.length === 0) return null;
                return (
                  <section key={block.id} className="flex flex-col gap-3">
                    {links.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`group flex items-center p-4 bg-[var(--store-card-bg)] border border-[var(--store-card-border)] transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-pointer ${isFluidAura ? "rounded-3xl backdrop-blur-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]" : isPearlSilk ? "rounded-3xl backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]" : "rounded-2xl"}`}
                      >
                        {link.thumbnailUrl ? (
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
                        <div className="flex-1 min-w-0 text-left ml-4">
                          <span className="font-semibold block text-[var(--store-text)]">{link.title}</span>
                          {link.description && <span className="text-sm opacity-70 block mt-0.5 line-clamp-2 text-[var(--store-text)]">{link.description}</span>}
                        </div>
                        <svg className="w-5 h-5 opacity-40 group-hover:translate-x-1 transition-transform flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--store-text)" }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
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
                const cardClass = "flex flex-row items-center bg-[var(--store-card-bg)] border border-[var(--store-card-border)] rounded-2xl p-4 gap-4 hover:opacity-90 transition-all min-w-0";
                return (
                  <section key={block.id} className="flex flex-col gap-4">
                    {displayedProducts.map((product) =>
                      product.course_id && user ? (
                        <div key={product.id} className={cardClass}>
                          {product.cover_image_url && (
                            <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                              <Image src={product.cover_image_url} alt={product.name} fill className="object-cover" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-[var(--store-text)] truncate">{product.name}</h3>
                            <p className="text-[var(--store-text)] text-sm mt-0.5 opacity-80">
                              {product.price === 0 ? "Free" : `$${product.price} ${product.pricing_type === "hourly" ? "/hr" : ""}`}
                            </p>
                          </div>
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
                      ) : (
                        <Link
                          key={product.id}
                          href={product.course_id ? `/courses/${product.course_id}` : `/expert/${expertId}`}
                          className={cardClass}
                        >
                          {product.cover_image_url && (
                            <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                              <Image src={product.cover_image_url} alt={product.name} fill className="object-cover" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-[var(--store-text)] truncate">{product.name}</h3>
                            <p className="text-[var(--store-text)] text-sm mt-0.5 opacity-80">
                              {product.price === 0 ? "Free" : `$${product.price} ${product.pricing_type === "hourly" ? "/hr" : ""}`}
                            </p>
                          </div>
                          <span className="text-sm font-medium shrink-0" style={{ color: "var(--store-btn-bg)" }}>View →</span>
                        </Link>
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
                      {text && <div className="text-[var(--store-text)] text-sm opacity-80 prose max-w-none" dangerouslySetInnerHTML={{ __html: text }} />}
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
                        <div className="px-4 pb-3 text-[var(--store-text)] text-sm opacity-80 border-t border-[var(--store-card-border)] pt-2">{item.answer}</div>
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
                        <p className="text-[var(--store-text)] text-xs mt-2 opacity-80">— {item.name}</p>
                      </div>
                    ))}
                  </section>
                );
              }
              if (block.type === "rich_text") {
                const content = (block.data.content as string) || "";
                if (!content.trim()) return null;
                const isDark = designState.textColor.toLowerCase().startsWith("#f") || designState.textColor.toLowerCase().includes("fff");
                const proseClass = isDark ? "prose prose-sm sm:prose-base prose-invert w-full" : "prose prose-sm sm:prose-base w-full";
                return (
                  <section key={block.id} className="w-full">
                    <div className={`${proseClass} text-[var(--store-text)]`} dangerouslySetInnerHTML={{ __html: content }} />
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
                return (
                  <section key={block.id} className="w-full">
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
                  </section>
                );
              }
              return null;
            })}

            {hasAppointments && (
              <Link
                href={`/appointments/book/${expertId}`}
                className={`w-full py-4 px-6 font-semibold transition-all duration-300 text-center bg-[var(--store-btn-bg)] text-[var(--store-btn-text)] ${isFluidAura ? "border border-white/20 hover:bg-white/20 backdrop-blur-md rounded-full" : isPearlSilk ? "hover:bg-[#2A2A2A] rounded-full shadow-lg" : "hover:opacity-90"}`}
                style={{ borderRadius: isFluidAura || isPearlSilk ? "9999px" : "var(--store-btn-radius)" }}
              >
                Book 1-on-1 Session
              </Link>
            )}

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
                <p className="text-[var(--store-text)] text-sm md:text-base leading-relaxed opacity-80">{bioOverride || expertBio || "Welcome to my storefront"}</p>
              </div>
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
              {hasAppointments && (
                <Link
                  href={`/appointments/book/${expertId}`}
                  className="w-full py-4 px-6 font-semibold transition-all text-center bg-[var(--store-btn-bg)] text-[var(--store-btn-text)] hover:opacity-90 rounded-lg mt-4 block"
                  style={{ borderRadius: "var(--store-btn-radius)" }}
                >
                  Book 1-on-1 Session
                </Link>
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
                          <div className="text-[var(--store-text)] text-sm leading-relaxed line-clamp-2 mb-3 product-preview opacity-80" dangerouslySetInnerHTML={{ __html: product.description }} />
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
                        {post.description && <p className="text-[var(--store-text)] text-sm leading-relaxed line-clamp-2 opacity-80">{post.description}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
            <a href="https://www.sito.club" target="_blank" rel="noopener noreferrer" className="block text-center pt-8 border-t border-[var(--store-card-border)] text-[var(--store-text)] text-sm opacity-60 hover:opacity-80 pb-8">
              ⚡️ Powered by Sito
            </a>
          </main>
        </div>
      </div>
    </div>
  );
}
