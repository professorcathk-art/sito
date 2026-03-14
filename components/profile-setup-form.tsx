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
  const [languageSearch, setLanguageSearch] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    title: "",
    categoryId: "",
    categoryName: "",
    bio: "",
    countryId: "",
    countryName: "",
    languagesSupported: [] as string[],
    phoneNumber: "",
    website: "",
    linkedin: "",
    instagramUrl: "",
    listedOnMarketplace: false,
    avatarUrl: "",
    customSlug: "",
  });
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugError, setSlugError] = useState("");
  const [existingProfile, setExistingProfile] = useState<{ category_id?: string; bio?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState("");
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Major languages list
  const majorLanguages = [
    'English', 'Mandarin Chinese', 'Spanish', 'Hindi', 'Arabic', 'Portuguese', 'Bengali', 
    'Russian', 'Japanese', 'Punjabi', 'German', 'Javanese', 'Wu Chinese', 'Malay', 
    'Telugu', 'Vietnamese', 'Italian', 'Turkish', 'Tamil', 'Urdu', 'French', 'Korean', 
    'Marathi', 'Thai', 'Gujarati', 'Persian', 'Polish', 'Ukrainian', 'Kannada', 
    'Malayalam', 'Oriya', 'Burmese', 'Hausa', 'Cantonese', 'Romanian', 'Dutch', 
    'Greek', 'Czech', 'Swedish', 'Hungarian', 'Hebrew', 'Finnish', 'Norwegian', 
    'Danish', 'Swahili', 'Tagalog', 'Indonesian', 'Nepali', 'Khmer', 'Lao'
  ];

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
      if (
        languageDropdownRef.current &&
        !languageDropdownRef.current.contains(event.target as Node)
      ) {
        setShowLanguageDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredLanguages = majorLanguages.filter((lang) =>
    lang.toLowerCase().includes(languageSearch.toLowerCase()) &&
    !formData.languagesSupported.includes(lang)
  );

  const handleLanguageSelect = (language: string) => {
    if (!formData.languagesSupported.includes(language)) {
      setFormData({
        ...formData,
        languagesSupported: [...formData.languagesSupported, language],
      });
      setLanguageSearch("");
    }
  };

  const handleLanguageRemove = (language: string) => {
    setFormData({
      ...formData,
      languagesSupported: formData.languagesSupported.filter((lang) => lang !== language),
    });
  };

  const checkSlugAvailability = async (slug: string) => {
    if (!slug || slug.trim().length < 3) {
      setSlugAvailable(null);
      setSlugError("");
      return;
    }

    setCheckingSlug(true);
    setSlugError("");
    try {
      const response = await fetch("/api/profile/check-slug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: slug.trim() }),
      });

      const data = await response.json();
      if (response.ok) {
        setSlugAvailable(data.available);
        if (!data.available) {
          setSlugError(data.message || "This slug is already taken");
        } else {
          setSlugError("");
        }
      } else {
        setSlugAvailable(false);
        setSlugError(data.error || "Error checking slug availability");
      }
    } catch (err: any) {
      setSlugAvailable(false);
      setSlugError("Failed to check slug availability");
    } finally {
      setCheckingSlug(false);
    }
  };

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
              phone_number,
              avatar_url,
              custom_slug,
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
          setExistingProfile({
            category_id: profile.category_id || undefined,
            bio: profile.bio || undefined,
          });
          setFormData({
            name: profile.name || "",
            title: profile.tagline || profile.title || "",
            categoryId: profile.category_id || "",
            categoryName: (profile.categories as any)?.name || "",
            bio: profile.bio || "",
            countryId: profile.country_id || "",
            countryName: (profile.countries as any)?.name || "",
            languagesSupported: (profile.language_supported as string[]) || [],
            phoneNumber: (profile as any).phone_number || "",
            website: profile.website || "",
            linkedin: profile.linkedin || "",
            instagramUrl: (profile as any).instagram_url || "",
            listedOnMarketplace: profile.listed_on_marketplace || false,
            avatarUrl: profile.avatar_url || "",
            customSlug: (profile as any).custom_slug || "",
          });
          // If custom slug exists, mark it as available (user's own slug)
          if ((profile as any).custom_slug) {
            setSlugAvailable(true);
          }
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

    if (formData.title.length > 100) {
      setError("Tagline must not exceed 100 characters");
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

    // Validate phone number (required for expert profile)
    if (hasCategory && hasBio && !formData.phoneNumber.trim()) {
      setError("Phone number is required to complete your expert profile");
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
          phone_number: formData.phoneNumber || null,
          bio: formData.bio || existingProfile?.bio || null,
          website: formData.website || null,
          linkedin: formData.linkedin || null,
          instagram_url: formData.instagramUrl || null,
          avatar_url: formData.avatarUrl || null,
          listed_on_marketplace: formData.listedOnMarketplace,
          custom_slug: formData.customSlug.trim() || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });

      if (profileError) {
        throw profileError;
      }

      // Redirect to profile page
      router.push("/profile");
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
        <div className="h-10 bg-surface rounded"></div>
        <div className="h-10 bg-surface rounded"></div>
        <div className="h-32 bg-surface rounded"></div>
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
          className="w-full px-4 py-3 bg-custom-bg border border-border-default rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-custom-text placeholder-custom-text/50"
          placeholder="Your display name"
        />
      </div>

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-custom-text mb-2">
          Tagline * <span className="text-xs text-text-secondary">({formData.title.length}/100 characters)</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          value={formData.title}
          onChange={(e) => {
            // Prevent typing beyond 100 characters
            if (e.target.value.length <= 100) {
              handleChange(e);
            }
          }}
          required
          maxLength={100}
          className="w-full px-4 py-3 bg-custom-bg border border-border-default rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-custom-text placeholder-custom-text/50"
          placeholder="Add a tagline to describe yourself (e.g., Helping startups scale their tech teams)"
        />
        {formData.title.length >= 90 && formData.title.length < 100 && (
          <p className="mt-1 text-xs text-yellow-400">Approaching character limit</p>
        )}
        {formData.title.length === 100 && (
          <p className="mt-1 text-xs text-red-400">Character limit reached (100 characters)</p>
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
              className="w-20 h-20 rounded-full object-cover border-2 border-border-default"
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
              className="px-4 py-2 bg-surface border border-border-default rounded-lg text-custom-text hover:bg-dark-green-800 hover:border-cyber-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {uploadingAvatar ? "Uploading..." : formData.avatarUrl ? "Change Picture" : "Upload Picture"}
            </button>
            <p className="mt-1 text-xs text-text-secondary">Max 5MB, JPG/PNG/GIF</p>
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
          className="w-full px-4 py-3 bg-custom-bg border border-border-default rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-custom-text placeholder-custom-text/50"
        />
        {showCategoryDropdown && (
          <div className="absolute z-50 w-full mt-1 bg-dark-green-800 border border-border-default rounded-lg shadow-lg max-h-60 overflow-auto">
            {filteredCategories.length === 0 ? (
              <div className="px-4 py-3">
                <div className="text-text-secondary mb-2">No categories found</div>
                {categorySearch.trim() && (
                  <button
                    type="button"
                    onClick={handleCreateNewCategory}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-primary/20 border border-border-default rounded-lg text-cyber-green hover:bg-cyber-green/30 transition-colors disabled:opacity-50 text-sm font-semibold"
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
                  <div className="border-t border-border-default pt-2">
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
          className="w-full px-4 py-3 bg-custom-bg border border-border-default rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-custom-text placeholder-custom-text/50"
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
          className="w-full px-4 py-3 bg-custom-bg border border-border-default rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-custom-text placeholder-custom-text/50"
        />
        {showCountryDropdown && (
          <div className="absolute z-50 w-full mt-1 bg-dark-green-800 border border-border-default rounded-lg shadow-lg max-h-60 overflow-auto">
            {filteredCountries.length === 0 ? (
              <div className="px-4 py-3 text-text-secondary">No countries found</div>
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

      <div className="relative" ref={languageDropdownRef}>
        <label className="block text-sm font-medium text-custom-text mb-2">
          Languages Supported *
        </label>
        {formData.languagesSupported.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.languagesSupported.map((lang, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 bg-primary/20 text-cyber-green rounded-full text-sm border border-border-default"
              >
                {lang}
                <button
                  type="button"
                  onClick={() => handleLanguageRemove(lang)}
                  className="hover:text-red-400 transition-colors font-bold"
                  aria-label={`Remove ${lang}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <input
          type="text"
          value={languageSearch}
          onChange={(e) => {
            setLanguageSearch(e.target.value);
            setShowLanguageDropdown(true);
          }}
          onFocus={() => setShowLanguageDropdown(true)}
          placeholder="Search and select languages..."
          className="w-full px-4 py-3 bg-custom-bg border border-border-default rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-custom-text placeholder-custom-text/50"
        />
        {showLanguageDropdown && (
          <div className="absolute z-50 w-full mt-1 bg-dark-green-800 border border-border-default rounded-lg shadow-lg max-h-60 overflow-auto">
            {filteredLanguages.length === 0 ? (
              <div className="px-4 py-3 text-text-secondary">
                {languageSearch.trim() ? "No languages found" : "All languages selected"}
              </div>
            ) : (
              filteredLanguages.map((language) => (
                <button
                  key={language}
                  type="button"
                  onClick={() => handleLanguageSelect(language)}
                  className="w-full text-left px-4 py-2 text-custom-text hover:bg-dark-green-700 hover:text-cyber-green transition-colors"
                >
                  {language}
                </button>
              ))
            )}
          </div>
        )}
        <p className="mt-1 text-xs text-text-secondary">Select at least one language you can communicate in</p>
      </div>

      {/* Phone Number - Required for Expert Profile */}
      {(formData.categoryId || existingProfile?.category_id) && (
        <div>
          <label className="block text-sm font-medium text-custom-text mb-2">
            Phone Number *
          </label>
          <input
            type="tel"
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            placeholder="+1234567890 (e.g., +85212345678)"
            required
            className="w-full px-4 py-3 bg-custom-bg border border-border-default rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-custom-text placeholder-custom-text/50"
          />
          <p className="mt-1 text-xs text-text-secondary">
            Required for expert profile completion. Please include country code (e.g., +852 for Hong Kong).
          </p>
        </div>
      )}

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
            className="w-full px-4 py-3 bg-custom-bg border border-border-default rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-custom-text placeholder-custom-text/50"
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
            className="w-full px-4 py-3 bg-custom-bg border border-border-default rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-custom-text placeholder-custom-text/50"
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
            className="w-full px-4 py-3 bg-custom-bg border border-border-default rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-custom-text placeholder-custom-text/50"
            placeholder="https://instagram.com/yourprofile"
          />
        </div>
      </div>

      <div className="bg-surface border border-border-default rounded-lg p-4">
        <div className="flex items-start">
          <input
            id="listedOnMarketplace"
            name="listedOnMarketplace"
            type="checkbox"
            checked={formData.listedOnMarketplace}
            onChange={handleChange}
            className="h-4 w-4 text-cyber-green focus:ring-primary border-border-default rounded bg-custom-bg mt-1"
          />
          <label htmlFor="listedOnMarketplace" className="ml-3 text-sm text-custom-text">
            <span className="font-semibold">List my profile on the marketplace (visible to all users)</span>
            <div className="mt-2 text-xs text-text-secondary space-y-1">
              <p>✓ 10x more job opportunities and client connections</p>
              <p>✓ Increased visibility to potential students and clients</p>
              <p>✓ Build your professional reputation and network</p>
              <p>✓ Access to exclusive marketplace features</p>
            </div>
          </label>
        </div>
      </div>

      {/* Custom Shortlink */}
      {formData.listedOnMarketplace && (
        <div>
          <label htmlFor="customSlug" className="block text-sm font-medium text-custom-text mb-2">
            Custom Shortlink (Optional)
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-text-secondary">sito.club/s/</span>
                <input
                  id="customSlug"
                  name="customSlug"
                  type="text"
                  value={formData.customSlug}
                  onChange={(e) => {
                    const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                    setFormData({ ...formData, customSlug: slug });
                    if (slug.length >= 3) {
                      checkSlugAvailability(slug);
                    } else {
                      setSlugAvailable(null);
                      setSlugError("");
                    }
                  }}
                  className="flex-1 px-4 py-3 bg-custom-bg border border-border-default rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-custom-text placeholder-custom-text/50"
                  placeholder="your-custom-slug"
                  maxLength={50}
                />
              </div>
              {checkingSlug && (
                <p className="text-xs text-text-secondary mt-1">Checking availability...</p>
              )}
              {slugAvailable === true && formData.customSlug.length >= 3 && (
                <p className="text-xs text-cyber-green mt-1">✓ Available! Your profile will be accessible at sito.club/s/{formData.customSlug}</p>
              )}
              {slugAvailable === false && (
                <p className="text-xs text-red-400 mt-1">{slugError || "This slug is not available"}</p>
              )}
              {formData.customSlug && formData.customSlug.length < 3 && (
                <p className="text-xs text-yellow-400 mt-1">Slug must be at least 3 characters</p>
              )}
              {formData.customSlug && formData.customSlug.length >= 3 && slugAvailable !== false && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 bg-custom-bg border border-border-default rounded-lg text-sm text-custom-text break-all">
                    {typeof window !== "undefined" ? `${window.location.origin}/s/${formData.customSlug}` : `sito.club/s/${formData.customSlug}`}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const shortlink = typeof window !== "undefined" 
                        ? `${window.location.origin}/s/${formData.customSlug}`
                        : `sito.club/s/${formData.customSlug}`;
                      try {
                        await navigator.clipboard.writeText(shortlink);
                        alert("Shortlink copied to clipboard!");
                      } catch (err) {
                        // Fallback for older browsers
                        const textArea = document.createElement("textarea");
                        textArea.value = shortlink;
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand("copy");
                        document.body.removeChild(textArea);
                        alert("Shortlink copied to clipboard!");
                      }
                    }}
                    className="px-4 py-2 bg-cyber-green text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors text-sm whitespace-nowrap"
                  >
                    📋 Copy
                  </button>
                </div>
              )}
              <p className="text-xs text-text-secondary mt-1">
                Create a custom shortlink for your profile (e.g., sito.club/s/john-doe). Only lowercase letters, numbers, and hyphens allowed.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-cyber-green text-custom-text py-3 rounded-lg font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/20"
        >
          {loading ? "Saving..." : "Save Profile"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="px-6 py-3 border border-border-default text-custom-text rounded-lg hover:bg-surface transition-colors"
        >
          Skip for Now
        </button>
      </div>
    </form>
  );
}

