-- Add storefront_blocks for modular block builder (Shopify-style)
-- Each block: { id, type, order, data }
-- Types: header, links, products, image_text, faq, testimonials

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS storefront_blocks JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN profiles.storefront_blocks IS 'Modular storefront blocks: [{id, type, order, data}]. Types: header, links, products, image_text, faq, testimonials';
