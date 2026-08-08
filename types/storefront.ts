export type StorefrontBlockType =
  | "hero"
  | "header"
  | "links"
  | "products"
  | "image_text"
  | "faq"
  | "testimonials"
  | "rich_text"
  | "image_banner"
  | "bullet_list"
  | "social_media"
  | "book_me"
  | "lead_magnet";

export interface StorefrontBlock {
  id: string;
  type: StorefrontBlockType;
  order: number;
  data: Record<string, unknown>;
}

export interface StorefrontHeroData {
  imageUrl?: string;
  overlayOpacity?: number; // 0–100
  overlayColor?: string;
  avatarPosition?: "left" | "center";
}

export interface StorefrontLeadMagnetData {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  placeholder?: string;
  successMessage?: string;
}

export interface StorefrontProductItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  pricing_type: string;
  product_type?: string;
  course_id?: string;
  e_learning_subtype?: string;
  cover_image_url?: string | null;
  duration_label?: string | null;
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
