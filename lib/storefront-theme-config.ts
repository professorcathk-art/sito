/**
 * Theme & Styling Engine - CSS Variable-driven design system
 * Themes act as presets that overwrite granular state.
 */

export type ThemePresetId = "minimal" | "midnight-glass" | "neo-brutalist" | "soft-gradient";
export type FontFamilyId = "inter" | "roboto" | "playfair" | "space-grotesk" | "dm-sans";
export type BackgroundType = "solid" | "gradient" | "mesh";
export type CardStyleId = "flat" | "glass" | "brutalist" | "soft-shadow";
export type ButtonRadiusId = "pill" | "rounded" | "sharp";

export interface ThemePresetValues {
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  buttonTextColor: string;
  cardStyle: CardStyleId;
  buttonRadius: ButtonRadiusId;
  glowElement?: string;
}

/** Theme presets - when selected, overwrite all granular design state */
export const THEME_PRESET_VALUES: Record<ThemePresetId, ThemePresetValues> = {
  minimal: {
    backgroundColor: "#FAFAFA",
    textColor: "#111827",
    buttonColor: "#111827",
    buttonTextColor: "#FFFFFF",
    cardStyle: "flat",
    buttonRadius: "rounded",
  },
  "midnight-glass": {
    backgroundColor: "#0A0A0A",
    textColor: "#F9FAFB",
    buttonColor: "#FFFFFF",
    buttonTextColor: "#000000",
    cardStyle: "glass",
    buttonRadius: "pill",
    glowElement: "absolute inset-0 pointer-events-none bg-indigo-900/20 blur-[100px] -z-10",
  },
  "neo-brutalist": {
    backgroundColor: "#FEF08A",
    textColor: "#000000",
    buttonColor: "#4F46E5",
    buttonTextColor: "#FFFFFF",
    cardStyle: "brutalist",
    buttonRadius: "sharp",
  },
  "soft-gradient": {
    backgroundColor: "linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)",
    textColor: "#1F2937",
    buttonColor: "#3B82F6",
    buttonTextColor: "#FFFFFF",
    cardStyle: "soft-shadow",
    buttonRadius: "pill",
  },
};

/** Legacy wrapper classes for theme preview cards in Design tab */
export const THEME_PRESETS: Record<ThemePresetId, { id: ThemePresetId; name: string; wrapper: string; card: string; button: string; glowElement?: string }> = {
  minimal: {
    id: "minimal",
    name: "Minimal",
    wrapper: "bg-[#FAFAFA] text-slate-900",
    card: "bg-white border border-slate-200 shadow-sm rounded-2xl",
    button: "bg-slate-900 text-white",
  },
  "midnight-glass": {
    id: "midnight-glass",
    name: "Midnight Glass",
    wrapper: "bg-[#0A0A0A] text-slate-50 relative overflow-hidden",
    card: "bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl",
    button: "bg-white text-black",
    glowElement: "absolute inset-0 pointer-events-none bg-indigo-900/20 blur-[100px] -z-10",
  },
  "neo-brutalist": {
    id: "neo-brutalist",
    name: "Neo Brutalist",
    wrapper: "bg-[#FEF08A] text-black",
    card: "bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none",
    button: "bg-[#4F46E5] text-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none",
  },
  "soft-gradient": {
    id: "soft-gradient",
    name: "Soft Gradient",
    wrapper: "bg-gradient-to-br from-rose-100 to-teal-100 text-slate-800",
    card: "bg-white/60 backdrop-blur-md border border-white/40 shadow-lg rounded-3xl",
    button: "bg-slate-900 text-white rounded-full",
  },
};

export const FONT_FAMILIES: { id: FontFamilyId; name: string; class: string }[] = [
  { id: "inter", name: "Inter", class: "font-store-inter" },
  { id: "roboto", name: "Roboto", class: "font-store-roboto" },
  { id: "playfair", name: "Playfair Display", class: "font-store-playfair" },
  { id: "space-grotesk", name: "Space Grotesk", class: "font-store-space-grotesk" },
  { id: "dm-sans", name: "DM Sans", class: "font-store-dm-sans" },
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

/** Map card style to CSS variable values */
export function getCardCssVars(cardStyle: CardStyleId): { bg: string; border: string } {
  switch (cardStyle) {
    case "glass":
      return { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)" };
    case "brutalist":
      return { bg: "#FFFFFF", border: "#000000" };
    case "soft-shadow":
      return { bg: "rgba(255,255,255,0.9)", border: "rgba(0,0,0,0.08)" };
    case "flat":
    default:
      return { bg: "#FFFFFF", border: "rgba(0,0,0,0.1)" };
  }
}

/** Derive design state from profile for public storefront */
export function getDesignStateFromProfile(profile: {
  storefront_theme_preset?: string;
  storefront_custom_brand_color?: string;
  storefront_button_style?: string;
  storefront_font_family?: string;
  storefront_background_color?: string;
  storefront_card_style?: string;
  storefront_text_color?: string;
  storefront_button_text_color?: string;
}): { backgroundColor: string; textColor: string; buttonColor: string; buttonTextColor: string; fontFamily: string; cardStyle: string; buttonRadius: string; themePreset: string } {
  const themeMap: Record<string, keyof typeof THEME_PRESET_VALUES> = {
    default: "minimal",
    "minimal-light": "minimal",
    "bold-dark": "midnight-glass",
  };
  const rawTheme = profile.storefront_theme_preset || "default";
  const themePreset = (themeMap[rawTheme] || rawTheme) as keyof typeof THEME_PRESET_VALUES;
  const preset = THEME_PRESET_VALUES[themePreset] ?? THEME_PRESET_VALUES.minimal;
  const fontMap: Record<string, string> = {
    "font-sans": "inter",
    "font-serif": "playfair",
    inter: "inter",
    roboto: "roboto",
    playfair: "playfair",
    "space-grotesk": "space-grotesk",
    "dm-sans": "dm-sans",
  };
  const btnMap: Record<string, string> = {
    "rounded-full": "pill",
    "rounded-md": "rounded",
    "hard-edge": "sharp",
    sharp: "sharp",
  };
  const storedFont = profile.storefront_font_family || "font-sans";
  const storedBtn = profile.storefront_button_style || "rounded-md";
  return {
    backgroundColor: profile.storefront_background_color || preset.backgroundColor,
    textColor: profile.storefront_text_color || preset.textColor,
    buttonColor: profile.storefront_custom_brand_color || preset.buttonColor,
    buttonTextColor: profile.storefront_button_text_color || preset.buttonTextColor,
    fontFamily: fontMap[storedFont] || "inter",
    cardStyle: profile.storefront_card_style || preset.cardStyle,
    buttonRadius: btnMap[storedBtn] || "rounded",
    themePreset: themePreset in THEME_PRESET_VALUES ? themePreset : "minimal",
  };
}
