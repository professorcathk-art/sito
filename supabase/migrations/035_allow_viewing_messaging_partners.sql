-- Allow users to view profiles of people they're messaging with
-- This ensures names are visible in conversations even if profiles aren't publicly listed

CREATE POLICY "Users can view messaging partners' profiles"
  ON profiles FOR SELECT
  USING (
    -- User can view their own profile
    auth.uid() = id
    OR
    -- User can view profiles that are publicly listed
    listed_on_marketplace = true
    OR
    -- User can view profiles of people they've sent messages to
    EXISTS (
      SELECT 1 FROM messages
      WHERE messages.from_id = auth.uid()
      AND messages.to_id = profiles.id
    )
    OR
    -- User can view profiles of people who have sent them messages
    EXISTS (
      SELECT 1 FROM messages
      WHERE messages.to_id = auth.uid()
      AND messages.from_id = profiles.id
    )
  );

-- Note: This policy allows users to see names of people they're in conversation with
-- even if those profiles aren't publicly listed on the marketplace
