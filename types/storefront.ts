export interface StorefrontBlock {
  id: string;
  type: "header" | "links" | "products" | "image_text" | "faq" | "testimonials";
  order: number;
  data: Record<string, unknown>;
}
