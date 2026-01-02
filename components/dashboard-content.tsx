"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";

interface Message {
  id: string;
  from_id: string;
  from_name: string;
  subject: string;
  content: string;
  read: boolean;
  created_at: string;
}

export function DashboardContent() {
  const { user } = useAuth();
  const supabase = createClient();
  const [hasProfile, setHasProfile] = useState(false);
  const [isListed, setIsListed] = useState(false);
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) {
        setLoading(false);
        return;
      }

      // Update profile name from Google OAuth if available
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const googleName = authUser.user_metadata?.full_name || 
                            authUser.user_metadata?.name || 
                            authUser.user_metadata?.display_name;
          
          if (googleName) {
            // Check if profile exists and name is missing (only set Google name if user hasn't set one)
            const { data: profile } = await supabase
              .from("profiles")
              .select("name")
              .eq("id", user.id)
              .single();
            
            // Only update if name is null, empty, or undefined - never overwrite user-set names
            if (profile && (!profile.name || profile.name.trim() === "")) {
              await supabase
                .from("profiles")
                .update({ name: googleName })
                .eq("id", user.id);
            }
          }
        }
      } catch (error) {
        console.error("Error updating profile name from Google:", error);
      }

      try {
        // Fetch profile status
        const { data: profile } = await supabase
          .from("profiles")
          .select("listed_on_marketplace")
          .eq("id", user.id)
          .single();

        if (profile) {
          setHasProfile(true);
          setIsListed(profile.listed_on_marketplace || false);
        }

        // Fetch recent messages (last 5)
        const { data: messagesData, error: messagesError } = await supabase
          .from("messages")
          .select("id, from_id, subject, content, read, created_at")
          .eq("to_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);

        if (messagesError) {
          console.error("Error fetching messages:", messagesError);
        } else if (messagesData && messagesData.length > 0) {
          // Fetch profile names for message senders
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
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [user, supabase]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-10 bg-dark-green-800/50 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-dark-green-800/30 border border-cyber-green/30 rounded-xl p-6 h-32"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

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

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-4xl font-bold text-custom-text mb-8">Dashboard</h1>

      {!hasProfile ? (
        <div className="bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-custom-text mb-4">Complete Your Profile</h2>
          <p className="text-custom-text/80 mb-6">
            Set up your expert profile to start connecting with others and be discovered on the
            marketplace.
          </p>
          <Link
            href="/profile/setup"
            className="inline-block bg-cyber-green text-custom-text px-6 py-3 rounded-lg font-semibold hover:bg-cyber-green-light transition-colors shadow-[0_0_15px_rgba(0,255,136,0.3)]"
          >
            Set Up Profile
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 rounded-xl p-6">
            <h3 className="text-xl font-bold text-custom-text mb-2">Profile Status</h3>
            <p className="text-custom-text/80 mb-4">
              {isListed ? "Your profile is listed on the marketplace" : "Your profile is private"}
            </p>
            <Link
              href="/profile/setup"
              className="text-cyber-green font-semibold hover:text-cyber-green-light hover:underline"
            >
              Edit Profile →
            </Link>
          </div>

          <div className="bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold text-custom-text">Messages</h3>
              {unreadCount > 0 && (
                <span className="bg-cyber-green text-dark-green-950 text-xs font-bold px-2 py-1 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <p className="text-custom-text/80 mb-4">View and respond to messages</p>
            <Link href="/messages" className="text-cyber-green font-semibold hover:text-cyber-green-light hover:underline">
              Open Messages →
            </Link>
          </div>

          <div className="bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 rounded-xl p-6">
            <h3 className="text-xl font-bold text-custom-text mb-2">Connections</h3>
            <p className="text-custom-text/80 mb-4">Manage your connections</p>
            <Link href="/connections" className="text-cyber-green font-semibold hover:text-cyber-green-light hover:underline">
              View Connections →
            </Link>
          </div>
        </div>
      )}

      {/* Recent Messages Section */}
      {hasProfile && (
        <div className="bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-custom-text">Recent Messages</h2>
            <Link
              href="/messages"
              className="text-cyber-green hover:text-cyber-green-light font-semibold hover:underline"
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
                  className="block bg-dark-green-900/30 border border-cyber-green/20 rounded-lg p-4 hover:bg-dark-green-900/50 hover:border-cyber-green/40 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-semibold ${message.read ? "text-custom-text/80" : "text-custom-text"}`}>
                          {message.from_name}
                        </span>
                        {!message.read && (
                          <span className="h-2 w-2 bg-cyber-green rounded-full"></span>
                        )}
                      </div>
                      <p className={`text-sm ${message.read ? "text-custom-text/70" : "text-custom-text font-medium"}`}>
                        {message.subject}
                      </p>
                      <p className="text-xs text-custom-text/60 mt-1 line-clamp-1">{message.content}</p>
                    </div>
                    <span className="text-xs text-custom-text/60 ml-4">{formatTimeAgo(message.created_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-custom-text/70 text-center py-4">No messages yet</p>
          )}
        </div>
      )}

      <div className="bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-custom-text mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/directory"
            className="p-6 border-2 border-cyber-green/30 rounded-lg hover:border-cyber-green hover:bg-dark-green-900/30 transition-all"
          >
            <h3 className="text-lg font-semibold text-custom-text mb-2">Browse Experts</h3>
            <p className="text-custom-text/80">Explore the directory of industry experts</p>
          </Link>
          <Link
            href="/profile/setup"
            className="p-6 border-2 border-cyber-green/30 rounded-lg hover:border-cyber-green hover:bg-dark-green-900/30 transition-all"
          >
            <h3 className="text-lg font-semibold text-custom-text mb-2">Edit Profile</h3>
            <p className="text-custom-text/80">Update your expert profile information</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

