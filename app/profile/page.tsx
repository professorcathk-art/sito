"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ProtectedRoute } from "@/components/protected-route";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface Profile {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  avatar_url: string | null;
  website: string | null;
  linkedin: string | null;
  instagram_url: string | null;
  verified: boolean;
  listed_on_marketplace: boolean;
  category_name: string | null;
  country_name: string | null;
}

interface Stats {
  blogPosts: number;
  courses: number;
  subscribers: number;
  products: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats>({
    blogPosts: 0,
    courses: 0,
    subscribers: 0,
    products: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchStats();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          name,
          title,
          bio,
          avatar_url,
          website,
          linkedin,
          instagram_url,
          verified,
          listed_on_marketplace,
          categories(name),
          countries(name)
        `)
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          id: data.id,
          name: data.name || "Your Name",
          title: data.title,
          bio: data.bio,
          avatar_url: data.avatar_url,
          website: data.website,
          linkedin: data.linkedin,
          instagram_url: data.instagram_url,
          verified: data.verified || false,
          listed_on_marketplace: data.listed_on_marketplace || false,
          category_name: (data.categories as any)?.name || null,
          country_name: (data.countries as any)?.name || null,
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!user) return;
    try {
      // Fetch blog posts count
      const { count: blogCount } = await supabase
        .from("blog_posts")
        .select("*", { count: "exact", head: true })
        .eq("expert_id", user.id);

      // Fetch courses count
      const { count: courseCount } = await supabase
        .from("courses")
        .select("*", { count: "exact", head: true })
        .eq("expert_id", user.id);

      // Fetch subscribers count
      const { count: subscriberCount } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("expert_id", user.id);

      // Fetch products count
      const { count: productCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("expert_id", user.id);

      setStats({
        blogPosts: blogCount || 0,
        courses: courseCount || 0,
        subscribers: subscriberCount || 0,
        products: productCount || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            <div className="animate-pulse">
              <div className="h-32 bg-dark-green-800/30 rounded-lg mb-8"></div>
              <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 bg-dark-green-800/30 rounded-lg"></div>
                ))}
              </div>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!profile) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center py-12 bg-dark-green-800/30 border border-cyber-green/30 rounded-lg">
              <p className="text-custom-text/80 text-lg mb-4">You haven't set up your profile yet.</p>
              <button
                onClick={() => router.push("/profile/setup")}
                className="inline-flex items-center gap-2 px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
              >
                <span>⚙️</span>
                <span>Set Up Your Profile</span>
              </button>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-4xl font-bold text-custom-text">Profile</h1>
              <button
                onClick={() => router.push("/profile/setup")}
                className="flex items-center gap-2 px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 text-custom-text rounded-lg hover:bg-dark-green-900 hover:border-cyber-green transition-colors"
              >
                <span>⚙️</span>
                <span>Set Up Your Profile</span>
              </button>
            </div>
          </div>

          {/* Profile Header */}
          <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-8 mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.name}
                    width={120}
                    height={120}
                    className="rounded-full border-4 border-cyber-green/30"
                  />
                ) : (
                  <div className="w-30 h-30 rounded-full bg-dark-green-700 border-4 border-cyber-green/30 flex items-center justify-center">
                    <span className="text-4xl text-cyber-green font-bold">
                      {profile.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-bold text-custom-text">{profile.name}</h2>
                  {profile.verified && (
                    <span className="text-cyber-green text-2xl" title="Verified Expert">
                      ✓
                    </span>
                  )}
                </div>
                {profile.title && (
                  <p className="text-xl text-custom-text/80 mb-2">{profile.title}</p>
                )}
                <div className="flex flex-wrap items-center gap-4 text-sm text-custom-text/70 mb-3">
                  {profile.category_name && (
                    <span className="text-xs text-cyber-green bg-dark-green-900/50 px-2 py-1 rounded-full border border-cyber-green/30">
                      {profile.category_name}
                    </span>
                  )}
                  {profile.country_name && <span>{profile.country_name}</span>}
                  {profile.listed_on_marketplace ? (
                    <span className="text-green-400">✓ Listed on Marketplace</span>
                  ) : (
                    <span className="text-yellow-400">Private Profile</span>
                  )}
                </div>
                {profile.bio && (
                  <p className="text-custom-text/90 mb-4">{profile.bio}</p>
                )}
                {(profile.website || profile.linkedin || profile.instagram_url) && (
                  <div className="flex flex-wrap gap-4">
                    {profile.website && (
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyber-green hover:text-cyber-green-light underline text-sm"
                      >
                        Website
                      </a>
                    )}
                    {profile.linkedin && (
                      <a
                        href={profile.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyber-green hover:text-cyber-green-light underline text-sm"
                      >
                        LinkedIn
                      </a>
                    )}
                    {profile.instagram_url && (
                      <a
                        href={profile.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyber-green hover:text-cyber-green-light underline text-sm"
                      >
                        Instagram
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-cyber-green mb-1">{stats.blogPosts}</div>
              <div className="text-sm text-custom-text/70">Blog Posts</div>
            </div>
            <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-cyber-green mb-1">{stats.courses}</div>
              <div className="text-sm text-custom-text/70">Courses</div>
            </div>
            <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-cyber-green mb-1">{stats.subscribers}</div>
              <div className="text-sm text-custom-text/70">Subscribers</div>
            </div>
            <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-cyber-green mb-1">{stats.products}</div>
              <div className="text-sm text-custom-text/70">Products</div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6">
            <h3 className="text-xl font-bold text-custom-text mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                href="/dashboard/blog"
                className="p-4 border border-cyber-green/30 rounded-lg hover:border-cyber-green hover:bg-dark-green-900/30 transition-all"
              >
                <div className="font-semibold text-custom-text mb-1">Manage Blog Posts</div>
                <div className="text-sm text-custom-text/70">View and edit your blog posts</div>
              </Link>
              <Link
                href="/courses/manage"
                className="p-4 border border-cyber-green/30 rounded-lg hover:border-cyber-green hover:bg-dark-green-900/30 transition-all"
              >
                <div className="font-semibold text-custom-text mb-1">Manage Courses</div>
                <div className="text-sm text-custom-text/70">View and edit your courses</div>
              </Link>
              <Link
                href="/products"
                className="p-4 border border-cyber-green/30 rounded-lg hover:border-cyber-green hover:bg-dark-green-900/30 transition-all"
              >
                <div className="font-semibold text-custom-text mb-1">Manage Products</div>
                <div className="text-sm text-custom-text/70">View and edit your products</div>
              </Link>
              <Link
                href={`/expert/${user?.id}`}
                className="p-4 border border-cyber-green/30 rounded-lg hover:border-cyber-green hover:bg-dark-green-900/30 transition-all"
              >
                <div className="font-semibold text-custom-text mb-1">View Public Profile</div>
                <div className="text-sm text-custom-text/70">See how others see your profile</div>
              </Link>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

