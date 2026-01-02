"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Navigation } from "@/components/navigation";
import { ProtectedRoute } from "@/components/protected-route";

export default function CreateBlogPostPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: "",
    featuredImageUrl: "",
    accessLevel: "public" as "public" | "subscriber" | "paid",
    notifySubscribers: true,
  });
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    url: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }>>([]);

  useEffect(() => {
    if (!user) {
      router.push("/login?redirect=/blog/create");
    }
  }, [user, router]);

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

  const handleFileUpload = (fileUrl: string, fileName: string, fileType: string, fileSize: number) => {
    setUploadedFiles([...uploadedFiles, { url: fileUrl, fileName, fileType, fileSize }]);
  };

  const calculateReadingTime = (content: string): number => {
    const text = content.replace(/<[^>]*>/g, "");
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const wordsPerMinute = 200;
    return Math.ceil(words.length / wordsPerMinute);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.title.trim() || !formData.content.trim()) {
      alert("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const readingTime = calculateReadingTime(formData.content);

      const { data: blogPost, error: blogError } = await supabase
        .from("blog_posts")
        .insert({
          expert_id: user.id,
          title: formData.title,
          description: formData.description || null,
          content: formData.content,
          featured_image_url: formData.featuredImageUrl || null,
          access_level: formData.accessLevel,
          notify_subscribers: formData.notifySubscribers,
          reading_time_minutes: readingTime,
          published_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (blogError) throw blogError;

      // Save uploaded files as resources
      if (uploadedFiles.length > 0 && blogPost) {
        const resources = uploadedFiles.map(file => ({
          blog_post_id: blogPost.id,
          file_name: file.fileName,
          file_url: file.url,
          file_type: file.fileType,
          file_size: file.fileSize,
        }));

        const { error: resourcesError } = await supabase
          .from("blog_post_resources")
          .insert(resources);

        if (resourcesError) {
          console.error("Error saving resources:", resourcesError);
        }
      }

      // TODO: Send notifications to subscribers if notifySubscribers is true

      router.push(`/blog/${blogPost.id}`);
    } catch (err: any) {
      console.error("Error creating blog post:", err);
      alert("Failed to create blog post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-custom-bg">
        <Navigation />
        <div className="pt-16 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-custom-text mb-8">Create Blog Post</h1>

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
                  <img
                    src={formData.featuredImageUrl}
                    alt="Featured"
                    className="mt-4 max-w-md rounded-lg"
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
                  onChange={(content) => setFormData({ ...formData, content })}
                  onFileUpload={handleFileUpload}
                />
              </div>

              {/* Access Level */}
              <div>
                <label className="block text-sm font-medium text-custom-text mb-2">
                  Access Level
                </label>
                <select
                  value={formData.accessLevel}
                  onChange={(e) => setFormData({ ...formData, accessLevel: e.target.value as any })}
                  className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text focus:outline-none focus:border-cyber-green"
                >
                  <option value="public">Public</option>
                  <option value="subscriber">Subscriber-only</option>
                  <option value="paid">Paid-only</option>
                </select>
              </div>

              {/* Notify Subscribers */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="notifySubscribers"
                  checked={formData.notifySubscribers}
                  onChange={(e) => setFormData({ ...formData, notifySubscribers: e.target.checked })}
                  className="w-4 h-4 text-cyber-green bg-dark-green-900 border-cyber-green/30 rounded focus:ring-cyber-green"
                />
                <label htmlFor="notifySubscribers" className="text-sm text-custom-text">
                  Notify subscribers when published
                </label>
              </div>

              {/* Submit */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Publishing..." : "Publish Post"}
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
      </div>
    </ProtectedRoute>
  );
}

