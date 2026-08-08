"use client";

import Image from "next/image";
import Link from "next/link";
import type { StorefrontProductItem } from "@/types/storefront";
import { CourseEnrollment } from "@/components/course-enrollment";

function formatPrice(price: number, pricingType: string) {
  if (price === 0) return "Free";
  const suffix = pricingType === "hourly" ? "/hr" : "";
  return `$${Number(price).toFixed(price % 1 === 0 ? 0 : 2)}${suffix}`;
}

function productTypeLabel(product: StorefrontProductItem): string {
  if (product.duration_label) return product.duration_label;
  if (product.product_type === "appointment") return "1-on-1";
  const subtype = (product.e_learning_subtype || "").toLowerCase();
  if (subtype.includes("course") || product.course_id) return "Course";
  if (subtype.includes("ebook") || subtype.includes("download")) return "Download";
  if (subtype.includes("webinar")) return "Live";
  if (subtype.includes("prompt")) return "AI Prompt";
  if (product.product_type === "e-learning") return "E-Learning";
  return "Product";
}

interface StorefrontProductCardProps {
  product: StorefrontProductItem;
  expertId: string;
  currentUserId?: string;
  buttonClassName?: string;
  brandColor?: string;
  buttonTextColor?: string;
  themePreset?: string;
  isPreview?: boolean;
  onBook?: () => void;
}

export function StorefrontProductCard({
  product,
  expertId,
  currentUserId,
  buttonClassName = "",
  brandColor,
  buttonTextColor,
  themePreset,
  isPreview = false,
  onBook,
}: StorefrontProductCardProps) {
  const tag = productTypeLabel(product);
  const isAppointment = product.product_type === "appointment";
  const ctaLabel = isAppointment ? "Book now" : product.price === 0 ? "Get free" : "Get it now";

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--store-card-border)] bg-[var(--store-card-bg)] shadow-md backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900/10">
        {product.cover_image_url ? (
          <Image
            src={product.cover_image_url}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background: `linear-gradient(145deg, color-mix(in srgb, var(--store-btn-bg) 35%, transparent), var(--store-card-bg))`,
            }}
          >
            <span className="text-sm font-medium text-[var(--store-subheadline)]">{tag}</span>
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-md">
            {tag}
          </span>
        </div>
        <span
          className="absolute bottom-3 right-3 rounded-full px-3 py-1 text-xs font-bold shadow-lg"
          style={{ background: "var(--store-btn-bg)", color: "var(--store-btn-text)" }}
        >
          {formatPrice(product.price, product.pricing_type)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold tracking-tight text-[var(--store-text)] line-clamp-2">
            {product.name}
          </h3>
          {product.description && (
            <div
              className="mt-1.5 text-sm text-[var(--store-subheadline)] line-clamp-2 product-preview"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          )}
        </div>

        {isPreview || (!product.course_id && !isAppointment) ? (
          isAppointment ? (
            <button
              type="button"
              onClick={onBook}
              className={`w-full py-2.5 text-center text-sm font-semibold ${buttonClassName}`}
            >
              {ctaLabel}
            </button>
          ) : (
            <Link
              href={product.course_id ? `/courses/${product.course_id}` : `/expert/${expertId}`}
              className={`block w-full py-2.5 text-center text-sm font-semibold ${buttonClassName}`}
              onClick={isPreview ? (e) => e.preventDefault() : undefined}
            >
              {ctaLabel}
            </Link>
          )
        ) : product.course_id ? (
          <CourseEnrollment
            courseId={product.course_id}
            expertId={expertId}
            coursePrice={product.price}
            isFree={product.price === 0}
            currentUserId={currentUserId}
            customBrandColor={brandColor}
            customButtonTextColor={buttonTextColor}
            themePreset={themePreset || "default"}
            productName={product.name}
            productDescription={product.description || undefined}
          />
        ) : (
          <button
            type="button"
            onClick={onBook}
            className={`w-full py-2.5 text-center text-sm font-semibold ${buttonClassName}`}
          >
            {ctaLabel}
          </button>
        )}
      </div>
    </article>
  );
}
