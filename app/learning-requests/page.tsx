"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface LearningRequest {
  id: string;
  title: string;
  description: string;
  category: string | null;
  is_anonymous: boolean;
  is_active: boolean;
  created_at: string;
  user_id: string;
  profiles?: {
    name: string;
    avatar_url: string | null;
  };
}

export default function LearningRequestsPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<LearningRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    isAnonymous: false,
  });

  useEffect(() => {
    fetchRequests();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("learning_requests")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedRequests = (data || []).map((req: any) => ({
        ...req,
        profiles: Array.isArray(req.profiles) ? req.profiles[0] : req.profiles,
      }));

      setRequests(formattedRequests);
    } catch (err) {
      console.error("Error fetching learning requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push("/login?redirect=/learning-requests");
      return;
    }

    if (!formData.title.trim() || !formData.description.trim()) {
      alert("Please fill in title and description");
      return;
    }

    try {
      const { error } = await supabase
        .from("learning_requests")
        .insert({
          user_id: user.id,
          title: formData.title,
          description: formData.description,
          category: formData.category || null,
          is_anonymous: formData.isAnonymous,
          is_active: true,
        });

      if (error) throw error;

      alert("Learning request posted successfully!");
      setFormData({ title: "", description: "", category: "", isAnonymous: false });
      setShowCreateForm(false);
      await fetchRequests();
    } catch (err: any) {
      console.error("Error creating learning request:", err);
      console.error("Error details:", JSON.stringify(err, null, 2));
      alert(`Failed to post learning request: ${err.message || "Please try again."}`);
    }
  };

  const handleContact = (request: LearningRequest) => {
    if (!user) {
      router.push(`/login?redirect=/learning-requests`);
      return;
    }

    if (request.is_anonymous) {
      // For anonymous requests, redirect to messages with the user_id
      router.push(`/messages?user=${request.user_id}`);
    } else {
      router.push(`/expert/${request.user_id}`);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className="min-h-screen bg-custom-bg flex flex-col">
      <Navigation />
      <div className="pt-24 pb-20 flex-1 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-custom-text mb-2">Learning Requests</h1>
              <p className="text-base sm:text-lg text-custom-text/80">
                Students post what they want to learn. Experts can find and connect with them.
              </p>
            </div>
            {user ? (
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
              >
                {showCreateForm ? "Cancel" : "+ Post Request"}
              </button>
            ) : (
              <button
                onClick={() => router.push("/login?redirect=/learning-requests")}
                className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
              >
                Sign In to Post a Learning Request
              </button>
            )}
          </div>

          {showCreateForm && (
            <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-custom-text mb-4">Post a Learning Request</h2>
              <form onSubmit={handleCreateRequest} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-custom-text mb-2">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                    placeholder="e.g., Learn Python for Data Science"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-custom-text mb-2">Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={6}
                    className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                    placeholder="Describe what you want to learn, your current level, goals, etc."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-custom-text mb-2">Category (Optional)</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                    placeholder="e.g., Programming, Design, Business"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isAnonymous"
                    checked={formData.isAnonymous}
                    onChange={(e) => setFormData({ ...formData, isAnonymous: e.target.checked })}
                    className="w-4 h-4 text-cyber-green focus:ring-cyber-green rounded"
                  />
                  <label htmlFor="isAnonymous" className="ml-2 block text-sm text-custom-text">
                    Post anonymously (experts can still contact you)
                  </label>
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
                >
                  Post Request
                </button>
              </form>
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-32 bg-dark-green-800/30 rounded-lg animate-pulse"></div>
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 bg-dark-green-800/30 border border-cyber-green/30 rounded-lg">
              <p className="text-custom-text/80 text-lg mb-4">No learning requests yet.</p>
              {user && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
                >
                  Be the first to post!
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6 hover:border-cyber-green transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-custom-text">{request.title}</h3>
                        {request.category && (
                          <span className="text-xs text-cyber-green bg-dark-green-900/50 px-2 py-1 rounded-full border border-cyber-green/30">
                            {request.category}
                          </span>
                        )}
                      </div>
                      <p className="text-custom-text/80 mb-4 whitespace-pre-wrap">{request.description}</p>
                      <div className="flex items-center gap-4 text-sm text-custom-text/60">
                        {request.is_anonymous ? (
                          <span>Posted anonymously</span>
                        ) : request.profiles ? (
                          <div className="flex items-center gap-2">
                            {request.profiles.avatar_url ? (
                              <Image
                                src={request.profiles.avatar_url}
                                alt={request.profiles.name}
                                width={24}
                                height={24}
                                className="rounded-full"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-dark-green-700 flex items-center justify-center text-xs font-bold">
                                {getInitials(request.profiles.name)}
                              </div>
                            )}
                            <span>{request.profiles.name}</span>
                          </div>
                        ) : null}
                        <span>•</span>
                        <span>{new Date(request.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {user && user.id !== request.user_id && (
                      <button
                        onClick={() => handleContact(request)}
                        className="px-4 py-2 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors text-sm whitespace-nowrap"
                      >
                        Connect & Message
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

