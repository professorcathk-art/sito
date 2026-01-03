"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { RichTextEditor } from "@/components/rich-text-editor";
import Image from "next/image";

export default function EditBlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const blogPostId = params.id as string;
  const supabase = createClient();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: "",
    featuredImageUrl: "",
    accessLevel: "public" as "public" | "subscriber-only" | "paid-only",
    notifySubscribers: false,
  });

  useEffect(() => {
    if (user && blogPostId) {
      fetchBlogPost();
    }
  }, [user, blogPostId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchBlogPost = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("id", blogPostId)
        .eq("expert_id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          title: data.title || "",
          description: data.description || "",
          content: data.content || "",
          featuredImageUrl: data.featured_image_url || "",
          accessLevel: data.access_level || "public",
          notifySubscribers: false,
        });
      }
    } catch (err: any) {
      console.error("Error fetching blog post:", err);
      alert("Failed to load blog post. You may not have permission to edit this post.");
      router.push("/dashboard/blog");
    } finally {
      setLoading(false);
    }
  };

  const handleFeaturedImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB");
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `blog-featured/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("blog-resources")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("blog-resources").getPublicUrl(filePath);
      setFormData({ ...formData, featuredImageUrl: data.publicUrl });
    } catch (err: any) {
      console.error("Error uploading image:", err);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.title.trim() || !formData.content.trim()) {
      alert("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      // Calculate reading time (rough estimate: 200 words per minute)
      const wordCount = formData.content.split(/\s+/).length;
      const readingTime = Math.max(1, Math.ceil(wordCount / 200));

      const { error } = await supabase
        .from("blog_posts")
        .update({
          title: formData.title,
          description: formData.description || null,
          content: formData.content,
          featured_image_url: formData.featuredImageUrl || null,
          access_level: formData.accessLevel,
          reading_time_minutes: readingTime,
          updated_at: new Date().toISOString(),
        })
        .eq("id", blogPostId)
        .eq("expert_id", user.id);

      if (error) throw error;

      alert("Blog post updated successfully!");
      router.push(`/blog/${blogPostId}`);
    } catch (err: any) {
      console.error("Error updating blog post:", err);
      alert("Failed to update blog post. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-custom-text">Loading blog post...</div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-custom-text mb-8">Edit Blog Post</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-custom-text mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text placeholder-custom-text/50 focus:outline-none focus:border-cyber-green"
                  placeholder="Enter blog post title"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-custom-text mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text placeholder-custom-text/50 focus:outline-none focus:border-cyber-green"
                  placeholder="Brief description of your post"
                  rows={3}
                />
              </div>

              {/* Featured Image */}
              <div>
                <label className="block text-sm font-medium text-custom-text mb-2">
                  Featured Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFeaturedImageUpload}
                  disabled={uploadingImage}
                  className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                />
                {formData.featuredImageUrl && (
                  <Image
                    src={formData.featuredImageUrl}
                    alt="Featured"
                    width={300}
                    height={200}
                    className="mt-4 max-w-md rounded-lg object-cover"
                  />
                )}
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-custom-text mb-2">
                  Content *
                </label>
                <RichTextEditor
                  content={formData.content}
                  onChange={(newContent) => setFormData({ ...formData, content: newContent })}
                  placeholder="Write your blog post content..."
                />
              </div>

              {/* Access Level */}
              <div>
                <label className="block text-sm font-medium text-custom-text mb-2">
                  Access Level
                </label>
                <select
                  value={formData.accessLevel}
                  onChange={(e) => setFormData({ ...formData, accessLevel: e.target.value as "public" | "subscriber-only" | "paid-only" })}
                  className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text focus:outline-none focus:border-cyber-green"
                >
                  <option value="public">Public</option>
                  <option value="subscriber-only">Subscriber-only</option>
                  <option value="paid-only">Paid-only</option>
                </select>
              </div>

              {/* Submit */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : "Update Blog Post"}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-3 border border-cyber-green/30 text-custom-text font-semibold rounded-lg hover:bg-dark-green-800/50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

