-- Add questionnaire_response_id column to product_interests table
-- This links product interests to questionnaire responses

ALTER TABLE product_interests
ADD COLUMN IF NOT EXISTS questionnaire_response_id UUID REFERENCES questionnaire_responses(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_product_interests_questionnaire_response_id 
ON product_interests(questionnaire_response_id);

-- Add comment to document the column
COMMENT ON COLUMN product_interests.questionnaire_response_id IS 'Optional link to questionnaire response if user filled out a questionnaire when registering interest';

-- Verify the column was added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'product_interests'
  AND column_name = 'questionnaire_response_id';
