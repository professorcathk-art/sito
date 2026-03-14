export interface StorefrontBlock {
  id: string;
  type: "header" | "links" | "products" | "image_text" | "faq" | "testimonials" | "rich_text" | "image_banner" | "bullet_list";
  order: number;
  data: Record<string, unknown>;
}
