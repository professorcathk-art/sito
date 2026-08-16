/**
 * Theme & Styling Engine - CSS Variable-driven design system
 * Themes act as presets that overwrite granular state.
 */

export type ThemePresetId =
  | "minimal"
  | "midnight-glass"
  | "soft-gradient"
  | "fluid-aura"
  | "organic-earth"
  | "neon-cyber"
  | "glass-ocean"
  | "liquid-velvet";

/** Themes removed from picker but still mapped when loading old profiles */
export type LegacyThemePresetId = "neo-brutalist" | "pearl-silk";

export type FontFamilyId = "inter" | "roboto" | "playfair" | "space-grotesk" | "dm-sans" | "jetbrains-mono";
export type BackgroundType = "solid" | "gradient" | "mesh";
export type CardStyleId = "flat" | "glass" | "brutalist" | "soft-shadow";
export type ButtonRadiusId = "pill" | "rounded" | "sharp";
export type ButtonStyleId = "default" | "glass" | "neon" | "organic";

export interface ThemePresetValues {
  backgroundColor: string;
  backgroundImageUrl?: string;
  textColor: string;
  subheadlineColor?: string;
  buttonColor: string;
  buttonTextColor: string;
  fontFamily?: FontFamilyId;
  cardStyle: CardStyleId;
  buttonRadius: ButtonRadiusId;
  buttonStyle?: ButtonStyleId;
  glowElement?: string;
}

/** Theme presets - when selected, overwrite all granular design state */
export const THEME_PRESET_VALUES: Record<ThemePresetId, ThemePresetValues> = {
  minimal: {
    backgroundColor: "#F8FAFC",
    textColor: "#0F172A",
    subheadlineColor: "#64748B",
    buttonColor: "#0F172A",
    buttonTextColor: "#FFFFFF",
    cardStyle: "flat",
    buttonRadius: "rounded",
  },
  "midnight-glass": {
    backgroundColor: "#09090B",
    textColor: "#FAFAFA",
    subheadlineColor: "rgba(250,250,250,0.72)",
    buttonColor: "#FAFAFA",
    buttonTextColor: "#09090B",
    cardStyle: "glass",
    buttonRadius: "pill",
    glowElement: "absolute inset-0 pointer-events-none bg-violet-900/25 blur-[120px] -z-10",
  },
  "soft-gradient": {
    backgroundColor: "linear-gradient(160deg, #FFF7ED 0%, #F8FAFC 45%, #EFF6FF 100%)",
    textColor: "#1E293B",
    subheadlineColor: "#64748B",
    buttonColor: "#1E293B",
    buttonTextColor: "#FFFFFF",
    cardStyle: "soft-shadow",
    buttonRadius: "pill",
  },
  "fluid-aura": {
    backgroundColor: "#050505",
    textColor: "#F1F5F9",
    subheadlineColor: "rgba(241,245,249,0.72)",
    buttonColor: "rgba(255,255,255,0.12)",
    buttonTextColor: "#FFFFFF",
    cardStyle: "glass",
    buttonRadius: "pill",
  },
  "organic-earth": {
    // Warm sand page + deep ink text (avoids low-contrast beige-on-beige)
    backgroundColor: "#F5F0E8",
    textColor: "#2C2416",
    subheadlineColor: "#6B5E4A",
    buttonColor: "#3F3424",
    buttonTextColor: "#F8F4EC",
    fontFamily: "playfair",
    buttonStyle: "organic",
    buttonRadius: "pill",
    cardStyle: "soft-shadow",
  },
  "neon-cyber": {
    backgroundColor: "#070012",
    backgroundImageUrl: "https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=1920&auto=format&fit=crop",
    textColor: "#F8FAFC",
    subheadlineColor: "rgba(248,250,252,0.75)",
    buttonColor: "#FF5A1F",
    buttonTextColor: "#FFFFFF",
    fontFamily: "jetbrains-mono",
    buttonStyle: "neon",
    buttonRadius: "rounded",
    cardStyle: "glass",
  },
  "glass-ocean": {
    backgroundColor: "#031525",
    backgroundImageUrl: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?q=80&w=1920&auto=format&fit=crop",
    textColor: "#F0F9FF",
    subheadlineColor: "rgba(240,249,255,0.78)",
    buttonColor: "rgba(255,255,255,0.18)",
    buttonTextColor: "#FFFFFF",
    fontFamily: "inter",
    buttonStyle: "glass",
    buttonRadius: "pill",
    cardStyle: "glass",
  },
  "liquid-velvet": {
    backgroundColor: "#140A18",
    backgroundImageUrl: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?q=80&w=1920&auto=format&fit=crop",
    textColor: "#FFFBEB",
    subheadlineColor: "rgba(255,251,235,0.78)",
    buttonColor: "#F59E0B",
    buttonTextColor: "#1C1917",
    fontFamily: "inter",
    buttonStyle: "glass",
    buttonRadius: "pill",
    cardStyle: "glass",
  },
};

/** Normalize legacy theme ids to current selectable themes */
export function normalizeThemePreset(raw?: string | null): ThemePresetId {
  const map: Record<string, ThemePresetId> = {
    default: "minimal",
    "minimal-light": "minimal",
    "bold-dark": "midnight-glass",
    "neo-brutalist": "minimal",
    "pearl-silk": "soft-gradient",
    "soft-gradient": "soft-gradient",
    minimal: "minimal",
    "midnight-glass": "midnight-glass",
    "fluid-aura": "fluid-aura",
    "organic-earth": "organic-earth",
    "neon-cyber": "neon-cyber",
    "glass-ocean": "glass-ocean",
    "liquid-velvet": "liquid-velvet",
  };
  if (!raw) return "minimal";
  return map[raw] ?? (raw in THEME_PRESET_VALUES ? (raw as ThemePresetId) : "minimal");
}

/** Legacy wrapper classes for theme preview cards in Design tab */
export const THEME_PRESETS: Record<ThemePresetId, { id: ThemePresetId; name: string; wrapper: string; card: string; button: string; glowElement?: string }> = {
  minimal: {
    id: "minimal",
    name: "Minimal",
    wrapper: "bg-[#F8FAFC] text-slate-900",
    card: "bg-white border border-slate-200 shadow-sm rounded-2xl",
    button: "bg-slate-900 text-white",
  },
  "midnight-glass": {
    id: "midnight-glass",
    name: "Midnight Glass",
    wrapper: "bg-[#09090B] text-zinc-50 relative overflow-hidden",
    card: "bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl",
    button: "bg-white text-black",
    glowElement: "absolute inset-0 pointer-events-none bg-violet-900/25 blur-[120px] -z-10",
  },
  "soft-gradient": {
    id: "soft-gradient",
    name: "Soft Gradient",
    wrapper: "bg-gradient-to-br from-orange-50 via-slate-50 to-sky-50 text-slate-800",
    card: "bg-white/70 backdrop-blur-xl border border-white/80 shadow-sm rounded-3xl",
    button: "bg-slate-800 text-white rounded-full",
  },
  "fluid-aura": {
    id: "fluid-aura",
    name: "Fluid Aura",
    wrapper: "bg-[#050505] text-slate-100 relative overflow-hidden",
    card: "bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-3xl",
    button: "bg-white/10 text-white border border-white/20 rounded-full",
  },
  "organic-earth": {
    id: "organic-earth",
    name: "Organic Earth",
    wrapper: "bg-[#F5F0E8] text-[#2C2416]",
    card: "bg-white border border-stone-200/80 rounded-2xl shadow-sm",
    button: "bg-[#3F3424] text-[#F8F4EC] rounded-full",
  },
  "neon-cyber": {
    id: "neon-cyber",
    name: "Neon Cyber",
    wrapper: "bg-[#070012] text-white relative overflow-hidden",
    card: "bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl",
    button: "bg-[#FF5A1F] text-white rounded-lg",
  },
  "glass-ocean": {
    id: "glass-ocean",
    name: "Glass Ocean",
    wrapper: "bg-[#031525] text-sky-50 relative overflow-hidden",
    card: "bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl",
    button: "bg-white/20 text-white rounded-full",
  },
  "liquid-velvet": {
    id: "liquid-velvet",
    name: "Liquid Velvet",
    wrapper: "bg-[#140A18] text-amber-50 relative overflow-hidden",
    card: "bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl",
    button: "bg-[#F59E0B] text-stone-950 rounded-full",
  },
};

export const FONT_FAMILIES: { id: FontFamilyId; name: string; class: string }[] = [
  { id: "inter", name: "Inter", class: "font-store-inter" },
  { id: "roboto", name: "Roboto", class: "font-store-roboto" },
  { id: "playfair", name: "Playfair Display", class: "font-store-playfair" },
  { id: "space-grotesk", name: "Space Grotesk", class: "font-store-space-grotesk" },
  { id: "dm-sans", name: "DM Sans", class: "font-store-dm-sans" },
  { id: "jetbrains-mono", name: "JetBrains Mono", class: "font-store-jetbrains-mono" },
];

export const BUTTON_STYLE_OPTIONS: { id: ButtonStyleId; name: string }[] = [
  { id: "default", name: "Default" },
  { id: "glass", name: "Glass" },
  { id: "neon", name: "Neon" },
  { id: "organic", name: "Organic" },
];

export const CARD_STYLES: { id: CardStyleId; name: string }[] = [
  { id: "flat", name: "Flat" },
  { id: "glass", name: "Glass" },
  { id: "brutalist", name: "Brutalist" },
  { id: "soft-shadow", name: "Soft Shadow" },
];

export const BUTTON_RADIUS_OPTIONS: { id: ButtonRadiusId; name: string }[] = [
  { id: "pill", name: "Pill" },
  { id: "rounded", name: "Rounded" },
  { id: "sharp", name: "Sharp" },
];

export function getButtonStyleClasses(buttonStyle: ButtonStyleId, buttonColor: string, buttonTextColor: string, buttonRadius: string): string {
  const radiusClass = buttonRadius === "pill" ? "rounded-full" : buttonRadius === "sharp" ? "rounded-none" : "rounded-xl";
  switch (buttonStyle) {
    case "glass":
      return "bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-lg " + radiusClass;
    case "neon":
      return `bg-[var(--store-btn-bg)] text-[var(--store-btn-text)] shadow-[0_0_20px_var(--store-btn-bg)] border border-white/20 ${radiusClass}`;
    case "organic":
      return `bg-[var(--store-btn-bg)] text-[var(--store-btn-text)] rounded-3xl border-b-4 border-r-4 border-black/15`;
    case "default":
    default:
      return `bg-[var(--store-btn-bg)] text-[var(--store-btn-text)] ${radiusClass}`;
  }
}

export function getCardCssVars(cardStyle: CardStyleId): { bg: string; border: string } {
  switch (cardStyle) {
    case "glass":
      return { bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.12)" };
    case "brutalist":
      return { bg: "#FFFFFF", border: "#000000" };
    case "soft-shadow":
      return { bg: "rgba(255,255,255,0.92)", border: "rgba(0,0,0,0.08)" };
    case "flat":
    default:
      return { bg: "#FFFFFF", border: "rgba(0,0,0,0.08)" };
  }
}

export function getDesignStateFromProfile(profile: {
  storefront_theme_preset?: string | null;
  storefront_custom_brand_color?: string | null;
  storefront_button_style?: string | null;
  storefront_button_variant?: string | null;
  storefront_font_family?: string | null;
  storefront_background_color?: string | null;
  storefront_background_image_url?: string | null;
  storefront_card_style?: string | null;
  storefront_text_color?: string | null;
  storefront_button_text_color?: string | null;
  storefront_subheadline_color?: string | null;
}): {
  backgroundColor: string;
  backgroundImageUrl?: string;
  textColor: string;
  subheadlineColor: string;
  buttonColor: string;
  buttonTextColor: string;
  fontFamily: string;
  cardStyle: string;
  buttonRadius: string;
  buttonStyle: string;
  themePreset: string;
} {
  const themePreset = normalizeThemePreset(profile.storefront_theme_preset);
  const preset = THEME_PRESET_VALUES[themePreset] ?? THEME_PRESET_VALUES.minimal;
  const fontMap: Record<string, string> = {
    "font-sans": "inter",
    "font-serif": "playfair",
    "font-mono": "jetbrains-mono",
    inter: "inter",
    roboto: "roboto",
    playfair: "playfair",
    "space-grotesk": "space-grotesk",
    "dm-sans": "dm-sans",
    "jetbrains-mono": "jetbrains-mono",
  };
  const btnMap: Record<string, string> = {
    "rounded-full": "pill",
    "rounded-md": "rounded",
    "hard-edge": "sharp",
    sharp: "sharp",
  };
  const storedFont = profile.storefront_font_family || "font-sans";
  const storedBtn = profile.storefront_button_style || "rounded-md";
  const buttonStyle = profile.storefront_button_variant || preset.buttonStyle || "default";
  const backgroundImageUrl = profile.storefront_background_image_url || preset.backgroundImageUrl;
  return {
    backgroundColor: profile.storefront_background_color || preset.backgroundColor,
    backgroundImageUrl: backgroundImageUrl || undefined,
    textColor: profile.storefront_text_color || preset.textColor,
    subheadlineColor: profile.storefront_subheadline_color || preset.subheadlineColor || preset.textColor,
    buttonColor: profile.storefront_custom_brand_color || preset.buttonColor,
    buttonTextColor: profile.storefront_button_text_color || preset.buttonTextColor,
    fontFamily: fontMap[storedFont] || preset.fontFamily || "inter",
    cardStyle: profile.storefront_card_style || preset.cardStyle,
    buttonRadius: btnMap[storedBtn] || preset.buttonRadius || "rounded",
    buttonStyle: ["default", "glass", "neon", "organic"].includes(buttonStyle) ? buttonStyle : (preset.buttonStyle || "default"),
    themePreset,
  };
}
