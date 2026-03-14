/**
 * Theme & Styling Engine - Hardcoded theme presets for Storefront Builder
 * Uses Tailwind CSS classes. Do not guess - these are the exact classes per spec.
 */

export type ThemePresetId = "minimal" | "midnight-glass" | "neo-brutalist" | "soft-gradient";
export type FontFamilyId = "font-sans" | "font-serif" | "font-mono";
export type BackgroundType = "solid" | "gradient" | "mesh";
export type CardStyleId = "flat" | "glass" | "brutalist" | "soft-shadow";
export type ButtonStyleId = "rounded-full" | "rounded-md" | "sharp";

export interface ThemePresetConfig {
  id: ThemePresetId;
  name: string;
  wrapper: string;
  card: string;
  button: string;
  /** Optional glow/ambient element classes for wrapper (e.g. midnight-glass) */
  glowElement?: string;
}

export const THEME_PRESETS: Record<ThemePresetId, ThemePresetConfig> = {
  minimal: {
    id: "minimal",
    name: "Minimal",
    wrapper: "bg-[#FAFAFA] text-slate-900",
    card: "bg-white border border-slate-200 shadow-sm rounded-2xl",
    button: "bg-slate-900 text-white hover:bg-slate-800",
  },
  "midnight-glass": {
    id: "midnight-glass",
    name: "Midnight Glass",
    wrapper: "bg-[#0A0A0A] text-slate-50 relative overflow-hidden",
    card: "bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl",
    button: "bg-white text-black hover:bg-slate-200",
    glowElement: "absolute inset-0 pointer-events-none bg-indigo-900/20 blur-[100px] -z-10",
  },
  "neo-brutalist": {
    id: "neo-brutalist",
    name: "Neo Brutalist",
    wrapper: "bg-[#FEF08A] text-black",
    card: "bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-none",
    button:
      "bg-[#4F46E5] text-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all rounded-none",
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
  { id: "font-sans", name: "Sans-serif (Inter)", class: "font-sans" },
  { id: "font-serif", name: "Serif (Playfair)", class: "font-serif" },
  { id: "font-mono", name: "Monospace", class: "font-mono" },
];

export const CARD_STYLES: { id: CardStyleId; name: string }[] = [
  { id: "flat", name: "Flat" },
  { id: "glass", name: "Glass" },
  { id: "brutalist", name: "Brutalist" },
  { id: "soft-shadow", name: "Soft Shadow" },
];

export const BUTTON_STYLES: { id: ButtonStyleId; name: string }[] = [
  { id: "rounded-full", name: "Pill" },
  { id: "rounded-md", name: "Rounded" },
  { id: "sharp", name: "Sharp" },
];
