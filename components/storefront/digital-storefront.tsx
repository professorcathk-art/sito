"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type {
  StorefrontBlock,
  StorefrontDesignState,
  StorefrontHeroData,
  StorefrontLeadMagnetData,
  StorefrontProductItem,
} from "@/types/storefront";
import { FONT_FAMILIES, getCardCssVars, getButtonStyleClasses } from "@/lib/storefront-theme-config";
import { StorefrontHero } from "@/components/storefront/storefront-hero";
import { StorefrontSocialBar, type StorefrontSocialLinks } from "@/components/storefront/storefront-social-bar";
import { StorefrontLeadMagnet } from "@/components/storefront/storefront-lead-magnet";
import { StorefrontProductCard } from "@/components/storefront/storefront-product-card";

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
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl">
        {emoji.trim()}
      </div>
    );
  }
  if (thumbnailUrl) {
    return (
      <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-xl">
        <Image src={thumbnailUrl} alt="" fill className="object-cover" />
      </div>
    );
  }
  if (domain && !faviconFailed) {
    return (
      <div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
          alt=""
          className="h-6 w-6 object-contain"
          onError={() => setFaviconFailed(true)}
        />
      </div>
    );
  }
  return null;
}

export interface DigitalStorefrontProps {
  expertId: string;
  expertName: string;
  expertBio: string;
  expertTagline?: string;
  bioOverride?: string;
  avatarUrl?: string;
  verified: boolean;
  designState: StorefrontDesignState;
  socialLinks: StorefrontSocialLinks;
  storefrontBackgroundImageUrl?: string;
  products: StorefrontProductItem[];
  blogPosts?: Array<{
    id: string;
    title: string;
    description?: string;
    featured_image_url?: string;
    published_at: string;
  }>;
  hasAppointments?: boolean;
  storefrontBlocks?: StorefrontBlock[];
  customLinks?: Array<{ title: string; url: string; icon?: string; order: number }>;
  currentUserId?: string;
  isPreview?: boolean;
  onBookMe?: () => void;
}

export function DigitalStorefront({
  expertId,
  expertName,
  expertBio,
  expertTagline,
  bioOverride,
  avatarUrl,
  verified,
  designState,
  socialLinks,
  storefrontBackgroundImageUrl,
  products,
  blogPosts = [],
  hasAppointments = false,
  storefrontBlocks = [],
  customLinks = [],
  currentUserId,
  isPreview = false,
  onBookMe,
}: DigitalStorefrontProps) {
  const isFluidAura = designState.themePreset === "fluid-aura";
  const isPearlSilk = designState.themePreset === "pearl-silk" || designState.themePreset === "soft-gradient";
  const effectiveBgImage = storefrontBackgroundImageUrl || designState.backgroundImageUrl;

  const cssVars = useMemo(() => {
    let card = getCardCssVars(designState.cardStyle as "flat" | "glass" | "brutalist" | "soft-shadow");
    if (isFluidAura) card = { bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.12)" };
    else if (isPearlSilk) card = { bg: "rgba(255,255,255,0.55)", border: "rgba(255,255,255,0.7)" };
    const btnRadius = designState.buttonRadius === "pill" ? "9999px" : designState.buttonRadius === "sharp" ? "0" : "0.75rem";
    const pageBg = isFluidAura ? "#050505" : isPearlSilk ? undefined : designState.backgroundColor;
    return {
      "--store-bg-color": pageBg,
      "--store-bg": pageBg,
      "--store-bg-ring": isFluidAura || ["neon-cyber", "glass-ocean", "liquid-velvet", "midnight-glass"].includes(designState.themePreset || "")
        ? "#0f172a"
        : "#ffffff",
      "--store-text": isFluidAura ? "#f1f5f9" : isPearlSilk ? "#1A1A1A" : designState.textColor,
      "--store-subheadline":
        designState.subheadlineColor ||
        (isFluidAura ? "rgba(241,245,249,0.72)" : isPearlSilk ? "#4B5563" : designState.textColor),
      "--store-btn-bg": isFluidAura ? "rgba(255,255,255,0.12)" : isPearlSilk ? "#1A1A1A" : designState.buttonColor,
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
    "jetbrains-mono": "var(--font-jetbrains-mono)",
  };
  const fontFamilyStyle = fontVarMap[designState.fontFamily] || "var(--font-inter)";
  const buttonStyleClass = getButtonStyleClasses(
    (designState.buttonStyle as "default" | "glass" | "neon" | "organic") || "default",
    designState.buttonColor,
    designState.buttonTextColor,
    designState.buttonRadius
  );

  const sortedBlocks = useMemo(() => {
    if (storefrontBlocks.length > 0) {
      return [...storefrontBlocks].sort((a, b) => a.order - b.order);
    }
    return [
      {
        id: "default-hero",
        type: "hero" as const,
        order: 0,
        data: { imageUrl: effectiveBgImage || "", overlayOpacity: 40, avatarPosition: "left" },
      },
      {
        id: "default-header",
        type: "header" as const,
        order: 1,
        data: { name: expertName, tagline: expertTagline, bio: bioOverride || expertBio, avatarUrl },
      },
      ...(products.length > 0
        ? [{ id: "default-products", type: "products" as const, order: 2, data: { showProducts: true } }]
        : []),
    ] as StorefrontBlock[];
  }, [storefrontBlocks, effectiveBgImage, expertName, expertTagline, bioOverride, expertBio, avatarUrl, products.length]);

  const heroBlock = sortedBlocks.find((b) => b.type === "hero")
    || sortedBlocks.find((b) => b.type === "image_banner" && (b.data.imageUrl as string));
  const headerBlock = sortedBlocks.find((b) => b.type === "header");
  const contentBlocks = sortedBlocks.filter(
    (b) => b.type !== "hero" && !(b.type === "image_banner" && b.id === heroBlock?.id && heroBlock?.type === "image_banner")
  );

  // If hero came from image_banner, don't also render that banner in content
  const heroFromBanner = heroBlock?.type === "image_banner";
  const blocksToRender = heroFromBanner
    ? contentBlocks.filter((b) => b.id !== heroBlock.id)
    : contentBlocks;

  const heroData: StorefrontHeroData = {
    imageUrl: (heroBlock?.data.imageUrl as string) || effectiveBgImage || "",
    overlayOpacity: (heroBlock?.data.overlayOpacity as number) ?? 45,
    overlayColor: (heroBlock?.data.overlayColor as string) || "#0f172a",
    avatarPosition: ((heroBlock?.data.avatarPosition as "left" | "center") || "left"),
  };

  const displayName = (headerBlock?.data.name as string) || expertName;
  const displayTagline = (headerBlock?.data.tagline as string) || expertTagline || "";
  const displayBio = (headerBlock?.data.bio as string) || bioOverride || expertBio || "";
  const displayAvatar = (headerBlock?.data.avatarUrl as string) || avatarUrl;

  const pageBackground = effectiveBgImage && !heroData.imageUrl
    ? `url(${effectiveBgImage})`
    : isFluidAura
      ? "#050505"
      : isPearlSilk
        ? "conic-gradient(at top right, #fdf2f8 0%, #f8fafc 50%, #fffbeb 100%)"
        : designState.backgroundColor.startsWith("linear") || designState.backgroundColor.startsWith("conic")
          ? designState.backgroundColor
          : "var(--store-bg-color, var(--store-bg))";

  const wrapperClass = isPreview
    ? `relative w-full min-h-full ${fontClass}`
    : `min-h-screen relative ${fontClass}`;

  return (
    <div
      className={wrapperClass}
      style={{
        ...cssVars,
        background: pageBackground,
        backgroundSize: effectiveBgImage && !heroData.imageUrl ? "cover" : undefined,
        backgroundPosition: "center",
        color: "var(--store-text)",
        fontFamily: fontFamilyStyle,
      }}
    >
      {isFluidAura && (
        <>
          <div className="pointer-events-none absolute -left-4 top-0 -z-10 h-72 w-72 rounded-full bg-fuchsia-600 opacity-30 mix-blend-screen blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -right-4 top-20 -z-10 h-72 w-72 rounded-full bg-cyan-600 opacity-30 mix-blend-screen blur-3xl" aria-hidden />
        </>
      )}
      {!isFluidAura && designState.glowElement && <div className={designState.glowElement} aria-hidden />}

      <div className={isPreview ? "pb-8" : "pb-16"}>
        <StorefrontHero
          hero={heroData}
          avatarUrl={displayAvatar}
          expertName={displayName}
          verified={verified}
          compact={isPreview}
        />

        <div className={`mx-auto w-full ${isPreview ? "max-w-none px-4" : "max-w-5xl px-4 sm:px-6 lg:px-8"}`}>
          {/* Header identity */}
          <header className={`mt-4 ${heroData.avatarPosition === "center" ? "text-center" : "text-left"}`}>
            <div className={`flex items-center gap-2 ${heroData.avatarPosition === "center" ? "justify-center" : ""}`}>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--store-text)]">{displayName}</h1>
            </div>
            {displayTagline && (
              <p className="mt-1.5 text-base font-medium text-[var(--store-text)] opacity-90">{displayTagline}</p>
            )}
            {displayBio && (
              <p className={`mt-3 text-sm sm:text-base leading-relaxed text-[var(--store-subheadline)] ${heroData.avatarPosition === "center" ? "mx-auto max-w-2xl" : "max-w-2xl"}`}>
                {displayBio}
              </p>
            )}
            <StorefrontSocialBar
              links={socialLinks}
              className={`mt-4 ${heroData.avatarPosition === "center" ? "justify-center" : ""}`}
            />
          </header>

          <div className="mt-8 flex flex-col gap-8">
            {blocksToRender.map((block) => {
              if (block.type === "header") return null;

              if (block.type === "lead_magnet") {
                return (
                  <StorefrontLeadMagnet
                    key={block.id}
                    data={block.data as StorefrontLeadMagnetData}
                    expertId={expertId}
                    expertName={displayName}
                    buttonClassName={buttonStyleClass}
                    isPreview={isPreview}
                  />
                );
              }

              if (block.type === "products") {
                const selectedIds = block.data.selectedProductIds as string[] | undefined;
                const legacyShow = (block.data.showProducts as boolean) !== false;
                const displayed =
                  selectedIds !== undefined
                    ? products.filter((p) => selectedIds.includes(p.id))
                    : legacyShow
                      ? products
                      : [];
                if (displayed.length === 0) return null;
                return (
                  <section key={block.id}>
                    <div className="mb-4 flex items-end justify-between gap-3">
                      <h2 className="text-xl font-semibold tracking-tight text-[var(--store-text)]">Shop</h2>
                      <p className="text-xs text-[var(--store-subheadline)]">{displayed.length} offering{displayed.length === 1 ? "" : "s"}</p>
                    </div>
                    <div className={`grid gap-4 ${isPreview ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
                      {displayed.map((product) => (
                        <StorefrontProductCard
                          key={product.id}
                          product={product}
                          expertId={expertId}
                          currentUserId={currentUserId}
                          buttonClassName={buttonStyleClass}
                          brandColor={designState.buttonColor}
                          buttonTextColor={designState.buttonTextColor}
                          themePreset={designState.themePreset}
                          isPreview={isPreview}
                          onBook={onBookMe}
                        />
                      ))}
                    </div>
                  </section>
                );
              }

              if (block.type === "testimonials") {
                const items = (block.data.items as Array<{ name: string; quote: string; avatarUrl?: string }>) || [];
                const valid = items.filter((i) => i.name || i.quote);
                if (valid.length === 0) return null;
                return (
                  <section key={block.id}>
                    <h2 className="mb-4 text-xl font-semibold tracking-tight text-[var(--store-text)]">What people say</h2>
                    <div className={`grid gap-4 ${isPreview ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
                      {valid.map((item, idx) => (
                        <blockquote
                          key={idx}
                          className="rounded-2xl border border-[var(--store-card-border)] bg-[var(--store-card-bg)] p-5 backdrop-blur-xl"
                        >
                          {item.quote && (
                            <p className="text-sm leading-relaxed text-[var(--store-text)]">&ldquo;{item.quote}&rdquo;</p>
                          )}
                          <footer className="mt-3 flex items-center gap-3">
                            {item.avatarUrl ? (
                              <div className="relative h-9 w-9 overflow-hidden rounded-full">
                                <Image src={item.avatarUrl} alt="" fill className="object-cover" />
                              </div>
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--store-btn-bg)]/20 text-xs font-bold text-[var(--store-text)]">
                                {(item.name || "?").charAt(0).toUpperCase()}
                              </div>
                            )}
                            <cite className="not-italic text-sm font-medium text-[var(--store-subheadline)]">{item.name}</cite>
                          </footer>
                        </blockquote>
                      ))}
                    </div>
                  </section>
                );
              }

              if (block.type === "faq") {
                const items = (block.data.items as Array<{ question: string; answer: string }>) || [];
                const valid = items.filter((i) => i.question || i.answer);
                if (valid.length === 0) return null;
                return (
                  <section key={block.id}>
                    <h2 className="mb-4 text-xl font-semibold tracking-tight text-[var(--store-text)]">FAQ</h2>
                    <div className="space-y-2">
                      {valid.map((item, idx) => (
                        <details
                          key={idx}
                          className="group overflow-hidden rounded-xl border border-[var(--store-card-border)] bg-[var(--store-card-bg)] backdrop-blur-xl"
                        >
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 font-medium text-[var(--store-text)]">
                            <span>{item.question}</span>
                            <span className="text-[var(--store-subheadline)] transition-transform group-open:rotate-180">▾</span>
                          </summary>
                          <div className="border-t border-[var(--store-card-border)] px-4 py-3 text-sm leading-relaxed text-[var(--store-subheadline)]">
                            {item.answer}
                          </div>
                        </details>
                      ))}
                    </div>
                  </section>
                );
              }

              if (block.type === "links") {
                const items =
                  (block.data.items as Array<{
                    title: string;
                    url: string;
                    order: number;
                    description?: string;
                    thumbnailUrl?: string;
                    emoji?: string;
                  }>) || [];
                const links = items.filter((l) => l.title && l.url).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                const fallbackLinks = customLinks.filter((l) => l.title && l.url);
                const toShow = links.length > 0 ? links : fallbackLinks;
                if (toShow.length === 0) return null;
                return (
                  <section key={block.id} className="flex flex-col gap-3">
                    {toShow.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={isPreview ? (e) => e.preventDefault() : undefined}
                        className="group flex items-center gap-3 rounded-2xl border border-[var(--store-card-border)] bg-[var(--store-card-bg)] p-3 backdrop-blur-xl transition-all hover:scale-[1.01]"
                      >
                        <LinkThumbnail
                          thumbnailUrl={"thumbnailUrl" in link ? (link as { thumbnailUrl?: string }).thumbnailUrl : undefined}
                          url={link.url}
                          emoji={
                            "emoji" in link
                              ? (link as { emoji?: string }).emoji
                              : (link as { icon?: string }).icon
                          }
                        />
                        <div className="min-w-0 flex-1">
                          <span className="block font-semibold text-[var(--store-text)]">{link.title}</span>
                          {"description" in link && link.description && (
                            <span className="mt-0.5 block text-xs text-[var(--store-subheadline)] line-clamp-1">
                              {link.description}
                            </span>
                          )}
                        </div>
                        <span className="opacity-40 transition-transform group-hover:translate-x-0.5">→</span>
                      </a>
                    ))}
                  </section>
                );
              }

              if (block.type === "social_media") {
                const platforms = (block.data.platforms as string[]) || [];
                return (
                  <StorefrontSocialBar
                    key={block.id}
                    links={socialLinks}
                    platforms={platforms}
                    className="justify-center"
                  />
                );
              }

              if (block.type === "book_me" && (hasAppointments || isPreview)) {
                return (
                  <section key={block.id} className="flex justify-center">
                    <button
                      type="button"
                      onClick={onBookMe}
                      className={`px-8 py-3.5 text-base font-semibold ${buttonStyleClass}`}
                    >
                      Book a session
                    </button>
                  </section>
                );
              }

              if (block.type === "image_text") {
                const imageUrl = block.data.imageUrl as string;
                const title = block.data.title as string;
                const text = block.data.text as string;
                if (!imageUrl && !text) return null;
                return (
                  <section key={block.id} className="grid gap-4 sm:grid-cols-2 sm:items-center">
                    {imageUrl && (
                      <div className="relative aspect-video overflow-hidden rounded-2xl">
                        <Image src={imageUrl} alt={title || ""} fill className="object-cover" />
                      </div>
                    )}
                    <div>
                      {title && <h3 className="text-lg font-semibold text-[var(--store-text)]">{title}</h3>}
                      {text && (
                        <div
                          className="mt-2 text-sm text-[var(--store-subheadline)] prose max-w-none"
                          dangerouslySetInnerHTML={{ __html: text }}
                        />
                      )}
                    </div>
                  </section>
                );
              }

              if (block.type === "image_banner") {
                const imageUrl = block.data.imageUrl as string;
                if (!imageUrl) return null;
                return (
                  <section key={block.id} className="overflow-hidden rounded-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="" className="aspect-video w-full object-cover" />
                  </section>
                );
              }

              if (block.type === "rich_text") {
                const content = (block.data.content as string) || "";
                if (!content.trim()) return null;
                return (
                  <section
                    key={block.id}
                    className="rounded-2xl border border-[var(--store-card-border)] bg-[var(--store-card-bg)] p-5 backdrop-blur-xl"
                  >
                    <div
                      className="prose prose-sm max-w-none text-[var(--store-text)]"
                      dangerouslySetInnerHTML={{ __html: content }}
                    />
                  </section>
                );
              }

              if (block.type === "bullet_list") {
                const items = (block.data.items as string[]) || [];
                const valid = items.filter(Boolean);
                if (valid.length === 0) return null;
                return (
                  <section
                    key={block.id}
                    className="rounded-2xl border border-[var(--store-card-border)] bg-[var(--store-card-bg)] p-5 backdrop-blur-xl"
                  >
                    <ul className="space-y-2">
                      {valid.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm text-[var(--store-text)]">
                          <span
                            className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                            style={{ backgroundColor: "color-mix(in srgb, var(--store-btn-bg) 25%, transparent)", color: "var(--store-btn-bg)" }}
                          >
                            ✓
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              }

              if (block.type === "hero") return null;

              return null;
            })}

            {blogPosts.length > 0 && (
              <section>
                <h2 className="mb-4 text-xl font-semibold tracking-tight text-[var(--store-text)]">Latest posts</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {blogPosts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/blog/${post.id}`}
                      onClick={isPreview ? (e) => e.preventDefault() : undefined}
                      className="overflow-hidden rounded-2xl border border-[var(--store-card-border)] bg-[var(--store-card-bg)] transition-opacity hover:opacity-90"
                    >
                      {post.featured_image_url && (
                        <div className="relative aspect-video w-full">
                          <Image src={post.featured_image_url} alt={post.title} fill className="object-cover" />
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="font-semibold text-[var(--store-text)]">{post.title}</h3>
                        {post.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-[var(--store-subheadline)]">{post.description}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <a
              href="https://www.sito.club"
              target="_blank"
              rel="noopener noreferrer"
              className="pt-4 text-center text-sm text-[var(--store-subheadline)] opacity-70 hover:opacity-100"
              onClick={isPreview ? (e) => e.preventDefault() : undefined}
            >
              Powered by Sito
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
