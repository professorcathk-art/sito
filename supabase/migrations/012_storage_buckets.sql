-- Create storage buckets for blog resources and course materials
-- Note: These buckets need to be created in Supabase Dashboard > Storage first
-- Then run these policies

-- Drop existing policies if they exist (for clean setup)
DROP POLICY IF EXISTS "Users can upload blog resources" ON storage.objects;
DROP POLICY IF EXISTS "Users can update blog resources" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete blog resources" ON storage.objects;
DROP POLICY IF EXISTS "Public can view blog resources" ON storage.objects;

-- Blog resources bucket policies
CREATE POLICY "Users can upload blog resources"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'blog-resources');

CREATE POLICY "Users can update blog resources"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'blog-resources')
WITH CHECK (bucket_id = 'blog-resources');

CREATE POLICY "Users can delete blog resources"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'blog-resources');

CREATE POLICY "Public can view blog resources"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'blog-resources');

