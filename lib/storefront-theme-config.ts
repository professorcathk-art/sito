/**
 * Theme & Styling Engine - CSS Variable-driven design system
 * Themes act as presets that overwrite granular state.
 */

export type ThemePresetId = "minimal" | "midnight-glass" | "neo-brutalist" | "soft-gradient" | "fluid-aura" | "pearl-silk" | "organic-earth" | "neon-cyber" | "glass-ocean" | "liquid-velvet";
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
    backgroundColor: "#FAFAFA",
    textColor: "#111827",
    subheadlineColor: "#6B7280",
    buttonColor: "#111827",
    buttonTextColor: "#FFFFFF",
    cardStyle: "flat",
    buttonRadius: "rounded",
  },
  "midnight-glass": {
    backgroundColor: "#0A0A0A",
    textColor: "#F9FAFB",
    subheadlineColor: "rgba(249,250,251,0.75)",
    buttonColor: "#FFFFFF",
    buttonTextColor: "#000000",
    cardStyle: "glass",
    buttonRadius: "pill",
    glowElement: "absolute inset-0 pointer-events-none bg-indigo-900/20 blur-[100px] -z-10",
  },
  "neo-brutalist": {
    backgroundColor: "#FEF08A",
    textColor: "#000000",
    subheadlineColor: "#374151",
    buttonColor: "#4F46E5",
    buttonTextColor: "#FFFFFF",
    cardStyle: "brutalist",
    buttonRadius: "sharp",
  },
  "soft-gradient": {
    backgroundColor: "conic-gradient(at top right, var(--tw-gradient-stops))",
    textColor: "#1A1A1A",
    subheadlineColor: "#4B5563",
    buttonColor: "#1A1A1A",
    buttonTextColor: "#FFFFFF",
    cardStyle: "soft-shadow",
    buttonRadius: "pill",
  },
  "fluid-aura": {
    backgroundColor: "#050505",
    textColor: "#f1f5f9",
    subheadlineColor: "rgba(241,245,249,0.7)",
    buttonColor: "rgba(255,255,255,0.1)",
    buttonTextColor: "#FFFFFF",
    cardStyle: "glass",
    buttonRadius: "pill",
  },
  "pearl-silk": {
    backgroundColor: "conic-gradient(at top right, var(--tw-gradient-stops))",
    textColor: "#1A1A1A",
    subheadlineColor: "#4B5563",
    buttonColor: "#1A1A1A",
    buttonTextColor: "#FFFFFF",
    cardStyle: "soft-shadow",
    buttonRadius: "pill",
  },
  "organic-earth": {
    backgroundColor: "#8E8B7B",
    backgroundImageUrl: "",
    textColor: "#FAF8F5",
    subheadlineColor: "rgba(250,248,245,0.85)",
    buttonColor: "#E8E4D9",
    buttonTextColor: "#2D2B26",
    fontFamily: "playfair",
    buttonStyle: "organic",
    buttonRadius: "pill",
    cardStyle: "flat",
  },
  "neon-cyber": {
    backgroundColor: "#05010D",
    backgroundImageUrl: "https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=1080&auto=format&fit=crop",
    textColor: "#FFFFFF",
    subheadlineColor: "rgba(255,255,255,0.75)",
    buttonColor: "#FF4D00",
    buttonTextColor: "#FFFFFF",
    fontFamily: "jetbrains-mono",
    buttonStyle: "neon",
    buttonRadius: "rounded",
    cardStyle: "glass",
  },
  "glass-ocean": {
    backgroundColor: "#000000",
    backgroundImageUrl: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?q=80&w=1080&auto=format&fit=crop",
    textColor: "#FFFFFF",
    subheadlineColor: "rgba(255,255,255,0.75)",
    buttonColor: "rgba(255,255,255,0.2)",
    buttonTextColor: "#FFFFFF",
    fontFamily: "inter",
    buttonStyle: "glass",
    buttonRadius: "pill",
    cardStyle: "glass",
  },
  "liquid-velvet": {
    backgroundColor: "#000000",
    backgroundImageUrl: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?q=80&w=1080&auto=format&fit=crop",
    textColor: "#FFFFFF",
    subheadlineColor: "rgba(255,255,255,0.75)",
    buttonColor: "#F59E0B",
    buttonTextColor: "#000000",
    fontFamily: "inter",
    buttonStyle: "glass",
    buttonRadius: "pill",
    cardStyle: "glass",
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
    wrapper: "bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-rose-50 via-slate-50 to-amber-50 text-[#1A1A1A]",
    card: "bg-white/40 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl",
    button: "bg-[#1A1A1A] text-white hover:bg-[#2A2A2A] rounded-full shadow-lg",
  },
  "fluid-aura": {
    id: "fluid-aura",
    name: "Fluid Aura",
    wrapper: "bg-[#050505] text-slate-100 relative overflow-hidden",
    card: "bg-white/[0.03] backdrop-blur-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] rounded-3xl",
    button: "bg-white/10 text-white border border-white/20 hover:bg-white/20 rounded-full backdrop-blur-md",
  },
  "pearl-silk": {
    id: "pearl-silk",
    name: "Pearl Silk",
    wrapper: "bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-rose-50 via-slate-50 to-amber-50 text-[#1A1A1A]",
    card: "bg-white/40 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl",
    button: "bg-[#1A1A1A] text-white hover:bg-[#2A2A2A] rounded-full shadow-lg",
  },
  "organic-earth": {
    id: "organic-earth",
    name: "Organic Earth",
    wrapper: "bg-[#8E8B7B] text-[#FAF8F5]",
    card: "bg-white/90 border border-black/10 rounded-2xl shadow-sm",
    button: "bg-[#E8E4D9] text-[#2D2B26] rounded-full border-b-4 border-r-4 border-black/20",
  },
  "neon-cyber": {
    id: "neon-cyber",
    name: "Neon Cyber",
    wrapper: "bg-[#05010D] text-white relative overflow-hidden",
    card: "bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl",
    button: "bg-[#FF4D00] text-white shadow-[0_0_20px_#FF4D00] border border-white/20 rounded-lg",
  },
  "glass-ocean": {
    id: "glass-ocean",
    name: "Glass Ocean",
    wrapper: "bg-[#000000] text-white relative overflow-hidden",
    card: "bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl",
    button: "bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-full shadow-lg",
  },
  "liquid-velvet": {
    id: "liquid-velvet",
    name: "Liquid Velvet",
    wrapper: "bg-[#000000] text-white relative overflow-hidden",
    card: "bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl",
    button: "bg-[#F59E0B] text-black rounded-full shadow-lg",
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

/** Map button style to Tailwind classes for link/CTA buttons */
export function getButtonStyleClasses(buttonStyle: ButtonStyleId, buttonColor: string, buttonTextColor: string, buttonRadius: string): string {
  const radiusClass = buttonRadius === "pill" ? "rounded-full" : buttonRadius === "sharp" ? "rounded-none" : "rounded-xl";
  switch (buttonStyle) {
    case "glass":
      return "bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-lg " + radiusClass;
    case "neon":
      return `bg-[var(--store-btn-bg)] text-[var(--store-btn-text)] shadow-[0_0_20px_var(--store-btn-bg)] border border-white/20 ${radiusClass}`;
    case "organic":
      return `bg-[var(--store-btn-bg)] text-[var(--store-btn-text)] rounded-3xl border-b-4 border-r-4 border-black/20`;
    case "default":
    default:
      return `bg-[var(--store-btn-bg)] text-[var(--store-btn-text)] ${radiusClass}`;
  }
}

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
  storefront_button_variant?: string;
  storefront_font_family?: string;
  storefront_background_color?: string;
  storefront_background_image_url?: string;
  storefront_card_style?: string;
  storefront_text_color?: string;
  storefront_button_text_color?: string;
  storefront_subheadline_color?: string;
}): { backgroundColor: string; backgroundImageUrl?: string; textColor: string; subheadlineColor: string; buttonColor: string; buttonTextColor: string; fontFamily: string; cardStyle: string; buttonRadius: string; buttonStyle: string; themePreset: string } {
  const themeMap: Record<string, keyof typeof THEME_PRESET_VALUES> = {
    default: "minimal",
    "minimal-light": "minimal",
    "bold-dark": "midnight-glass",
    "pearl-silk": "pearl-silk",
    "organic-earth": "organic-earth",
    "neon-cyber": "neon-cyber",
    "glass-ocean": "glass-ocean",
    "liquid-velvet": "liquid-velvet",
  };
  const rawTheme = profile.storefront_theme_preset || "default";
  const themePreset = (themeMap[rawTheme] || rawTheme) as keyof typeof THEME_PRESET_VALUES;
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
    themePreset: themePreset in THEME_PRESET_VALUES ? themePreset : "minimal",
  };
}
