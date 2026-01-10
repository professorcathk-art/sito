"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";

interface Category {
  id: string;
  name: string;
}

interface Country {
  id: string;
  name: string;
  code: string;
}

export function ProfileSetupForm() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    title: "",
    categoryId: "",
    categoryName: "",
    bio: "",
    countryId: "",
    countryName: "",
    languagesSupported: [] as string[],
    website: "",
    linkedin: "",
    instagramUrl: "",
    listedOnMarketplace: false,
    avatarUrl: "",
  });
  const [languageInput, setLanguageInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState("");
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setShowCategoryDropdown(false);
      }
      if (
        countryDropdownRef.current &&
        !countryDropdownRef.current.contains(event.target as Node)
      ) {
        setShowCountryDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch categories, countries, and existing profile
  useEffect(() => {
    async function fetchData() {
      if (!user) {
        setLoadingProfile(false);
        return;
      }

      try {
        const [categoriesRes, countriesRes, profileRes] = await Promise.all([
          supabase.from("categories").select("id, name").order("name"),
          supabase.from("countries").select("id, name, code").order("name"),
          supabase
            .from("profiles")
            .select(`
              name,
              title,
              tagline,
              bio,
              website,
              linkedin,
              listed_on_marketplace,
              category_id,
              country_id,
              language_supported,
              avatar_url,
              categories!profiles_category_id_fkey(name),
              countries(name)
            `)
            .eq("id", user.id)
            .single(),
        ]);

        if (categoriesRes.data) setCategories(categoriesRes.data);
        if (countriesRes.data) setCountries(countriesRes.data);

        // Load existing profile data if it exists
        if (profileRes.data) {
          const profile = profileRes.data;
          setFormData({
            name: profile.name || "",
            title: profile.tagline || profile.title || "",
            categoryId: profile.category_id || "",
            categoryName: (profile.categories as any)?.name || "",
            bio: profile.bio || "",
            countryId: profile.country_id || "",
            countryName: (profile.countries as any)?.name || "",
            languagesSupported: (profile.language_supported as string[]) || [],
            website: profile.website || "",
            linkedin: profile.linkedin || "",
            instagramUrl: (profile as any).instagram_url || "",
            listedOnMarketplace: profile.listed_on_marketplace || false,
            avatarUrl: profile.avatar_url || "",
          });
          if (profile.category_id && (profile.categories as any)?.name) {
            setCategorySearch((profile.categories as any).name);
          }
          if (profile.country_id && (profile.countries as any)?.name) {
            setCountrySearch((profile.countries as any).name);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoadingProfile(false);
      }
    }
    fetchData();
  }, [supabase, user]);

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const filteredCountries = countries.filter((country) =>
    country.name.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  const handleCategorySelect = (category: Category) => {
    setFormData({
      ...formData,
      categoryId: category.id,
      categoryName: category.name,
    });
    setCategorySearch(category.name);
    setShowCategoryDropdown(false);
  };

  const handleCreateNewCategory = async () => {
    if (!categorySearch.trim()) {
      setError("Please enter a category name");
      return;
    }

    // Check if category already exists
    const existingCategory = categories.find(
      (cat) => cat.name.toLowerCase() === categorySearch.trim().toLowerCase()
    );
    if (existingCategory) {
      handleCategorySelect(existingCategory);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("categories")
        .insert({ name: categorySearch.trim() })
        .select()
        .single();

      if (error) throw error;

      // Add to local categories list
      setCategories([...categories, data]);
      handleCategorySelect(data);
    } catch (err: any) {
      setError(err.message || "Failed to create category. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCountrySelect = (country: Country) => {
    setFormData({
      ...formData,
      countryId: country.id,
      countryName: country.name,
    });
    setCountrySearch(country.name);
    setShowCountryDropdown(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      return;
    }

    setUploadingAvatar(true);
    setError("");

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName; // Upload directly to bucket root, not in a subfolder

      // Delete old avatar if exists
      if (formData.avatarUrl) {
        const oldFileName = formData.avatarUrl.split("/").pop()?.split("?")[0];
        if (oldFileName) {
          await supabase.storage.from("avatars").remove([oldFileName]);
        }
      }

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      
      setFormData({
        ...formData,
        avatarUrl: data.publicUrl,
      });
    } catch (err: any) {
      setError(err.message || "Failed to upload image. Please try again.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!user) {
      setError("You must be logged in to create a profile");
      setLoading(false);
      return;
    }

    // Validate required fields for expert profile
    if (!formData.name || formData.name.trim().length === 0) {
      setError("Display name is required");
      setLoading(false);
      return;
    }

    if (!formData.title || formData.title.trim().length === 0) {
      setError("Tagline is required");
      setLoading(false);
      return;
    }

    // If user is trying to become an expert, require category and bio
    // Check if they already have category_id or bio (from onboarding)
    // If not, require them to fill it
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("category_id, bio")
      .eq("id", user.id)
      .single();

    const hasCategory = formData.categoryId || existingProfile?.category_id;
    const hasBio = (formData.bio && formData.bio.trim().length > 0) || (existingProfile?.bio && existingProfile.bio.trim().length > 0);

    // Validate location (required)
    if (!formData.countryId) {
      setError("Location is required");
      setLoading(false);
      return;
    }

    // Validate languages supported (required)
    if (!formData.languagesSupported || formData.languagesSupported.length === 0) {
      setError("At least one language must be specified");
      setLoading(false);
      return;
    }

    // If user is filling category or bio, they're trying to become an expert
    // Require both category and bio for expert profile
    if (formData.categoryId || formData.bio || existingProfile?.category_id || existingProfile?.bio) {
      if (!hasCategory) {
        setError("Category is required to become an expert");
        setLoading(false);
        return;
      }
      if (!hasBio) {
        setError("Bio is required to become an expert (at least 10 characters)");
        setLoading(false);
        return;
      }
      if (formData.bio && formData.bio.trim().length < 10) {
        setError("Bio must be at least 10 characters");
        setLoading(false);
        return;
      }
    }

    try {
      // Update or insert profile
      // Use upsert with onConflict to handle both insert and update cases
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          name: formData.name,
          tagline: formData.title,
          category_id: formData.categoryId || existingProfile?.category_id || null,
          country_id: formData.countryId,
          language_supported: formData.languagesSupported,
          bio: formData.bio || existingProfile?.bio || null,
          website: formData.website || null,
          linkedin: formData.linkedin || null,
          instagram_url: formData.instagramUrl || null,
          avatar_url: formData.avatarUrl || null,
          listed_on_marketplace: formData.listedOnMarketplace,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });

      if (profileError) {
        throw profileError;
      }

      // Redirect to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-10 bg-dark-green-800/50 rounded"></div>
        <div className="h-10 bg-dark-green-800/50 rounded"></div>
        <div className="h-32 bg-dark-green-800/50 rounded"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-900/30 border border-red-500/50 text-red-200 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-custom-text mb-2">
          Display Name *
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          required
          className="w-full px-4 py-3 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg focus:ring-2 focus:ring-cyber-green focus:border-cyber-green text-custom-text placeholder-custom-text/50"
          placeholder="Your display name"
        />
      </div>

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-custom-text mb-2">
          Tagline * <span className="text-xs text-custom-text/60">({formData.title.length}/100 characters)</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          value={formData.title}
          onChange={handleChange}
          required
          maxLength={100}
          className="w-full px-4 py-3 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg focus:ring-2 focus:ring-cyber-green focus:border-cyber-green text-custom-text placeholder-custom-text/50"
          placeholder="Add a tagline to describe yourself (e.g., Helping startups scale their tech teams)"
        />
        {formData.title.length >= 90 && (
          <p className="mt-1 text-xs text-yellow-400">Approaching character limit</p>
        )}
      </div>

      <div>
        <label htmlFor="avatar" className="block text-sm font-medium text-custom-text mb-2">
          Profile Picture
        </label>
        <div className="flex items-center gap-4">
          {formData.avatarUrl && (
            <img
              src={formData.avatarUrl}
              alt="Profile"
              className="w-20 h-20 rounded-full object-cover border-2 border-cyber-green/30"
            />
          )}
          <div className="flex-1">
            <input
              ref={fileInputRef}
              id="avatar"
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="px-4 py-2 bg-dark-green-800/50 border border-cyber-green/30 rounded-lg text-custom-text hover:bg-dark-green-800 hover:border-cyber-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {uploadingAvatar ? "Uploading..." : formData.avatarUrl ? "Change Picture" : "Upload Picture"}
            </button>
            <p className="mt-1 text-xs text-custom-text/60">Max 5MB, JPG/PNG/GIF</p>
          </div>
        </div>
      </div>

      <div className="relative" ref={categoryDropdownRef}>
        <label className="block text-sm font-medium text-custom-text mb-2">
          Category *
        </label>
        <input
          type="text"
          value={categorySearch}
          onChange={(e) => {
            setCategorySearch(e.target.value);
            setShowCategoryDropdown(true);
          }}
          onFocus={() => setShowCategoryDropdown(true)}
          placeholder="Search and select a category..."
          required={!formData.categoryId}
          className="w-full px-4 py-3 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg focus:ring-2 focus:ring-cyber-green focus:border-cyber-green text-custom-text placeholder-custom-text/50"
        />
        {showCategoryDropdown && (
          <div className="absolute z-50 w-full mt-1 bg-dark-green-800 border border-cyber-green/30 rounded-lg shadow-lg max-h-60 overflow-auto">
            {filteredCategories.length === 0 ? (
              <div className="px-4 py-3">
                <div className="text-custom-text/70 mb-2">No categories found</div>
                {categorySearch.trim() && (
                  <button
                    type="button"
                    onClick={handleCreateNewCategory}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-cyber-green/20 border border-cyber-green/50 rounded-lg text-cyber-green hover:bg-cyber-green/30 transition-colors disabled:opacity-50 text-sm font-semibold"
                  >
                    {loading ? "Creating..." : `Create "${categorySearch.trim()}"`}
                  </button>
                )}
              </div>
            ) : (
              <>
                {filteredCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategorySelect(cat)}
                    className="w-full text-left px-4 py-2 text-custom-text hover:bg-dark-green-700 hover:text-cyber-green transition-colors"
                  >
                    {cat.name}
                  </button>
                ))}
                {categorySearch.trim() && !filteredCategories.some(cat => cat.name.toLowerCase() === categorySearch.trim().toLowerCase()) && (
                  <div className="border-t border-cyber-green/20 pt-2">
                    <button
                      type="button"
                      onClick={handleCreateNewCategory}
                      disabled={loading}
                      className="w-full px-4 py-2 text-cyber-green hover:bg-dark-green-700 transition-colors disabled:opacity-50 text-sm font-semibold"
                    >
                      {loading ? "Creating..." : `+ Create "${categorySearch.trim()}"`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        {formData.categoryId && (
          <input type="hidden" name="categoryId" value={formData.categoryId} />
        )}
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-custom-text mb-2">
          Bio *
        </label>
        <textarea
          id="bio"
          name="bio"
          value={formData.bio}
          onChange={handleChange}
          required
          rows={5}
          className="w-full px-4 py-3 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg focus:ring-2 focus:ring-cyber-green focus:border-cyber-green text-custom-text placeholder-custom-text/50"
          placeholder="Tell us about your expertise and experience..."
        />
      </div>

      <div className="relative" ref={countryDropdownRef}>
        <label className="block text-sm font-medium text-custom-text mb-2">
          Location *
        </label>
        <input
          type="text"
          value={countrySearch}
          onChange={(e) => {
            setCountrySearch(e.target.value);
            setShowCountryDropdown(true);
          }}
          onFocus={() => setShowCountryDropdown(true)}
          placeholder="Search and select a country..."
          required
          className="w-full px-4 py-3 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg focus:ring-2 focus:ring-cyber-green focus:border-cyber-green text-custom-text placeholder-custom-text/50"
        />
        {showCountryDropdown && (
          <div className="absolute z-50 w-full mt-1 bg-dark-green-800 border border-cyber-green/30 rounded-lg shadow-lg max-h-60 overflow-auto">
            {filteredCountries.length === 0 ? (
              <div className="px-4 py-3 text-custom-text/70">No countries found</div>
            ) : (
              filteredCountries.map((country) => (
                <button
                  key={country.id}
                  type="button"
                  onClick={() => handleCountrySelect(country)}
                  className="w-full text-left px-4 py-2 text-custom-text hover:bg-dark-green-700 hover:text-cyber-green transition-colors"
                >
                  {country.name}
                </button>
              ))
            )}
          </div>
        )}
        {formData.countryId && (
          <input type="hidden" name="countryId" value={formData.countryId} />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-custom-text mb-2">
          Languages Supported *
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.languagesSupported.map((lang, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-3 py-1 bg-cyber-green/20 text-cyber-green rounded-full text-sm border border-cyber-green/30"
            >
              {lang}
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...formData,
                    languagesSupported: formData.languagesSupported.filter((_, i) => i !== index),
                  });
                }}
                className="hover:text-red-400 transition-colors"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={languageInput}
            onChange={(e) => setLanguageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && languageInput.trim()) {
                e.preventDefault();
                if (!formData.languagesSupported.includes(languageInput.trim())) {
                  setFormData({
                    ...formData,
                    languagesSupported: [...formData.languagesSupported, languageInput.trim()],
                  });
                  setLanguageInput("");
                }
              }
            }}
            placeholder="Enter a language and press Enter (e.g., English, Mandarin, Cantonese)"
            className="flex-1 px-4 py-3 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg focus:ring-2 focus:ring-cyber-green focus:border-cyber-green text-custom-text placeholder-custom-text/50"
          />
          <button
            type="button"
            onClick={() => {
              if (languageInput.trim() && !formData.languagesSupported.includes(languageInput.trim())) {
                setFormData({
                  ...formData,
                  languagesSupported: [...formData.languagesSupported, languageInput.trim()],
                });
                setLanguageInput("");
              }
            }}
            className="px-4 py-3 bg-cyber-green/20 border border-cyber-green/30 text-cyber-green rounded-lg hover:bg-cyber-green/30 transition-colors font-semibold"
          >
            Add
          </button>
        </div>
        <p className="mt-1 text-xs text-custom-text/60">Add at least one language you can communicate in</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-custom-text mb-2">
            Website
          </label>
          <input
            id="website"
            name="website"
            type="url"
            value={formData.website}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg focus:ring-2 focus:ring-cyber-green focus:border-cyber-green text-custom-text placeholder-custom-text/50"
            placeholder="https://yourwebsite.com"
          />
        </div>
        <div>
          <label htmlFor="linkedin" className="block text-sm font-medium text-custom-text mb-2">
            LinkedIn
          </label>
          <input
            id="linkedin"
            name="linkedin"
            type="url"
            value={formData.linkedin}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg focus:ring-2 focus:ring-cyber-green focus:border-cyber-green text-custom-text placeholder-custom-text/50"
            placeholder="https://linkedin.com/in/yourprofile"
          />
        </div>
        <div>
          <label htmlFor="instagramUrl" className="block text-sm font-medium text-custom-text mb-2">
            Instagram
          </label>
          <input
            id="instagramUrl"
            name="instagramUrl"
            type="url"
            value={formData.instagramUrl}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg focus:ring-2 focus:ring-cyber-green focus:border-cyber-green text-custom-text placeholder-custom-text/50"
            placeholder="https://instagram.com/yourprofile"
          />
        </div>
      </div>

      <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-4">
        <div className="flex items-start">
          <input
            id="listedOnMarketplace"
            name="listedOnMarketplace"
            type="checkbox"
            checked={formData.listedOnMarketplace}
            onChange={handleChange}
            className="h-4 w-4 text-cyber-green focus:ring-cyber-green border-cyber-green/30 rounded bg-dark-green-900/50 mt-1"
          />
          <label htmlFor="listedOnMarketplace" className="ml-3 text-sm text-custom-text">
            <span className="font-semibold">List my profile on the marketplace (visible to all users)</span>
            <div className="mt-2 text-xs text-custom-text/70 space-y-1">
              <p>✓ 10x more job opportunities and client connections</p>
              <p>✓ Increased visibility to potential students and clients</p>
              <p>✓ Build your professional reputation and network</p>
              <p>✓ Access to exclusive marketplace features</p>
            </div>
          </label>
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-cyber-green text-custom-text py-3 rounded-lg font-semibold hover:bg-cyber-green-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,255,136,0.3)]"
        >
          {loading ? "Saving..." : "Save Profile"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="px-6 py-3 border border-cyber-green/30 text-custom-text rounded-lg hover:bg-dark-green-800/50 transition-colors"
        >
          Skip for Now
        </button>
      </div>
    </form>
  );
}

