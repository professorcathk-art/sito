"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StorefrontPreview } from "@/components/storefront-preview";
import { UpgradeModal } from "@/components/upgrade-modal";
import type { StorefrontBlock } from "@/types/storefront";

const INPUT_CLASS =
  "w-full px-4 py-3 bg-slate-950 border border-slate-700 text-slate-100 rounded-md placeholder-slate-500 focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] outline-none transition-colors";

interface Category {
  id: string;
  name: string;
}

interface Country {
  id: string;
  name: string;
  code: string;
}

const BLOCK_TYPES: { id: StorefrontBlock["type"]; name: string }[] = [
  { id: "header", name: "Header" },
  { id: "links", name: "Links" },
  { id: "products", name: "Products" },
  { id: "image_text", name: "Image + Text" },
  { id: "faq", name: "FAQ" },
  { id: "testimonials", name: "Testimonials" },
];

const DEFAULT_BLOCK_DATA: Record<StorefrontBlock["type"], Record<string, unknown>> = {
  header: { name: "", tagline: "", bio: "", avatarUrl: "" },
  links: { items: [{ title: "", url: "", icon: "", order: 0 }] },
  products: { showProducts: true },
  image_text: { imageUrl: "", title: "", text: "", alignment: "left" },
  faq: { items: [{ question: "", answer: "" }] },
  testimonials: { items: [{ name: "", quote: "", avatarUrl: "" }] },
};

export function UnifiedStorefrontBuilder() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<"profile" | "design" | "blocks">("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Profile data
  const [categories, setCategories] = useState<Category[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [languageSearch, setLanguageSearch] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [profileData, setProfileData] = useState({
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Design settings
  const [isPro, setIsPro] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [designSettings, setDesignSettings] = useState<{
    themePreset: string;
    customBrandColor?: string;
    buttonStyle: string;
  }>({
    themePreset: "default",
    customBrandColor: undefined,
    buttonStyle: "rounded-md",
  });

  // Storefront blocks
  const [storefrontBlocks, setStorefrontBlocks] = useState<StorefrontBlock[]>([]);
  const [showAddBlockModal, setShowAddBlockModal] = useState(false);
  const [editingBlock, setEditingBlock] = useState<StorefrontBlock | null>(null);

  // Products for preview
  const [products, setProducts] = useState<Array<{ id: string; name: string; price: number; pricing_type: string }>>([]);

  const majorLanguages = [
    "English", "Mandarin Chinese", "Spanish", "Hindi", "Arabic", "Portuguese", "Bengali",
    "Russian", "Japanese", "Punjabi", "German", "Javanese", "Wu Chinese", "Malay",
    "Telugu", "Vietnamese", "Italian", "Turkish", "Tamil", "Urdu", "French", "Korean",
    "Marathi", "Thai", "Gujarati", "Persian", "Polish", "Ukrainian", "Kannada",
    "Malayalam", "Oriya", "Burmese", "Hausa", "Cantonese", "Romanian", "Dutch",
    "Greek", "Czech", "Swedish", "Hungarian", "Hebrew", "Finnish", "Norwegian",
    "Danish", "Swahili", "Tagalog", "Indonesian", "Nepali", "Khmer", "Lao",
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) setShowCategoryDropdown(false);
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) setShowCountryDropdown(false);
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) setShowLanguageDropdown(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const [profileRes, categoriesRes, countriesRes, productsRes] = await Promise.all([
          supabase
            .from("profiles")
            .select(`
              name, tagline, bio, website, linkedin, instagram_url, listed_on_marketplace,
              category_id, country_id, language_supported, phone_number, avatar_url, custom_slug,
              is_pro_store, storefront_theme_preset, storefront_custom_brand_color, storefront_button_style,
              storefront_blocks,
              categories!profiles_category_id_fkey(name),
              countries(name)
            `)
            .eq("id", user.id)
            .single(),
          supabase.from("categories").select("id, name").order("name"),
          supabase.from("countries").select("id, name, code").order("name"),
          supabase.from("products").select("id, name, price, pricing_type").eq("expert_id", user.id).limit(10),
        ]);

        if (profileRes.data) {
          const p = profileRes.data as Record<string, unknown>;
          const cat = p.categories as { name: string } | { name: string }[] | undefined;
          const country = p.countries as { name: string } | { name: string }[] | undefined;
          const categoryName = Array.isArray(cat) ? cat[0]?.name : cat?.name;
          const countryName = Array.isArray(country) ? country[0]?.name : country?.name;
          setExistingProfile({ category_id: p.category_id as string | undefined, bio: p.bio as string | undefined });
          setProfileData({
            name: (p.name as string) || "",
            title: (p.tagline as string) || "",
            categoryId: (p.category_id as string) || "",
            categoryName: categoryName || "",
            bio: (p.bio as string) || "",
            countryId: (p.country_id as string) || "",
            countryName: countryName || "",
            languagesSupported: (p.language_supported as string[]) || [],
            phoneNumber: (p.phone_number as string) || "",
            website: (p.website as string) || "",
            linkedin: (p.linkedin as string) || "",
            instagramUrl: (p.instagram_url as string) || "",
            listedOnMarketplace: (p.listed_on_marketplace as boolean) || false,
            avatarUrl: (p.avatar_url as string) || "",
            customSlug: (p.custom_slug as string) || "",
          });
          if (p.category_id) setCategorySearch(categoryName || "");
          if (p.country_id) setCountrySearch(countryName || "");
          if (p.custom_slug) setSlugAvailable(true);

          setIsPro((p.is_pro_store as boolean) || false);
          setDesignSettings({
            themePreset: (p.storefront_theme_preset as string) || "default",
            customBrandColor: (p.storefront_custom_brand_color as string) || undefined,
            buttonStyle: (p.storefront_button_style as string) || "rounded-md",
          });
          setStorefrontBlocks(((p.storefront_blocks as StorefrontBlock[]) || []).sort((a, b) => a.order - b.order));
        }

        if (categoriesRes.data) setCategories(categoriesRes.data);
        if (countriesRes.data) setCountries(countriesRes.data);
        if (productsRes.data) setProducts(productsRes.data);
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user, supabase]);

  const filteredCategories = categories.filter((c) => c.name.toLowerCase().includes(categorySearch.toLowerCase()));
  const filteredCountries = countries.filter((c) => c.name.toLowerCase().includes(countrySearch.toLowerCase()));
  const filteredLanguages = majorLanguages.filter(
    (l) => l.toLowerCase().includes(languageSearch.toLowerCase()) && !profileData.languagesSupported.includes(l)
  );

  const handleProfileChange = (field: string, value: string | string[] | boolean) => {
    setProfileData({ ...profileData, [field]: value });
  };

  const handleCategorySelect = (cat: Category) => {
    setProfileData({ ...profileData, categoryId: cat.id, categoryName: cat.name });
    setCategorySearch(cat.name);
    setShowCategoryDropdown(false);
  };

  const handleCountrySelect = (country: Country) => {
    setProfileData({ ...profileData, countryId: country.id, countryName: country.name });
    setCountrySearch(country.name);
    setShowCountryDropdown(false);
  };

  const handleLanguageSelect = (lang: string) => {
    if (!profileData.languagesSupported.includes(lang)) {
      setProfileData({ ...profileData, languagesSupported: [...profileData.languagesSupported, lang] });
      setLanguageSearch("");
    }
  };

  const handleLanguageRemove = (lang: string) => {
    setProfileData({ ...profileData, languagesSupported: profileData.languagesSupported.filter((l) => l !== lang) });
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
      const res = await fetch("/api/profile/check-slug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: slug.trim() }),
      });
      const data = await res.json();
      setSlugAvailable(data.available ?? false);
      if (!data.available) setSlugError(data.message || data.error || "Slug taken");
    } catch {
      setSlugAvailable(false);
      setSlugError("Failed to check");
    } finally {
      setCheckingSlug(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!categorySearch.trim()) return;
    const existing = categories.find((c) => c.name.toLowerCase() === categorySearch.trim().toLowerCase());
    if (existing) {
      handleCategorySelect(existing);
      return;
    }
    try {
      const { data, error } = await supabase.from("categories").insert({ name: categorySearch.trim() }).select().single();
      if (error) throw error;
      setCategories((prev) => [...prev, data]);
      handleCategorySelect(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create category");
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB");
      return;
    }
    setUploadingAvatar(true);
    setError("");
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}-${Date.now()}.${ext}`;
      if (profileData.avatarUrl) {
        const old = profileData.avatarUrl.split("/").pop()?.split("?")[0];
        if (old) await supabase.storage.from("avatars").remove([old]);
      }
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { cacheControl: "3600", upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setProfileData({ ...profileData, avatarUrl: data.publicUrl });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleThemeSelect = (theme: string) => {
    if (theme === "midnight-glass" && !isPro) {
      setShowUpgradeModal(true);
      return;
    }
    setDesignSettings({ ...designSettings, themePreset: theme });
  };

  const handleAddBlock = (type: StorefrontBlock["type"]) => {
    const maxOrder = storefrontBlocks.length ? Math.max(...storefrontBlocks.map((b) => b.order)) : -1;
    const block: StorefrontBlock = {
      id: crypto.randomUUID(),
      type,
      order: maxOrder + 1,
      data: { ...DEFAULT_BLOCK_DATA[type] },
    };
    setStorefrontBlocks((prev) => [...prev, block].sort((a, b) => a.order - b.order));
    setShowAddBlockModal(false);
    setEditingBlock(block);
  };

  const handleUpdateBlock = (id: string, data: Record<string, unknown>) => {
    setStorefrontBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, data } : b))
    );
    setEditingBlock((prev) => (prev?.id === id ? { ...prev, data } : prev));
  };

  const handleRemoveBlock = (id: string) => {
    setStorefrontBlocks((prev) => prev.filter((b) => b.id !== id).map((b, i) => ({ ...b, order: i })));
    if (editingBlock?.id === id) setEditingBlock(null);
  };

  const handleMoveBlock = (id: string, direction: "up" | "down") => {
    const idx = storefrontBlocks.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= storefrontBlocks.length) return;
    const reordered = [...storefrontBlocks];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    setStorefrontBlocks(reordered.map((b, i) => ({ ...b, order: i })));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          name: profileData.name,
          tagline: profileData.title,
          category_id: profileData.categoryId || existingProfile?.category_id || null,
          country_id: profileData.countryId,
          language_supported: profileData.languagesSupported,
          phone_number: profileData.phoneNumber || null,
          bio: profileData.bio || existingProfile?.bio || null,
          website: profileData.website || null,
          linkedin: profileData.linkedin || null,
          instagram_url: profileData.instagramUrl || null,
          avatar_url: profileData.avatarUrl || null,
          listed_on_marketplace: profileData.listedOnMarketplace,
          custom_slug: profileData.customSlug.trim() || null,
          storefront_theme_preset: designSettings.themePreset,
          storefront_custom_brand_color: designSettings.customBrandColor || null,
          storefront_button_style: designSettings.buttonStyle,
          storefront_blocks: storefrontBlocks,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });

      if (profileError) throw profileError;
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const customLinks = storefrontBlocks
    .filter((b) => b.type === "links")
    .flatMap((b) => ((b.data.items as Array<{ title: string; url: string; icon?: string; order: number }>) || []))
    .map((item, i) => ({ ...item, order: item.order ?? i }));

  const showProducts = storefrontBlocks.some((b) => b.type === "products")
    ? (storefrontBlocks.find((b) => b.type === "products")?.data.showProducts as boolean) !== false
    : true;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-800 rounded w-1/3" />
            <div className="h-64 bg-slate-800 rounded" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div
        className="p-4 sm:p-6 lg:p-8"
        style={
          designSettings.customBrandColor
            ? { ["--brand" as string]: designSettings.customBrandColor, ["--brand-color" as string]: designSettings.customBrandColor }
            : undefined
        }
      >
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-50 mb-2">Storefront Builder</h1>
            <p className="text-slate-400">
              Edit your profile and customize your storefront.{" "}
              {profileData.customSlug && (
                <span>
                  Preview:{" "}
                  <a href={`/s/${profileData.customSlug}`} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                    sito.club/s/{profileData.customSlug}
                  </a>
                </span>
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left - Editor Controls (2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex gap-2 border-b border-slate-700 pb-2">
                {(["profile", "design", "blocks"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === tab ? "bg-slate-800 text-slate-50" : "text-slate-400 hover:text-slate-50"
                    }`}
                  >
                    {tab === "profile" ? "Profile Info" : tab === "design" ? "Design" : "Storefront Blocks"}
                  </button>
                ))}
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-h-[calc(100vh-16rem)] overflow-y-auto">
                {activeTab === "profile" && (
                  <ProfileTab
                    profileData={profileData}
                    categorySearch={categorySearch}
                    countrySearch={countrySearch}
                    languageSearch={languageSearch}
                    showCategoryDropdown={showCategoryDropdown}
                    showCountryDropdown={showCountryDropdown}
                    showLanguageDropdown={showLanguageDropdown}
                    filteredCategories={filteredCategories}
                    filteredCountries={filteredCountries}
                    filteredLanguages={filteredLanguages}
                    slugAvailable={slugAvailable}
                    slugError={slugError}
                    checkingSlug={checkingSlug}
                    uploadingAvatar={uploadingAvatar}
                    categoryDropdownRef={categoryDropdownRef}
                    countryDropdownRef={countryDropdownRef}
                    languageDropdownRef={languageDropdownRef}
                    fileInputRef={fileInputRef}
                    onProfileChange={handleProfileChange}
                    onCategorySearch={setCategorySearch}
                    onCountrySearch={setCountrySearch}
                    onLanguageSearch={setLanguageSearch}
                    onShowCategoryDropdown={setShowCategoryDropdown}
                    onShowCountryDropdown={setShowCountryDropdown}
                    onShowLanguageDropdown={setShowLanguageDropdown}
                    onCategorySelect={handleCategorySelect}
                    onCountrySelect={handleCountrySelect}
                    onLanguageSelect={handleLanguageSelect}
                    onLanguageRemove={handleLanguageRemove}
                    onCheckSlug={checkSlugAvailability}
                    onCreateCategory={handleCreateCategory}
                    onAvatarUpload={handleAvatarUpload}
                  />
                )}

                {activeTab === "design" && (
                  <DesignTab
                    designSettings={designSettings}
                    isPro={isPro}
                    onThemeSelect={handleThemeSelect}
                    onDesignChange={setDesignSettings}
                  />
                )}

                {activeTab === "blocks" && (
                  <BlocksTab
                    blocks={storefrontBlocks}
                    editingBlock={editingBlock}
                    onAddBlock={() => setShowAddBlockModal(true)}
                    onEditBlock={setEditingBlock}
                    onUpdateBlock={handleUpdateBlock}
                    onRemoveBlock={handleRemoveBlock}
                    onMoveBlock={handleMoveBlock}
                    products={products}
                  />
                )}
              </div>

              {error && (
                <div className="p-4 bg-red-900/30 border border-red-500/50 text-red-200 rounded-lg text-sm">{error}</div>
              )}

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save All Changes"}
              </button>
            </div>

            {/* Right - Sticky Mobile Preview */}
            <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
              <div style={designSettings.customBrandColor ? { ["--brand-color" as string]: designSettings.customBrandColor } : undefined}>
                <StorefrontPreview
                  themePreset={designSettings.themePreset}
                  customBrandColor={designSettings.customBrandColor}
                  buttonStyle={designSettings.buttonStyle}
                  customLinks={customLinks}
                  showProducts={showProducts}
                  showAppointments={true}
                  showBlog={true}
                  bioOverride={undefined}
                  expertName={profileData.name || "Expert"}
                  expertBio={profileData.bio || ""}
                  expertAvatar={profileData.avatarUrl}
                  verified={false}
                  products={products}
                  storefrontBlocks={storefrontBlocks.length > 0 ? storefrontBlocks : undefined}
                  profileData={profileData}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} />}

      {showAddBlockModal && (
        <AddBlockModal
          blockTypes={BLOCK_TYPES}
          onSelect={handleAddBlock}
          onClose={() => setShowAddBlockModal(false)}
        />
      )}
    </DashboardLayout>
  );
}

function ProfileTab({
  profileData,
  categorySearch,
  countrySearch,
  languageSearch,
  showCategoryDropdown,
  showCountryDropdown,
  showLanguageDropdown,
  filteredCategories,
  filteredCountries,
  filteredLanguages,
  slugAvailable,
  slugError,
  checkingSlug,
  uploadingAvatar,
  categoryDropdownRef,
  countryDropdownRef,
  languageDropdownRef,
  fileInputRef,
  onProfileChange,
  onCategorySearch,
  onCountrySearch,
  onLanguageSearch,
  onShowCategoryDropdown,
  onShowCountryDropdown,
  onShowLanguageDropdown,
  onCategorySelect,
  onCountrySelect,
  onLanguageSelect,
  onLanguageRemove,
  onCheckSlug,
  onCreateCategory,
  onAvatarUpload,
}: {
  profileData: {
    name: string;
    title: string;
    categoryId: string;
    categoryName: string;
    bio: string;
    countryId: string;
    countryName: string;
    languagesSupported: string[];
    phoneNumber: string;
    website: string;
    linkedin: string;
    instagramUrl: string;
    listedOnMarketplace: boolean;
    avatarUrl: string;
    customSlug: string;
  };
  categorySearch: string;
  countrySearch: string;
  languageSearch: string;
  showCategoryDropdown: boolean;
  showCountryDropdown: boolean;
  showLanguageDropdown: boolean;
  filteredCategories: Category[];
  filteredCountries: Country[];
  filteredLanguages: string[];
  slugAvailable: boolean | null;
  slugError: string;
  checkingSlug: boolean;
  uploadingAvatar: boolean;
  categoryDropdownRef: React.RefObject<HTMLDivElement>;
  countryDropdownRef: React.RefObject<HTMLDivElement>;
  languageDropdownRef: React.RefObject<HTMLDivElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onProfileChange: (field: string, value: string | string[] | boolean) => void;
  onCategorySearch: (v: string) => void;
  onCountrySearch: (v: string) => void;
  onLanguageSearch: (v: string) => void;
  onShowCategoryDropdown: (v: boolean) => void;
  onShowCountryDropdown: (v: boolean) => void;
  onShowLanguageDropdown: (v: boolean) => void;
  onCategorySelect: (c: Category) => void;
  onCountrySelect: (c: Country) => void;
  onLanguageSelect: (l: string) => void;
  onLanguageRemove: (l: string) => void;
  onCheckSlug: (s: string) => void;
  onCreateCategory: () => void;
  onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-200 mb-1">Display Name *</label>
        <input
          type="text"
          value={profileData.name}
          onChange={(e) => onProfileChange("name", e.target.value)}
          placeholder="Your display name"
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-200 mb-1">Tagline * ({profileData.title.length}/100)</label>
        <input
          type="text"
          value={profileData.title}
          onChange={(e) => e.target.value.length <= 100 && onProfileChange("title", e.target.value)}
          maxLength={100}
          placeholder="Short tagline"
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-200 mb-1">Profile Picture</label>
        <div className="flex items-center gap-4">
          {profileData.avatarUrl && (
            <img src={profileData.avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-slate-700" />
          )}
          <div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={onAvatarUpload} className="hidden" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-100 rounded-lg text-sm hover:bg-slate-700 disabled:opacity-50"
            >
              {uploadingAvatar ? "Uploading..." : profileData.avatarUrl ? "Change" : "Upload"}
            </button>
          </div>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-200 mb-1">Bio *</label>
        <textarea
          value={profileData.bio}
          onChange={(e) => onProfileChange("bio", e.target.value)}
          rows={4}
          placeholder="Tell us about your expertise..."
          className={`${INPUT_CLASS} resize-none`}
        />
      </div>
      <div className="relative" ref={categoryDropdownRef}>
        <label className="block text-sm font-medium text-slate-200 mb-1">Category *</label>
        <input
          type="text"
          value={categorySearch}
          onChange={(e) => { onCategorySearch(e.target.value); onShowCategoryDropdown(true); }}
          onFocus={() => onShowCategoryDropdown(true)}
          placeholder="Search category..."
          className={INPUT_CLASS}
        />
        {showCategoryDropdown && (
          <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-lg max-h-48 overflow-auto">
            {filteredCategories.length === 0 ? (
              <div className="p-3">
                {categorySearch.trim() && (
                  <button type="button" onClick={onCreateCategory} className="w-full py-2 text-indigo-400 text-sm font-medium">
                    + Create &quot;{categorySearch.trim()}&quot;
                  </button>
                )}
              </div>
            ) : (
              filteredCategories.map((c) => (
                <button key={c.id} type="button" onClick={() => onCategorySelect(c)} className="w-full text-left px-4 py-2 text-slate-100 hover:bg-slate-800">
                  {c.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>
      <div className="relative" ref={countryDropdownRef}>
        <label className="block text-sm font-medium text-slate-200 mb-1">Location *</label>
        <input
          type="text"
          value={countrySearch}
          onChange={(e) => { onCountrySearch(e.target.value); onShowCountryDropdown(true); }}
          onFocus={() => onShowCountryDropdown(true)}
          placeholder="Search country..."
          className={INPUT_CLASS}
        />
        {showCountryDropdown && (
          <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-lg max-h-48 overflow-auto">
            {filteredCountries.map((c) => (
              <button key={c.id} type="button" onClick={() => onCountrySelect(c)} className="w-full text-left px-4 py-2 text-slate-100 hover:bg-slate-800">
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="relative" ref={languageDropdownRef}>
        <label className="block text-sm font-medium text-slate-200 mb-1">Languages *</label>
        {profileData.languagesSupported.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {profileData.languagesSupported.map((l) => (
              <span key={l} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-800 text-slate-200 rounded text-sm">
                {l}
                <button type="button" onClick={() => onLanguageRemove(l)} className="hover:text-red-400">×</button>
              </span>
            ))}
          </div>
        )}
        <input
          type="text"
          value={languageSearch}
          onChange={(e) => { onLanguageSearch(e.target.value); onShowLanguageDropdown(true); }}
          onFocus={() => onShowLanguageDropdown(true)}
          placeholder="Add language..."
          className={INPUT_CLASS}
        />
        {showLanguageDropdown && filteredLanguages.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-lg max-h-48 overflow-auto">
            {filteredLanguages.map((l) => (
              <button key={l} type="button" onClick={() => onLanguageSelect(l)} className="w-full text-left px-4 py-2 text-slate-100 hover:bg-slate-800">
                {l}
              </button>
            ))}
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-200 mb-1">Phone</label>
        <input
          type="tel"
          value={profileData.phoneNumber}
          onChange={(e) => onProfileChange("phoneNumber", e.target.value)}
          placeholder="+1234567890"
          className={INPUT_CLASS}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1">Website</label>
          <input
            type="url"
            value={profileData.website}
            onChange={(e) => onProfileChange("website", e.target.value)}
            placeholder="https://..."
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1">LinkedIn</label>
          <input
            type="url"
            value={profileData.linkedin}
            onChange={(e) => onProfileChange("linkedin", e.target.value)}
            placeholder="https://linkedin.com/in/..."
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1">Instagram</label>
          <input
            type="url"
            value={profileData.instagramUrl}
            onChange={(e) => onProfileChange("instagramUrl", e.target.value)}
            placeholder="https://instagram.com/..."
            className={INPUT_CLASS}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={profileData.listedOnMarketplace}
          onChange={(e) => onProfileChange("listedOnMarketplace", e.target.checked)}
          className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-500"
        />
        <span className="text-slate-200 text-sm">List on marketplace</span>
      </label>
      {profileData.listedOnMarketplace && (
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1">Custom Slug (sito.club/s/...)</label>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm">sito.club/s/</span>
            <input
              type="text"
              value={profileData.customSlug}
              onChange={(e) => {
                const s = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                onProfileChange("customSlug", s);
                if (s.length >= 3) onCheckSlug(s);
              }}
              placeholder="your-slug"
              maxLength={50}
              className={INPUT_CLASS}
            />
          </div>
          {checkingSlug && <p className="text-xs text-slate-400 mt-1">Checking...</p>}
          {slugAvailable === true && profileData.customSlug.length >= 3 && <p className="text-xs text-green-400 mt-1">✓ Available</p>}
          {slugAvailable === false && <p className="text-xs text-red-400 mt-1">{slugError}</p>}
        </div>
      )}
    </div>
  );
}

function DesignTab({
  designSettings,
  isPro,
  onThemeSelect,
  onDesignChange,
}: {
  designSettings: { themePreset: string; customBrandColor?: string; buttonStyle: string };
  isPro: boolean;
  onThemeSelect: (theme: string) => void;
  onDesignChange: (updater: React.SetStateAction<{ themePreset: string; customBrandColor?: string; buttonStyle: string }>) => void;
}) {
  const themes = [
    { id: "default", name: "Default", pro: false },
    { id: "midnight-glass", name: "Midnight Glass", pro: true },
    { id: "minimal-light", name: "Minimal Light", pro: false },
    { id: "bold-dark", name: "Bold Dark", pro: false },
  ];
  const buttonStyles = ["rounded-full", "rounded-md", "hard-edge", "outline"];
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-50 mb-3">Theme</h3>
        <div className="grid grid-cols-2 gap-2">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => onThemeSelect(t.id)}
              className={`p-3 rounded-lg border-2 transition-all ${
                designSettings.themePreset === t.id ? "border-indigo-500 bg-indigo-500/10" : "border-slate-700 hover:border-slate-600"
              } ${t.pro && !isPro ? "opacity-60" : ""}`}
            >
              <span className="text-slate-50 font-medium">{t.name}</span>
              {t.pro && <span className="block text-xs text-slate-400">⭐ PRO</span>}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-slate-50 mb-3">Brand Color</h3>
        <div className="flex items-center gap-4">
          <input
            type="color"
            value={designSettings.customBrandColor || "#6366f1"}
            onChange={(e) => onDesignChange((s) => ({ ...s, customBrandColor: e.target.value }))}
            className="w-14 h-14 rounded-lg border border-slate-700 cursor-pointer"
          />
          <input
            type="text"
            value={designSettings.customBrandColor || ""}
            onChange={(e) => onDesignChange((s) => ({ ...s, customBrandColor: e.target.value }))}
            placeholder="#6366f1"
            className={`flex-1 ${INPUT_CLASS} py-2`}
          />
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-slate-50 mb-3">Button Style</h3>
        <div className="grid grid-cols-2 gap-2">
          {buttonStyles.map((s) => (
            <button
              key={s}
              onClick={() => onDesignChange((prev) => ({ ...prev, buttonStyle: s }))}
              className={`p-3 rounded-lg border-2 transition-all ${
                designSettings.buttonStyle === s ? "border-indigo-500 bg-indigo-500/10" : "border-slate-700 hover:border-slate-600"
              }`}
            >
              <span className="text-slate-50 text-sm capitalize">{s.replace("-", " ")}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function BlocksTab({
  blocks,
  editingBlock,
  onAddBlock,
  onEditBlock,
  onUpdateBlock,
  onRemoveBlock,
  onMoveBlock,
  products,
}: {
  blocks: StorefrontBlock[];
  editingBlock: StorefrontBlock | null;
  onAddBlock: () => void;
  onEditBlock: (b: StorefrontBlock | null) => void;
  onUpdateBlock: (id: string, data: Record<string, unknown>) => void;
  onRemoveBlock: (id: string) => void;
  onMoveBlock: (id: string, dir: "up" | "down") => void;
  products: Array<{ id: string; name: string; price: number; pricing_type: string }>;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-50">Sections</h3>
        <button
          onClick={onAddBlock}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm"
        >
          + Add Section
        </button>
      </div>
      <div className="space-y-2">
        {blocks.map((block, idx) => (
          <div key={block.id} className="p-4 bg-slate-950 border border-slate-700 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-slate-200 font-medium capitalize">{block.type.replace("_", " ")}</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => onMoveBlock(block.id, "up")}
                  disabled={idx === 0}
                  className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => onMoveBlock(block.id, "down")}
                  disabled={idx === blocks.length - 1}
                  className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button type="button" onClick={() => onEditBlock(editingBlock?.id === block.id ? null : block)} className="px-2 py-1 text-indigo-400 text-sm">
                  Edit
                </button>
                <button type="button" onClick={() => onRemoveBlock(block.id)} className="px-2 py-1 text-red-400 text-sm">
                  Remove
                </button>
              </div>
            </div>
            {editingBlock?.id === block.id && (
              <BlockEditForm block={block} onUpdate={(d) => onUpdateBlock(block.id, d)} onClose={() => onEditBlock(null)} products={products} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BlockEditForm({
  block,
  onUpdate,
  onClose,
  products,
}: {
  block: StorefrontBlock;
  onUpdate: (data: Record<string, unknown>) => void;
  onClose: () => void;
  products: Array<{ id: string; name: string; price: number; pricing_type: string }>;
}) {
  const data = block.data;
  if (block.type === "header") {
    return (
      <div className="mt-4 space-y-2">
        <input
          type="text"
          value={(data.name as string) || ""}
          onChange={(e) => onUpdate({ ...data, name: e.target.value })}
          placeholder="Name"
          className={INPUT_CLASS}
        />
        <input
          type="text"
          value={(data.tagline as string) || ""}
          onChange={(e) => onUpdate({ ...data, tagline: e.target.value })}
          placeholder="Tagline"
          className={INPUT_CLASS}
        />
        <textarea
          value={(data.bio as string) || ""}
          onChange={(e) => onUpdate({ ...data, bio: e.target.value })}
          placeholder="Bio"
          rows={3}
          className={`${INPUT_CLASS} resize-none`}
        />
        <button type="button" onClick={onClose} className="text-slate-400 text-sm">Done</button>
      </div>
    );
  }
  if (block.type === "links") {
    const items = (data.items as Array<{ title: string; url: string; icon?: string; order: number }>) || [];
    return (
      <div className="mt-4 space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={item.title}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...next[i], title: e.target.value };
                onUpdate({ ...data, items: next });
              }}
              placeholder="Title"
              className={`${INPUT_CLASS} flex-1`}
            />
            <input
              type="text"
              value={item.url}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...next[i], url: e.target.value };
                onUpdate({ ...data, items: next });
              }}
              placeholder="URL"
              className={`${INPUT_CLASS} flex-1`}
            />
            <button
              type="button"
              onClick={() => onUpdate({ ...data, items: items.filter((_, j) => j !== i) })}
              className="text-red-400 text-sm"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onUpdate({ ...data, items: [...items, { title: "", url: "", icon: "", order: items.length }] })}
          className="text-indigo-400 text-sm"
        >
          + Add link
        </button>
        <button type="button" onClick={onClose} className="block mt-2 text-slate-400 text-sm">Done</button>
      </div>
    );
  }
  if (block.type === "products") {
    return (
      <div className="mt-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={(data.showProducts as boolean) !== false}
            onChange={(e) => onUpdate({ ...data, showProducts: e.target.checked })}
            className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-500"
          />
          <span className="text-slate-200 text-sm">Show products</span>
        </label>
        <button type="button" onClick={onClose} className="block mt-2 text-slate-400 text-sm">Done</button>
      </div>
    );
  }
  if (block.type === "image_text") {
    return (
      <div className="mt-4 space-y-2">
        <input
          type="text"
          value={(data.imageUrl as string) || ""}
          onChange={(e) => onUpdate({ ...data, imageUrl: e.target.value })}
          placeholder="Image URL"
          className={INPUT_CLASS}
        />
        <input
          type="text"
          value={(data.title as string) || ""}
          onChange={(e) => onUpdate({ ...data, title: e.target.value })}
          placeholder="Title"
          className={INPUT_CLASS}
        />
        <textarea
          value={(data.text as string) || ""}
          onChange={(e) => onUpdate({ ...data, text: e.target.value })}
          placeholder="Text"
          rows={3}
          className={`${INPUT_CLASS} resize-none`}
        />
        <button type="button" onClick={onClose} className="text-slate-400 text-sm">Done</button>
      </div>
    );
  }
  if (block.type === "faq") {
    const items = (data.items as Array<{ question: string; answer: string }>) || [];
    return (
      <div className="mt-4 space-y-2">
        {items.map((item, i) => (
          <div key={i} className="space-y-1">
            <input
              type="text"
              value={item.question}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...next[i], question: e.target.value };
                onUpdate({ ...data, items: next });
              }}
              placeholder="Question"
              className={INPUT_CLASS}
            />
            <textarea
              value={item.answer}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...next[i], answer: e.target.value };
                onUpdate({ ...data, items: next });
              }}
              placeholder="Answer"
              rows={2}
              className={`${INPUT_CLASS} resize-none`}
            />
            <button type="button" onClick={() => onUpdate({ ...data, items: items.filter((_, j) => j !== i) })} className="text-red-400 text-sm">Remove</button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onUpdate({ ...data, items: [...items, { question: "", answer: "" }] })}
          className="text-indigo-400 text-sm"
        >
          + Add FAQ
        </button>
        <button type="button" onClick={onClose} className="block mt-2 text-slate-400 text-sm">Done</button>
      </div>
    );
  }
  if (block.type === "testimonials") {
    const items = (data.items as Array<{ name: string; quote: string; avatarUrl?: string }>) || [];
    return (
      <div className="mt-4 space-y-2">
        {items.map((item, i) => (
          <div key={i} className="space-y-1">
            <input
              type="text"
              value={item.name}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...next[i], name: e.target.value };
                onUpdate({ ...data, items: next });
              }}
              placeholder="Name"
              className={INPUT_CLASS}
            />
            <textarea
              value={item.quote}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...next[i], quote: e.target.value };
                onUpdate({ ...data, items: next });
              }}
              placeholder="Quote"
              rows={2}
              className={`${INPUT_CLASS} resize-none`}
            />
            <button type="button" onClick={() => onUpdate({ ...data, items: items.filter((_, j) => j !== i) })} className="text-red-400 text-sm">Remove</button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onUpdate({ ...data, items: [...items, { name: "", quote: "", avatarUrl: "" }] })}
          className="text-indigo-400 text-sm"
        >
          + Add testimonial
        </button>
        <button type="button" onClick={onClose} className="block mt-2 text-slate-400 text-sm">Done</button>
      </div>
    );
  }
  return null;
}

function AddBlockModal({
  blockTypes,
  onSelect,
  onClose,
}: {
  blockTypes: { id: StorefrontBlock["type"]; name: string }[];
  onSelect: (type: StorefrontBlock["type"]) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-semibold text-slate-50 mb-4">Add Section</h3>
        <div className="grid grid-cols-2 gap-2">
          {blockTypes.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className="p-4 rounded-lg border border-slate-700 text-slate-100 hover:bg-slate-800 hover:border-slate-600 transition-colors text-left"
            >
              {t.name}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="mt-4 w-full py-2 border border-slate-700 text-slate-400 rounded-lg hover:bg-slate-800">
          Cancel
        </button>
      </div>
    </div>
  );
}
