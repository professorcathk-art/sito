"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { Navigation } from "@/components/navigation";
import { ProtectedRoute } from "@/components/protected-route";

export default function CreateCoursePage() {
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    coverImageUrl: "",
    price: "0",
    isFree: true,
  });

  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const filePath = `course-covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("blog-resources")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("blog-resources").getPublicUrl(filePath);
      setFormData({ ...formData, coverImageUrl: data.publicUrl });
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

    if (!formData.title.trim() || !formData.description.trim()) {
      alert("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const { data: course, error } = await supabase
        .from("courses")
        .insert({
          expert_id: user.id,
          title: formData.title,
          description: formData.description,
          cover_image_url: formData.coverImageUrl || null,
          price: parseFloat(formData.price) || 0,
          is_free: formData.isFree,
          published: false,
        })
        .select()
        .single();

      if (error) throw error;

      router.push(`/courses/${course.id}`);
    } catch (err: any) {
      console.error("Error creating course:", err);
      alert("Failed to create course. Please try again.");
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
            <h1 className="text-3xl font-bold text-custom-text mb-8">Create Course</h1>

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
                  placeholder="Enter course title"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-custom-text mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text placeholder-custom-text/50 focus:outline-none focus:border-cyber-green"
                  placeholder="Describe your course"
                  rows={5}
                  required
                />
              </div>

              {/* Cover Image */}
              <div>
                <label className="block text-sm font-medium text-custom-text mb-2">
                  Cover Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverImageUpload}
                  disabled={uploadingImage}
                  className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                />
                {formData.coverImageUrl && (
                  <img
                    src={formData.coverImageUrl}
                    alt="Cover"
                    className="mt-4 max-w-md rounded-lg"
                  />
                )}
              </div>

              {/* Pricing */}
              <div>
                <label className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    checked={formData.isFree}
                    onChange={(e) => setFormData({ ...formData, isFree: e.target.checked, price: e.target.checked ? "0" : formData.price })}
                    className="w-4 h-4 text-cyber-green bg-dark-green-900 border-cyber-green/30 rounded focus:ring-cyber-green"
                  />
                  <span className="text-sm text-custom-text">Free Course</span>
                </label>
                {!formData.isFree && (
                  <div>
                    <label className="block text-sm font-medium text-custom-text mb-2">
                      Price (USD) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text placeholder-custom-text/50 focus:outline-none focus:border-cyber-green"
                      placeholder="0.00"
                      required={!formData.isFree}
                    />
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Creating..." : "Create Course & Add Lessons"}
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

