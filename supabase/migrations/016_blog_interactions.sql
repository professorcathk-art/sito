-- Create blog views tracking table
CREATE TABLE IF NOT EXISTS blog_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blog_post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(blog_post_id, user_id)
);

-- Create blog likes table
CREATE TABLE IF NOT EXISTS blog_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blog_post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(blog_post_id, user_id)
);

-- Create blog watchlist table (Watch Later)
CREATE TABLE IF NOT EXISTS blog_watchlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blog_post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(blog_post_id, user_id)
);

-- Add view_count and like_count to blog_posts for performance
ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_blog_views_blog_post_id ON blog_views(blog_post_id);
CREATE INDEX IF NOT EXISTS idx_blog_views_user_id ON blog_views(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_likes_blog_post_id ON blog_likes(blog_post_id);
CREATE INDEX IF NOT EXISTS idx_blog_likes_user_id ON blog_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_watchlist_user_id ON blog_watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_view_count ON blog_posts(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_like_count ON blog_posts(like_count DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);

-- RLS Policies for blog_views
ALTER TABLE blog_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own blog views"
  ON blog_views FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own blog views"
  ON blog_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for blog_likes
ALTER TABLE blog_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blog likes"
  ON blog_likes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can insert their own blog likes"
  ON blog_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own blog likes"
  ON blog_likes FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for blog_watchlist
ALTER TABLE blog_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own watchlist"
  ON blog_watchlist FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own watchlist items"
  ON blog_watchlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watchlist items"
  ON blog_watchlist FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update view_count
CREATE OR REPLACE FUNCTION update_blog_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE blog_posts
  SET view_count = (
    SELECT COUNT(*) FROM blog_views WHERE blog_post_id = NEW.blog_post_id
  )
  WHERE id = NEW.blog_post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update like_count
CREATE OR REPLACE FUNCTION update_blog_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE blog_posts
    SET like_count = (
      SELECT COUNT(*) FROM blog_likes WHERE blog_post_id = NEW.blog_post_id
    )
    WHERE id = NEW.blog_post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE blog_posts
    SET like_count = (
      SELECT COUNT(*) FROM blog_likes WHERE blog_post_id = OLD.blog_post_id
    )
    WHERE id = OLD.blog_post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS trigger_update_blog_view_count ON blog_views;
CREATE TRIGGER trigger_update_blog_view_count
  AFTER INSERT ON blog_views
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_view_count();

DROP TRIGGER IF EXISTS trigger_update_blog_like_count_insert ON blog_likes;
CREATE TRIGGER trigger_update_blog_like_count_insert
  AFTER INSERT ON blog_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_like_count();

DROP TRIGGER IF EXISTS trigger_update_blog_like_count_delete ON blog_likes;
CREATE TRIGGER trigger_update_blog_like_count_delete
  AFTER DELETE ON blog_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_like_count();

