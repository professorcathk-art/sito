-- Comprehensive features migration
-- This migration adds: blog posts, courses, subscriptions, admin, Stripe Connect, appointments, and product photos

-- Add Instagram URL and admin flag to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_connect_onboarding_complete BOOLEAN DEFAULT false;

-- Create blog_posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expert_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL, -- Rich text HTML content
  featured_image_url TEXT,
  access_level TEXT CHECK (access_level IN ('public', 'subscriber', 'paid')) DEFAULT 'public',
  notify_subscribers BOOLEAN DEFAULT true,
  reading_time_minutes INTEGER,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create blog_post_resources table for file uploads
CREATE TABLE IF NOT EXISTS blog_post_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blog_post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expert_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  price DECIMAL(10, 2) DEFAULT 0,
  is_free BOOLEAN DEFAULT true,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create course_lessons table
CREATE TABLE IF NOT EXISTS course_lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT, -- YouTube/Vimeo URL
  video_type TEXT CHECK (video_type IN ('youtube', 'vimeo')) DEFAULT 'youtube',
  content TEXT, -- Rich text notes
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create course_lesson_resources table for file uploads in lessons
CREATE TABLE IF NOT EXISTS course_lesson_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create course_enrollments table
CREATE TABLE IF NOT EXISTS course_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  payment_intent_id TEXT, -- Stripe payment intent ID for paid courses
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(course_id, user_id)
);

-- Create lesson_progress table
CREATE TABLE IF NOT EXISTS lesson_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id UUID REFERENCES course_enrollments(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(enrollment_id, lesson_id)
);

-- Create subscriptions table (follow/subscribe system)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  expert_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, expert_id)
);

-- Create appointments table for live 1-on-1 sessions
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expert_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  rate_per_hour DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_intent_id TEXT, -- Stripe payment intent ID
  status TEXT CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create appointment_slots table for expert availability
CREATE TABLE IF NOT EXISTS appointment_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expert_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  rate_per_hour DECIMAL(10, 2) NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create product_photos table for product galleries
CREATE TABLE IF NOT EXISTS product_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create stripe_payouts table for tracking expert earnings
CREATE TABLE IF NOT EXISTS stripe_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expert_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  platform_fee_percent DECIMAL(5, 2) DEFAULT 20.00,
  platform_fee_amount DECIMAL(10, 2) NOT NULL,
  expert_amount DECIMAL(10, 2) NOT NULL,
  payment_intent_id TEXT NOT NULL,
  payout_status TEXT CHECK (payout_status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  stripe_payout_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lesson_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_payouts ENABLE ROW LEVEL SECURITY;

-- Blog posts policies
CREATE POLICY "Public blog posts are viewable by everyone"
  ON blog_posts FOR SELECT
  USING (access_level = 'public' AND published_at IS NOT NULL);

CREATE POLICY "Subscriber blog posts are viewable by subscribers"
  ON blog_posts FOR SELECT
  USING (
    (access_level = 'subscriber' AND published_at IS NOT NULL AND EXISTS (
      SELECT 1 FROM subscriptions WHERE user_id = auth.uid() AND expert_id = blog_posts.expert_id
    ))
    OR (access_level = 'public' AND published_at IS NOT NULL)
  );

CREATE POLICY "Paid blog posts require enrollment"
  ON blog_posts FOR SELECT
  USING (
    (access_level = 'paid' AND published_at IS NOT NULL AND EXISTS (
      SELECT 1 FROM course_enrollments ce
      JOIN courses c ON c.id = ce.course_id
      WHERE ce.user_id = auth.uid() AND c.expert_id = blog_posts.expert_id
    ))
    OR (access_level IN ('public', 'subscriber') AND published_at IS NOT NULL)
  );

CREATE POLICY "Experts can view own blog posts"
  ON blog_posts FOR SELECT
  USING (auth.uid() = expert_id);

CREATE POLICY "Experts can insert own blog posts"
  ON blog_posts FOR INSERT
  WITH CHECK (auth.uid() = expert_id);

CREATE POLICY "Experts can update own blog posts"
  ON blog_posts FOR UPDATE
  USING (auth.uid() = expert_id);

CREATE POLICY "Experts can delete own blog posts"
  ON blog_posts FOR DELETE
  USING (auth.uid() = expert_id);

-- Blog post resources policies
CREATE POLICY "Blog post resources are viewable with post"
  ON blog_post_resources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts bp
      WHERE bp.id = blog_post_resources.blog_post_id
      AND (
        bp.access_level = 'public'
        OR (bp.access_level = 'subscriber' AND EXISTS (
          SELECT 1 FROM subscriptions WHERE user_id = auth.uid() AND expert_id = bp.expert_id
        ))
        OR auth.uid() = bp.expert_id
      )
    )
  );

CREATE POLICY "Experts can manage own blog post resources"
  ON blog_post_resources FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts WHERE id = blog_post_resources.blog_post_id AND expert_id = auth.uid()
    )
  );

-- Courses policies
CREATE POLICY "Published courses are viewable by everyone"
  ON courses FOR SELECT
  USING (published = true);

CREATE POLICY "Experts can view own courses"
  ON courses FOR SELECT
  USING (auth.uid() = expert_id);

CREATE POLICY "Experts can insert own courses"
  ON courses FOR INSERT
  WITH CHECK (auth.uid() = expert_id);

CREATE POLICY "Experts can update own courses"
  ON courses FOR UPDATE
  USING (auth.uid() = expert_id);

CREATE POLICY "Experts can delete own courses"
  ON courses FOR DELETE
  USING (auth.uid() = expert_id);

-- Course lessons policies
CREATE POLICY "Course lessons are viewable by enrolled users"
  ON course_lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM course_enrollments ce
      WHERE ce.course_id = course_lessons.course_id
      AND ce.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_lessons.course_id
      AND c.expert_id = auth.uid()
    )
  );

CREATE POLICY "Experts can manage own course lessons"
  ON course_lessons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM courses WHERE id = course_lessons.course_id AND expert_id = auth.uid()
    )
  );

-- Course lesson resources policies
CREATE POLICY "Lesson resources are viewable by enrolled users"
  ON course_lesson_resources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM course_lessons cl
      JOIN course_enrollments ce ON ce.course_id = cl.course_id
      WHERE cl.id = course_lesson_resources.lesson_id
      AND ce.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM course_lessons cl
      JOIN courses c ON c.id = cl.course_id
      WHERE cl.id = course_lesson_resources.lesson_id
      AND c.expert_id = auth.uid()
    )
  );

CREATE POLICY "Experts can manage own lesson resources"
  ON course_lesson_resources FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM course_lessons cl
      JOIN courses c ON c.id = cl.course_id
      WHERE cl.id = course_lesson_resources.lesson_id
      AND c.expert_id = auth.uid()
    )
  );

-- Course enrollments policies
CREATE POLICY "Users can view own enrollments"
  ON course_enrollments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Experts can view enrollments in own courses"
  ON course_enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM courses WHERE id = course_enrollments.course_id AND expert_id = auth.uid()
    )
  );

CREATE POLICY "Users can enroll in courses"
  ON course_enrollments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Lesson progress policies
CREATE POLICY "Users can view own progress"
  ON lesson_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM course_enrollments WHERE id = lesson_progress.enrollment_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Experts can view progress in own courses"
  ON lesson_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM course_enrollments ce
      JOIN courses c ON c.id = ce.course_id
      WHERE ce.id = lesson_progress.enrollment_id
      AND c.expert_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own progress"
  ON lesson_progress FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM course_enrollments WHERE id = lesson_progress.enrollment_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own progress"
  ON lesson_progress FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM course_enrollments WHERE id = lesson_progress.enrollment_id AND user_id = auth.uid()
    )
  );

-- Subscriptions policies
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = expert_id);

CREATE POLICY "Users can subscribe to experts"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsubscribe"
  ON subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Appointments policies
CREATE POLICY "Users can view own appointments"
  ON appointments FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = expert_id);

CREATE POLICY "Users can book appointments"
  ON appointments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own appointments"
  ON appointments FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = expert_id);

-- Appointment slots policies
CREATE POLICY "Available appointment slots are viewable by everyone"
  ON appointment_slots FOR SELECT
  USING (is_available = true);

CREATE POLICY "Experts can manage own appointment slots"
  ON appointment_slots FOR ALL
  USING (auth.uid() = expert_id);

-- Product photos policies
CREATE POLICY "Product photos are viewable with product"
  ON product_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_photos.product_id
      AND (
        EXISTS (
          SELECT 1 FROM profiles WHERE id = p.expert_id AND listed_on_marketplace = true
        )
        OR auth.uid() = p.expert_id
      )
    )
  );

CREATE POLICY "Experts can manage own product photos"
  ON product_photos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM products WHERE id = product_photos.product_id AND expert_id = auth.uid()
    )
  );

-- Stripe payouts policies
CREATE POLICY "Experts can view own payouts"
  ON stripe_payouts FOR SELECT
  USING (auth.uid() = expert_id);

CREATE POLICY "Admins can view all payouts"
  ON stripe_payouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_expert_id ON blog_posts(expert_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at);
CREATE INDEX IF NOT EXISTS idx_blog_posts_access_level ON blog_posts(access_level);
CREATE INDEX IF NOT EXISTS idx_blog_post_resources_blog_post_id ON blog_post_resources(blog_post_id);
CREATE INDEX IF NOT EXISTS idx_courses_expert_id ON courses(expert_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_course_id ON course_lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_order ON course_lessons(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user_id ON course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_enrollment_id ON lesson_progress(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expert_id ON subscriptions(expert_id);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_expert_id ON appointments(expert_id);
CREATE INDEX IF NOT EXISTS idx_appointment_slots_expert_id ON appointment_slots(expert_id);
CREATE INDEX IF NOT EXISTS idx_product_photos_product_id ON product_photos(product_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payouts_expert_id ON stripe_payouts(expert_id);

-- Create triggers for updated_at
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_lessons_updated_at BEFORE UPDATE ON course_lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_progress_updated_at BEFORE UPDATE ON lesson_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_payouts_updated_at BEFORE UPDATE ON stripe_payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create admin account (chris.lau@sito.club)
-- Note: This will create the profile if it doesn't exist, but the user must sign up first
-- The admin flag will be set after user creation
INSERT INTO profiles (id, email, name, is_admin)
SELECT id, email, 'Admin', true
FROM auth.users
WHERE email = 'chris.lau@sito.club'
ON CONFLICT (id) DO UPDATE SET is_admin = true;

