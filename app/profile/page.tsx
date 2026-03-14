"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ProtectedRoute } from "@/components/protected-route";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ConnectionsContent } from "@/components/connections-content";

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
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"profile" | "messages" | "connections">("profile");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchStats();
      fetchRecentMessages();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRecentMessages = async () => {
    if (!user) return;
    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("id, from_id, subject, content, read, created_at")
        .eq("to_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (messagesError) {
        console.error("Error fetching messages:", messagesError);
      } else if (messagesData && messagesData.length > 0) {
        const fromIds = messagesData.map((msg: any) => msg.from_id);
        const { data: senderProfiles } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", fromIds);

        const senderMap = new Map(senderProfiles?.map((p: any) => [p.id, p.name]) || []);

        const messages = messagesData.map((msg: any) => ({
          id: msg.id,
          from_id: msg.from_id,
          from_name: senderMap.get(msg.from_id) || "Unknown",
          subject: msg.subject,
          content: msg.content,
          read: msg.read,
          created_at: msg.created_at,
        }));
        setRecentMessages(messages);
        setUnreadCount(messages.filter((m) => !m.read).length);
      } else {
        setRecentMessages([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

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
          categories!profiles_category_id_fkey(name),
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
              <div className="h-32 bg-surface rounded-lg mb-8"></div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 bg-surface rounded-lg"></div>
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
            <div className="text-center py-12 bg-surface border border-border-default rounded-lg">
              <p className="text-text-secondary text-lg mb-4">You haven&apos;t set up your profile yet.</p>
              <button
                onClick={() => router.push("/profile/setup")}
                className="inline-flex items-center gap-2 px-6 py-3 bg-cyber-green text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors"
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
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6 mb-6">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-custom-text">Profile</h1>
              {/* Prominent Setup CTA */}
              <div className="bg-gradient-to-r from-cyber-green/20 to-cyber-green/10 border-2 border-border-default rounded-xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="flex-1">
                    <p className="text-base sm:text-lg font-semibold text-custom-text mb-1">
                      🚀 Start sharing your knowledge and expertise Now
                    </p>
                    <p className="text-sm text-text-secondary">
                      Complete your expert profile to unlock all features and connect with learners worldwide
                    </p>
                  </div>
                  <button
                    onClick={() => router.push("/profile/setup")}
                    className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-cyber-green text-white font-bold rounded-lg hover:bg-primary-hover transition-all transform hover:scale-105 shadow-[0_0_25px_rgba(0,255,136,0.5)] text-base sm:text-lg whitespace-nowrap animate-pulse-glow"
                  >
                    <span className="text-xl">⚙️</span>
                    <span>Set up Experts Profile</span>
                    <span className="text-lg">→</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Header */}
          <div className="bg-surface border border-border-default rounded-lg p-8 mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.name}
                    width={120}
                    height={120}
                    className="rounded-full border-4 border-border-default"
                  />
                ) : (
                  <div className="w-30 h-30 rounded-full bg-dark-green-700 border-4 border-border-default flex items-center justify-center">
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
                  <p className="text-xl text-text-secondary mb-2">{profile.title}</p>
                )}
                <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary mb-3">
                  {profile.category_name && (
                    <span className="text-xs text-cyber-green bg-custom-bg px-2 py-1 rounded-full border border-border-default">
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
                  <p className="text-text-primary mb-4">{profile.bio}</p>
                )}
                {(profile.website || profile.linkedin || profile.instagram_url) && (
                  <div className="flex flex-wrap gap-4">
                    {profile.website && (
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyber-green hover:text-primary-hover underline text-sm"
                      >
                        Website
                      </a>
                    )}
                    {profile.linkedin && (
                      <a
                        href={profile.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyber-green hover:text-primary-hover underline text-sm"
                      >
                        LinkedIn
                      </a>
                    )}
                    {profile.instagram_url && (
                      <a
                        href={profile.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyber-green hover:text-primary-hover underline text-sm"
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
            <div className="bg-surface border border-border-default rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-cyber-green mb-1">{stats.blogPosts}</div>
              <div className="text-sm text-text-secondary">Blog Posts</div>
            </div>
            <div className="bg-surface border border-border-default rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-cyber-green mb-1">{stats.courses}</div>
              <div className="text-sm text-text-secondary">Courses</div>
            </div>
            <div className="bg-surface border border-border-default rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-cyber-green mb-1">{stats.subscribers}</div>
              <div className="text-sm text-text-secondary">Subscribers</div>
            </div>
            <div className="bg-surface border border-border-default rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-cyber-green mb-1">{stats.products}</div>
              <div className="text-sm text-text-secondary">Products</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 mb-6 border-b border-border-default scrollbar-hide">
            <div className="flex gap-3 sm:gap-6 min-w-max pb-1">
              <button
                onClick={() => setActiveTab("profile")}
                className={`px-4 sm:px-6 py-2.5 sm:py-3 font-semibold transition-colors whitespace-nowrap text-sm sm:text-base ${
                  activeTab === "profile"
                    ? "text-cyber-green border-b-2 border-cyber-green"
                    : "text-text-secondary hover:text-custom-text"
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab("messages")}
                className={`px-4 sm:px-6 py-2.5 sm:py-3 font-semibold transition-colors whitespace-nowrap text-sm sm:text-base flex items-center gap-1.5 sm:gap-2 ${
                  activeTab === "messages"
                    ? "text-cyber-green border-b-2 border-cyber-green"
                    : "text-text-secondary hover:text-custom-text"
                }`}
              >
                <span>Recent Messages</span>
                {unreadCount > 0 && (
                  <span className="bg-cyber-green text-dark-green-950 text-xs font-bold px-2 py-0.5 rounded-full min-w-[1.5rem] text-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("connections")}
                className={`px-4 sm:px-6 py-2.5 sm:py-3 font-semibold transition-colors whitespace-nowrap text-sm sm:text-base ${
                  activeTab === "connections"
                    ? "text-cyber-green border-b-2 border-cyber-green"
                    : "text-text-secondary hover:text-custom-text"
                }`}
              >
                Connections
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === "profile" && (
            <>
              {/* Quick Links */}
              <div className="bg-surface border border-border-default rounded-lg p-6 mb-8">
                <h3 className="text-xl font-bold text-custom-text mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Link
                    href="/dashboard/blog"
                    className="p-4 border border-border-default rounded-lg hover:border-cyber-green hover:bg-surface transition-all"
                  >
                    <div className="font-semibold text-custom-text mb-1">Manage Blog Posts</div>
                    <div className="text-sm text-text-secondary">View and edit your blog posts</div>
                  </Link>
                  <Link
                    href="/courses/manage"
                    className="p-4 border border-border-default rounded-lg hover:border-cyber-green hover:bg-surface transition-all"
                  >
                    <div className="font-semibold text-custom-text mb-1">Manage Courses</div>
                    <div className="text-sm text-text-secondary">View and edit your courses</div>
                  </Link>
                  <Link
                    href="/products"
                    className="p-4 border border-border-default rounded-lg hover:border-cyber-green hover:bg-surface transition-all"
                  >
                    <div className="font-semibold text-custom-text mb-1">Manage Products</div>
                    <div className="text-sm text-text-secondary">View and edit your products</div>
                  </Link>
                  <Link
                    href={`/expert/${user?.id}`}
                    className="p-4 border border-border-default rounded-lg hover:border-cyber-green hover:bg-surface transition-all"
                  >
                    <div className="font-semibold text-custom-text mb-1">View Public Profile</div>
                    <div className="text-sm text-text-secondary">See how others see your profile</div>
                  </Link>
                </div>
              </div>
            </>
          )}

          {activeTab === "messages" && (
            <div className="bg-surface backdrop-blur-sm border border-border-default rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-custom-text">Recent Messages</h2>
                <Link
                  href="/messages"
                  className="text-cyber-green hover:text-primary-hover font-semibold hover:underline"
                >
                  View All →
                </Link>
              </div>
              {recentMessages.length > 0 ? (
                <div className="space-y-4">
                  {recentMessages.map((message) => (
                    <Link
                      key={message.id}
                      href={`/messages`}
                      className="block bg-surface border border-border-default rounded-lg p-4 hover:bg-custom-bg hover:border-cyber-green/40 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-semibold ${message.read ? "text-text-secondary" : "text-custom-text"}`}>
                              {message.from_name}
                            </span>
                            {!message.read && (
                              <span className="h-2 w-2 bg-cyber-green rounded-full"></span>
                            )}
                          </div>
                          <p className={`text-sm ${message.read ? "text-text-secondary" : "text-custom-text font-medium"}`}>
                            {message.subject}
                          </p>
                          <p className="text-xs text-text-secondary mt-1 line-clamp-1">{message.content}</p>
                        </div>
                        <span className="text-xs text-text-secondary ml-4">{formatTimeAgo(message.created_at)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-text-secondary text-center py-4">No messages yet</p>
              )}
            </div>
          )}

          {activeTab === "connections" && (
            <ConnectionsContent />
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

