"use client";

import { useMemo } from "react";
import Link from "next/link";
import { LeadMagnetLanding, type LeadLandingMagnet } from "@/components/storefront/lead-magnet-landing";
import type { StorefrontDesignState } from "@/types/storefront";
import {
  FONT_FAMILIES,
  getButtonStyleClasses,
  getCardCssVars,
} from "@/lib/storefront-theme-config";

interface LeadLandingPageViewProps {
  magnet: LeadLandingMagnet;
  expertId: string;
  expertName: string;
  designState: StorefrontDesignState;
  storefrontSlug: string;
  navSlot?: React.ReactNode;
  hidePoweredBy?: boolean;
}

export function LeadLandingPageView({
  magnet,
  expertId,
  expertName,
  designState,
  storefrontSlug,
  navSlot,
  hidePoweredBy,
}: LeadLandingPageViewProps) {
  const isFluidAura = designState.themePreset === "fluid-aura";
  const isSoftGradient =
    designState.themePreset === "soft-gradient" || designState.themePreset === "pearl-silk";

  const cssVars = useMemo(() => {
    const darkThemes = ["neon-cyber", "glass-ocean", "liquid-velvet", "midnight-glass", "fluid-aura"];
    let card = getCardCssVars(designState.cardStyle as "flat" | "glass" | "brutalist" | "soft-shadow");
    if (isFluidAura) card = { bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.12)" };
    else if (isSoftGradient) card = { bg: "rgba(255,255,255,0.78)", border: "rgba(255,255,255,0.85)" };
    return {
      "--store-bg-color": isFluidAura ? "#050505" : designState.backgroundColor,
      "--store-bg": isFluidAura ? "#050505" : designState.backgroundColor,
      "--store-bg-ring": darkThemes.includes(designState.themePreset || "") ? "#0f172a" : "#ffffff",
      "--store-text": isFluidAura ? "#f1f5f9" : isSoftGradient ? "#1E293B" : designState.textColor,
      "--store-subheadline":
        designState.subheadlineColor ||
        (isFluidAura ? "rgba(241,245,249,0.72)" : isSoftGradient ? "#64748B" : designState.textColor),
      "--store-btn-bg": isFluidAura
        ? "rgba(255,255,255,0.12)"
        : isSoftGradient
          ? "#1E293B"
          : designState.buttonColor,
      "--store-btn-text": designState.buttonTextColor,
      "--store-card-bg": card.bg,
      "--store-card-border": card.border,
    } as React.CSSProperties;
  }, [designState, isFluidAura, isSoftGradient]);

  const fontClass = FONT_FAMILIES.find((f) => f.id === designState.fontFamily)?.class || "font-store-inter";
  const buttonStyleClass = getButtonStyleClasses(
    (designState.buttonStyle as "default" | "glass" | "neon" | "organic") || "default",
    designState.buttonColor,
    designState.buttonTextColor,
    designState.buttonRadius
  );

  const pageBackground = isFluidAura
    ? "#050505"
    : isSoftGradient
      ? "linear-gradient(160deg, #FFF7ED 0%, #F8FAFC 45%, #EFF6FF 100%)"
      : designState.backgroundColor;

  return (
    <div
      className={`min-h-screen relative ${fontClass}`}
      style={{
        ...cssVars,
        background: pageBackground,
        color: "var(--store-text)",
      }}
    >
      {navSlot}
      <LeadMagnetLanding
        magnet={magnet}
        expertId={expertId}
        expertName={expertName}
        buttonClassName={buttonStyleClass}
      />
      {storefrontSlug && (
        <div className="pb-4 text-center">
          <Link
            href={`/s/${storefrontSlug}`}
            className="text-sm text-[var(--store-subheadline)] hover:text-[var(--store-text)]"
          >
            ← Back to {expertName}
          </Link>
        </div>
      )}
      {!hidePoweredBy && (
        <a
          href="https://www.sito.club"
          target="_blank"
          rel="noopener noreferrer"
          className="block pb-10 text-center text-sm text-[var(--store-subheadline)] opacity-70 hover:opacity-100"
        >
          Powered by Sito
        </a>
      )}
    </div>
  );
}
