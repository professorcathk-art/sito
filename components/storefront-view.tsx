"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { CourseEnrollment } from "@/components/course-enrollment";
import type { StorefrontBlock } from "@/types/storefront";

interface StorefrontViewProps {
  expertId: string;
  expertName: string;
  expertBio: string;
  expertTagline?: string;
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
  storefrontBlocks = [],
}: StorefrontViewProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const [cssVars, setCssVars] = useState<Record<string, string>>({});

  useEffect(() => {
    const vars: Record<string, string> = {};
    if (customBrandColor) {
      vars["--brand"] = customBrandColor;
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
        return `${base} rounded-lg`;
      case "hard-edge":
        return `${base} rounded-none`;
      case "outline":
        return `${base} rounded-lg border-2 bg-transparent`;
      default:
        return `${base} rounded-lg`;
    }
  };

  const getThemeClasses = () => {
    switch (themePreset) {
      case "minimal":
      case "minimal-light":
        return "bg-[#FAFAFA] text-slate-900 min-h-screen";
      case "midnight-glass":
      case "bold-dark":
        return "bg-[#0A0A0A] text-slate-50 min-h-screen relative overflow-hidden";
      case "neo-brutalist":
        return "bg-[#FEF08A] text-black min-h-screen";
      case "soft-gradient":
        return "bg-gradient-to-br from-rose-100 to-teal-100 text-slate-800 min-h-screen";
      default:
        return "bg-slate-950 text-slate-50 min-h-screen";
    }
  };

  const isLightColor = (hex: string): boolean => {
    const c = hex.replace(/^#/, "");
    if (c.length !== 6) return false;
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6;
  };

  const getButtonStyle = () => {
    if (!customBrandColor) return {};
    const useDarkText = isLightColor(customBrandColor) || ["minimal", "minimal-light", "soft-gradient", "neo-brutalist"].includes(themePreset);
    if (buttonStyle === "outline") {
      return { borderColor: customBrandColor, color: customBrandColor };
    }
    return {
      backgroundColor: customBrandColor,
      color: useDarkText ? "#111827" : "#FFFFFF",
    };
  };

  const primaryActionClasses = "bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg mt-4 w-full font-semibold transition-all duration-300";

  const allLinks = [
    ...customLinks,
    ...(website ? [{ title: "Website", url: website, icon: "🌐", order: 1000 }] : []),
    ...(linkedin ? [{ title: "LinkedIn", url: linkedin, icon: "💼", order: 1001 }] : []),
    ...(instagramUrl ? [{ title: "Instagram", url: instagramUrl, icon: "📷", order: 1002 }] : []),
  ].sort((a, b) => a.order - b.order);

  // Build default blocks when none configured (header, links, products)
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

  // Always use Link-in-Bio layout (centered, single column)
  if (blocksToRender.length > 0) {
    const sortedBlocks = [...blocksToRender].sort((a, b) => a.order - b.order);
    const brandColor = customBrandColor || "#6366f1";

    return (
      <div
        className={`${getThemeClasses()} relative`}
        style={{ ...cssVars, "--brand": brandColor } as React.CSSProperties}
      >
        <div className="w-full min-h-screen flex flex-col items-center pb-12">
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
                      <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-slate-700 flex-shrink-0">
                        <Image src={img} alt={name} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
                        <svg className="w-12 h-12 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <h1 className="text-2xl font-bold text-slate-50">{name}</h1>
                      {verified && <span className="text-indigo-400 shrink-0" title="Verified">✓</span>}
                    </div>
                    {tagline && <p className="text-slate-400 text-sm mt-1">{tagline}</p>}
                    {bio && <p className="text-slate-400 text-sm mt-2 max-w-full">{bio}</p>}
                    {(website || linkedin || instagramUrl) && (
                      <div className="flex gap-3 mt-4">
                        {website && (
                          <a href={website} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-200 transition-colors">🌐</a>
                        )}
                        {linkedin && (
                          <a href={linkedin} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-200 transition-colors">💼</a>
                        )}
                        {instagramUrl && (
                          <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-200 transition-colors">📷</a>
                        )}
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
                        className="flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition-all"
                      >
                        {link.thumbnailUrl && (
                          <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                            <Image src={link.thumbnailUrl} alt="" fill className="object-cover" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 text-left">
                          <span className="font-semibold block">{link.title}</span>
                          {link.description && <span className="text-sm opacity-90 block mt-0.5 line-clamp-2">{link.description}</span>}
                        </div>
                        <span className="text-sm shrink-0">→</span>
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
                const cardClass = "flex flex-row items-center bg-slate-900 border border-slate-800 rounded-2xl p-4 gap-4 hover:border-slate-600 transition-all";
                return (
                  <section key={block.id} className="flex flex-col gap-4">
                    {displayedProducts.map((product) => (
                      product.course_id && user ? (
                        <div key={product.id} className={cardClass}>
                          {product.cover_image_url && (
                            <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                              <Image src={product.cover_image_url} alt={product.name} fill className="object-cover" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-50 truncate">{product.name}</h3>
                            <p className="text-slate-400 text-sm mt-0.5">
                              {product.price === 0 ? "Free" : `$${product.price} ${product.pricing_type === "hourly" ? "/hr" : ""}`}
                            </p>
                          </div>
                          <CourseEnrollment
                            courseId={product.course_id}
                            expertId={expertId}
                            coursePrice={product.price}
                            isFree={product.price === 0}
                            currentUserId={user.id}
                            customBrandColor={customBrandColor}
                            themePreset={themePreset}
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
                            <h3 className="font-semibold text-slate-50 truncate">{product.name}</h3>
                            <p className="text-slate-400 text-sm mt-0.5">
                              {product.price === 0 ? "Free" : `$${product.price} ${product.pricing_type === "hourly" ? "/hr" : ""}`}
                            </p>
                          </div>
                          <span className="text-sm font-medium" style={{ color: brandColor }}>View →</span>
                        </Link>
                      )
                    ))}
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
                      {title && <h3 className="text-lg font-semibold text-slate-50 mb-2">{title}</h3>}
                      {text && <div className="text-slate-400 text-sm prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: text }} />}
                    </div>
                  </section>
                );
              }
              if (block.type === "faq") {
                const items = (block.data.items as Array<{ question: string; answer: string }>) || [];
                if (items.length === 0) return null;
                return (
                  <section key={block.id} className="space-y-2">
                    <h2 className="text-xl font-semibold text-slate-50 mb-4">FAQ</h2>
                    {items.map((item, idx) => (
                      <details key={idx} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden group">
                        <summary className="px-4 py-3 cursor-pointer text-slate-50 font-medium list-none flex items-center justify-between">
                          {item.question}
                          <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <div className="px-4 pb-3 text-slate-400 text-sm border-t border-slate-800 pt-2">{item.answer}</div>
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
                      <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <p className="text-slate-300 text-sm italic">&quot;{item.quote}&quot;</p>
                        <p className="text-slate-400 text-xs mt-2">— {item.name}</p>
                      </div>
                    ))}
                  </section>
                );
              }
              return null;
            })}

            {hasAppointments && (
              <Link
                href={`/appointments/book/${expertId}`}
                className={`${getButtonClasses()} block`}
                style={getButtonStyle()}
              >
                Book 1-on-1 Session
              </Link>
            )}

            <a
              href="https://www.sito.club"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 text-sm hover:text-slate-300 transition-colors mt-12 pb-8"
            >
              ⚡️ Powered by Sito
            </a>
          </main>
        </div>
      </div>
    );
  }

  // Fallback: minimal single-column layout (should not reach here with default blocks)
  return (
    <div className={`${getThemeClasses()} relative`} style={cssVars}>
      {themePreset === "midnight-glass" && (
        <div className="fixed inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-indigo-600/15 blur-[100px] rounded-full" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-500/10 blur-[80px] rounded-full" />
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 md:gap-12">
          <aside className="md:col-span-4 md:sticky md:top-24 h-fit">
            <div className="flex flex-col items-center md:items-start">
              {avatarUrl ? (
                <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-2 border-slate-700 flex-shrink-0">
                  <Image src={avatarUrl} alt={expertName} fill className="object-cover" />
                </div>
              ) : (
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center flex-shrink-0">
                  <svg className="w-16 h-16 md:w-20 md:h-20 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}

              <div className="mt-6 text-center md:text-left w-full">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-50 tracking-tight">{expertName}</h1>
                  {verified && <span className="text-indigo-400" title="Verified Expert">✓</span>}
                </div>
                <p className="text-slate-400 text-sm md:text-base leading-relaxed">
                  {bioOverride || expertBio || "Welcome to my storefront"}
                </p>
              </div>

              {allLinks.length > 0 && (
                <div className="flex justify-center md:justify-start gap-3 mt-6 flex-wrap">
                  {allLinks.slice(0, 6).map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-slate-700 transition-all duration-300"
                    >
                      {link.icon ? <span className="text-lg">{link.icon}</span> : (
                        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      )}
                    </a>
                  ))}
                </div>
              )}

              {allLinks.length > 0 && (
                <div className="flex flex-col gap-3 w-full mt-6">
                  {allLinks.map((link, idx) => (
                    <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className={`${getButtonClasses()} block hover:opacity-90`} style={getButtonStyle()}>
                      {link.title}
                    </a>
                  ))}
                </div>
              )}

              {hasAppointments && (
                <Link href={`/appointments/book/${expertId}`} className={`${getButtonClasses()} mt-4 block`} style={getButtonStyle()}>
                  Book 1-on-1 Session
                </Link>
              )}
            </div>
          </aside>

          <main className="md:col-span-8 space-y-8 mt-8 md:mt-0">
            {products.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-slate-50 tracking-tight mb-6">Products & Services</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {products.map((product) => (
                    <div key={product.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                      {product.cover_image_url && (
                        <div className="relative w-full aspect-video bg-slate-800">
                          <Image src={product.cover_image_url} alt={product.name} fill className="object-cover rounded-t-xl" />
                        </div>
                      )}
                      <div className="p-5">
                        <h3 className="text-lg font-semibold text-slate-50 tracking-tight mb-2">{product.name}</h3>
                        {product.description && (
                          <div className="text-slate-400 text-sm leading-relaxed line-clamp-2 mb-3 product-preview" dangerouslySetInnerHTML={{ __html: product.description }} />
                        )}
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-lg font-bold text-slate-50">
                            {product.price === 0 ? "Free" : `$${product.price} ${product.pricing_type === "hourly" ? "/hr" : ""}`}
                          </span>
                          {product.e_learning_subtype && (
                            <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-full text-xs font-medium">
                              {product.e_learning_subtype}
                            </span>
                          )}
                        </div>
                        {product.course_id && user ? (
                          <CourseEnrollment
                            courseId={product.course_id}
                            expertId={expertId}
                            coursePrice={product.price}
                            isFree={product.price === 0}
                            currentUserId={user.id}
                            customBrandColor={customBrandColor}
                            themePreset={themePreset}
                          />
                        ) : (
                          <Link
                            href={`/expert/${expertId}`}
                            className={primaryActionClasses}
                            style={
                              !customBrandColor
                                ? {}
                                : {
                                    backgroundColor: customBrandColor,
                                    color: isLightColor(customBrandColor) || themePreset === "minimal-light" ? "#111827" : "#FFFFFF",
                                  }
                            }
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
                <h2 className="text-xl font-semibold text-slate-50 tracking-tight mb-6">Latest Posts</h2>
                <div className="space-y-3">
                  {blogPosts.map((post) => (
                    <Link key={post.id} href={`/blog/${post.id}`} className="block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                      {post.featured_image_url && (
                        <div className="relative w-full h-48">
                          <Image src={post.featured_image_url} alt={post.title} fill className="object-cover" />
                        </div>
                      )}
                      <div className="p-5">
                        <h3 className="text-lg font-semibold text-slate-50 tracking-tight mb-2">{post.title}</h3>
                        {post.description && <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">{post.description}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <a href="https://www.sito.club" target="_blank" rel="noopener noreferrer" className="block text-center pt-8 border-t border-slate-800 text-slate-500 text-sm hover:text-slate-300 transition-colors pb-8">
              ⚡️ Powered by Sito
            </a>
          </main>
        </div>
      </div>
    </div>
  );
}
