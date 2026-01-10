-- Add comprehensive categories covering various expertise areas and job natures
-- This expands the category list to include 50 most common professional areas

INSERT INTO categories (name, description, icon) VALUES
  -- Technology & Development (existing + additions)
  ('Website Development', 'Frontend, backend, and full-stack web development', '🌐'),
  ('Software Development', 'Mobile apps, desktop applications, and enterprise solutions', '💻'),
  ('DevOps & Cloud', 'Infrastructure, CI/CD, AWS, Azure, GCP, and cloud architecture', '☁️'),
  ('Cybersecurity', 'Security audits, penetration testing, and threat management', '🔒'),
  ('Blockchain & Web3', 'Cryptocurrency, smart contracts, and decentralized applications', '⛓️'),
  ('Game Development', 'Video game design, development, and game engine expertise', '🎮'),
  
  -- Data & Analytics
  ('Data Science', 'Machine learning, data analysis, and AI', '📊'),
  ('Business Intelligence', 'Data visualization, reporting, and analytics dashboards', '📈'),
  ('Database Administration', 'SQL, NoSQL, database optimization, and data modeling', '🗄️'),
  
  -- Design & Creative
  ('Design', 'UI/UX design, graphic design, and creative direction', '🎨'),
  ('3D Modeling & Animation', '3D design, animation, and visual effects', '🎬'),
  ('Video Production', 'Video editing, cinematography, and post-production', '🎥'),
  ('Photography', 'Photography and visual storytelling', '📷'),
  ('Music & Audio', 'Music production, audio engineering, and sound design', '🎵'),
  ('Writing & Editing', 'Content writing, copywriting, and editorial services', '✍️'),
  
  -- Business & Strategy
  ('Entrepreneur', 'Business strategy, startup guidance, and scaling expertise', '🚀'),
  ('Business Strategy', 'Strategic planning, business model design, and growth strategies', '📋'),
  ('Project Management', 'Agile, Scrum, PMP, and project delivery methodologies', '📅'),
  ('Product Management', 'Product strategy, roadmap planning, and execution', '📦'),
  ('Operations', 'Operations management and process optimization', '⚙️'),
  ('Supply Chain', 'Logistics, procurement, and supply chain optimization', '🚚'),
  ('Quality Assurance', 'QA testing, test automation, and quality management', '✅'),
  
  -- Marketing & Sales
  ('Marketing', 'Digital marketing, SEO, content strategy, and brand building', '📢'),
  ('Social Media Marketing', 'Social media strategy, community management, and influencer marketing', '📱'),
  ('Sales', 'Sales strategy and business development', '💬'),
  ('Public Relations', 'PR strategy, media relations, and reputation management', '📰'),
  ('E-commerce', 'Online store setup, conversion optimization, and marketplace management', '🛒'),
  
  -- Finance & Accounting
  ('Finance', 'Financial planning, accounting, and investment advisory', '💰'),
  ('Accounting', 'Bookkeeping, tax preparation, and financial reporting', '📊'),
  ('Trading', 'Stock market, forex, cryptocurrency, and investment strategies', '📈'),
  ('Real Estate', 'Property investment and real estate consulting', '🏠'),
  
  -- Professional Services
  ('Consulting', 'Business consulting and strategic advisory', '💼'),
  ('Legal', 'Legal advice and consultation', '⚖️'),
  ('Human Resources', 'HR strategy, talent acquisition, and people management', '👥'),
  ('Recruiting', 'Talent sourcing, interview coaching, and career placement', '🔍'),
  ('Coaching', 'Life coaching, career coaching, and personal development', '🎯'),
  ('Training & Development', 'Corporate training, skill development, and workshops', '🎓'),
  
  -- Education & Learning
  ('Education', 'Teaching, training, and educational content creation', '📚'),
  ('Language Learning', 'Language instruction, translation, and interpretation', '🗣️'),
  ('Test Preparation', 'Exam prep, tutoring, and academic support', '📝'),
  
  -- Healthcare & Wellness
  ('Healthcare', 'Medical advice, health coaching, and wellness', '🏥'),
  ('Fitness & Nutrition', 'Personal training, nutrition planning, and wellness coaching', '💪'),
  ('Mental Health', 'Therapy, counseling, and mental wellness support', '🧠'),
  
  -- Content & Media
  ('Content Creation', 'Writing, video production, and content strategy', '✍️'),
  ('Podcasting', 'Podcast production, hosting, and audio content creation', '🎙️'),
  ('Streaming', 'Live streaming, content creation, and audience building', '📺'),
  
  -- Specialized Industries
  ('Architecture', 'Architectural design, planning, and building consultation', '🏛️'),
  ('Engineering', 'Mechanical, electrical, civil, and other engineering disciplines', '⚡'),
  ('Science & Research', 'Scientific research, data analysis, and academic consulting', '🔬'),
  ('Agriculture', 'Farming, agricultural consulting, and sustainable practices', '🌾'),
  ('Aviation', 'Flight training, aviation consulting, and aerospace expertise', '✈️'),
  ('Maritime', 'Marine engineering, navigation, and maritime consulting', '🚢'),
  
  -- Emerging Fields
  ('Sustainability', 'Environmental consulting, green energy, and sustainable practices', '🌱'),
  ('Virtual Reality', 'VR/AR development, immersive experiences, and spatial computing', '🥽'),
  ('Robotics', 'Robotics engineering, automation, and AI integration', '🤖')
ON CONFLICT (name) DO NOTHING;

-- Note: This migration uses ON CONFLICT DO NOTHING to avoid errors if categories already exist
-- The existing 19 categories will remain, and new ones will be added
-- Total categories after this migration: up to 50 categories
