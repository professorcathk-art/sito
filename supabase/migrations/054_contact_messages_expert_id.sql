-- Optional: scope storefront / contact leads to an expert
-- App also embeds expert id in subject/message so Audience works before this is applied.

ALTER TABLE contact_messages
ADD COLUMN IF NOT EXISTS expert_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contact_messages_expert_id ON contact_messages(expert_id);

COMMENT ON COLUMN contact_messages.expert_id IS 'Owning expert for storefront lead magnet signups; null for general contact form';
