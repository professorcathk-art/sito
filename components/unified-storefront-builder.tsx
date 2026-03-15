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
import {
  THEME_PRESETS,
  THEME_PRESET_VALUES,
  FONT_FAMILIES,
  CARD_STYLES,
  BUTTON_RADIUS_OPTIONS,
  BUTTON_STYLE_OPTIONS,
  type ThemePresetId,
  type FontFamilyId,
  type CardStyleId,
  type ButtonRadiusId,
  type ButtonStyleId,
} from "@/lib/storefront-theme-config";

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
  { id: "social_media", name: "Social Media" },
  { id: "book_me", name: "Book Me" },
  { id: "image_text", name: "Image + Text" },
  { id: "faq", name: "FAQ" },
  { id: "testimonials", name: "Testimonials" },
  { id: "rich_text", name: "Rich Text" },
  { id: "image_banner", name: "Image Banner" },
  { id: "bullet_list", name: "Bullet List" },
];

const DEFAULT_BLOCK_DATA: Record<StorefrontBlock["type"], Record<string, unknown>> = {
  header: { name: "", tagline: "", bio: "", avatarUrl: "" },
  links: { items: [{ title: "", url: "", icon: "", order: 0, description: "", thumbnailUrl: "", emoji: "" }], textAlign: "left" as "left" | "center" | "right" },
  products: { showProducts: true },
  social_media: { platforms: ["instagram", "linkedin", "tiktok", "twitter", "youtube"] },
  book_me: {},
  image_text: { imageUrl: "", title: "", text: "", alignment: "left" },
  faq: { items: [{ question: "", answer: "" }] },
  testimonials: { items: [{ name: "", quote: "", avatarUrl: "" }] },
  rich_text: { content: "" },
  image_banner: { imageUrl: "" },
  bullet_list: { items: [""] },
};

const DEFAULT_BLOCKS: StorefrontBlock[] = [
  { id: "default-header", type: "header", order: 0, data: { ...DEFAULT_BLOCK_DATA.header } },
  { id: "default-links", type: "links", order: 1, data: { ...DEFAULT_BLOCK_DATA.links } },
  { id: "default-products", type: "products", order: 2, data: { ...DEFAULT_BLOCK_DATA.products } },
  { id: "default-book-me", type: "book_me", order: 3, data: {} },
];

export function UnifiedStorefrontBuilder() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<"profile" | "design" | "blocks">("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
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
    tiktokUrl: "",
    twitterUrl: "",
    youtubeUrl: "",
    storefrontBackgroundImageUrl: "",
    listedOnMarketplace: false,
    avatarUrl: "",
    customSlug: "",
  });
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugError, setSlugError] = useState("");
  const [existingProfile, setExistingProfile] = useState<{ category_id?: string; bio?: string } | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backgroundFileInputRef = useRef<HTMLInputElement>(null);

  // Design settings (Theme & Styling Engine)
  const [isPro, setIsPro] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [designSettings, setDesignSettings] = useState<{
    themePreset: ThemePresetId;
    fontFamily: FontFamilyId;
    backgroundType: "solid" | "gradient" | "mesh";
    backgroundColor: string;
    backgroundImageUrl: string;
    textColor: string;
    subheadlineColor: string;
    buttonColor: string;
    buttonTextColor: string;
    cardStyle: CardStyleId;
    buttonRadius: ButtonRadiusId;
    buttonStyle: ButtonStyleId;
  }>({
    themePreset: "minimal",
    fontFamily: "inter",
    backgroundType: "solid",
    backgroundImageUrl: "",
    buttonStyle: "default",
    ...THEME_PRESET_VALUES.minimal,
    subheadlineColor: (THEME_PRESET_VALUES.minimal as { subheadlineColor?: string }).subheadlineColor ?? THEME_PRESET_VALUES.minimal.textColor,
  });

  // Storefront blocks (initialized with defaults so page is never blank)
  const [storefrontBlocks, setStorefrontBlocks] = useState<StorefrontBlock[]>(() => [...DEFAULT_BLOCKS]);
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
        const baseProfileSelect = `
              name, tagline, bio, website, linkedin, instagram_url, tiktok_url, twitter_url, youtube_url,
              storefront_background_image_url, listed_on_marketplace,
              category_id, country_id, language_supported, phone_number, avatar_url, custom_slug,
              is_pro_store, storefront_theme_preset, storefront_custom_brand_color, storefront_button_style,
              storefront_font_family, storefront_background_type, storefront_background_color, storefront_card_style,
              storefront_text_color, storefront_button_text_color, storefront_button_variant, storefront_blocks,
              categories!profiles_category_id_fkey(name),
              countries(name)
            `;
        let profileRes = await supabase
          .from("profiles")
          .select(`${baseProfileSelect}, storefront_subheadline_color`)
          .eq("id", user.id)
          .single();
        if (profileRes.error) {
          profileRes = await supabase
            .from("profiles")
            .select(baseProfileSelect)
            .eq("id", user.id)
            .single();
        }
        const [categoriesRes, countriesRes, productsRes] = await Promise.all([
          supabase.from("categories").select("id, name").order("name"),
          supabase.from("countries").select("id, name, code").order("name"),
          supabase.from("products").select("id, name, price, pricing_type, product_type").eq("expert_id", user.id).limit(10),
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
            tiktokUrl: (p.tiktok_url as string) || "",
            twitterUrl: (p.twitter_url as string) || "",
            youtubeUrl: (p.youtube_url as string) || "",
            storefrontBackgroundImageUrl: (p.storefront_background_image_url as string) || "",
            listedOnMarketplace: (p.listed_on_marketplace as boolean) || false,
            avatarUrl: (p.avatar_url as string) || "",
            customSlug: (p.custom_slug as string) || "",
          });
          if (p.category_id) setCategorySearch(categoryName || "");
          if (p.country_id) setCountrySearch(countryName || "");
          if (p.custom_slug) setSlugAvailable(true);

          setIsPro((p.is_pro_store as boolean) || false);
          const themeMap: Record<string, ThemePresetId> = {
            default: "minimal",
            "minimal-light": "minimal",
            "bold-dark": "midnight-glass",
            "soft-gradient": "pearl-silk",
            "organic-earth": "organic-earth",
            "neon-cyber": "neon-cyber",
            "glass-ocean": "glass-ocean",
            "liquid-velvet": "liquid-velvet",
          };
          const rawTheme = (p.storefront_theme_preset as string) || "default";
          const themePreset = (themeMap[rawTheme] ?? (THEME_PRESETS[rawTheme as ThemePresetId] ? rawTheme : "minimal")) as ThemePresetId;
          const presetVals = THEME_PRESET_VALUES[themePreset] ?? THEME_PRESET_VALUES.minimal;
          const fontMap: Record<string, FontFamilyId> = {
            "font-sans": "inter",
            "font-serif": "playfair",
            "font-mono": "jetbrains-mono",
            inter: "inter",
            roboto: "roboto",
            playfair: "playfair",
            "space-grotesk": "space-grotesk",
            "dm-sans": "dm-sans",
            "jetbrains-mono": "jetbrains-mono",
          };
          const btnStyleToRadius: Record<string, ButtonRadiusId> = {
            "rounded-full": "pill",
            "rounded-md": "rounded",
            "hard-edge": "sharp",
            sharp: "sharp",
          };
          const storedFont = (p.storefront_font_family as string) || "font-sans";
          const storedBtn = (p.storefront_button_style as string) || "rounded-md";
          const storedBtnVariant = (p.storefront_button_variant as string) || presetVals.buttonStyle || "default";
          setDesignSettings({
            themePreset,
            fontFamily: (fontMap[storedFont] || presetVals.fontFamily || "inter") as FontFamilyId,
            backgroundType: ((p.storefront_background_type as string) || "solid") as "solid" | "gradient" | "mesh",
            backgroundColor: (p.storefront_background_color as string) || presetVals.backgroundColor,
            backgroundImageUrl: (presetVals.backgroundImageUrl as string) || "",
            textColor: (p.storefront_text_color as string) || presetVals.textColor,
            subheadlineColor: (p.storefront_subheadline_color as string) || (presetVals as { subheadlineColor?: string }).subheadlineColor || presetVals.textColor,
            buttonColor: (p.storefront_custom_brand_color as string) || presetVals.buttonColor,
            buttonTextColor: (p.storefront_button_text_color as string) || presetVals.buttonTextColor,
            cardStyle: ((p.storefront_card_style as string) || presetVals.cardStyle) as CardStyleId,
            buttonRadius: (btnStyleToRadius[storedBtn] || presetVals.buttonRadius || "rounded") as ButtonRadiusId,
            buttonStyle: (["default", "glass", "neon", "organic"].includes(storedBtnVariant) ? storedBtnVariant : presetVals.buttonStyle || "default") as ButtonStyleId,
          });
          const dbBlocks = (p.storefront_blocks as StorefrontBlock[]) || [];
          setStorefrontBlocks(
            dbBlocks.length > 0
              ? [...dbBlocks].sort((a, b) => a.order - b.order)
              : DEFAULT_BLOCKS
          );
        }

        if (categoriesRes.data) setCategories(categoriesRes.data);
        if (countriesRes.data) setCountries(countriesRes.data);
        if (productsRes.data) setProducts(productsRes.data.filter((p: { product_type?: string }) => p.product_type !== "appointment"));
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

  const handleImageUpload = async (file: File, pathPrefix: string): Promise<string> => {
    if (!user) throw new Error("Not authenticated");
    if (!file.type.startsWith("image/")) throw new Error("Please upload an image");
    if (file.size > 5 * 1024 * 1024) throw new Error("Image must be under 5MB");
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${pathPrefix}/${user.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("blog-resources").upload(path, file, { cacheControl: "3600", upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("blog-resources").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setUploadingBackground(true);
    setError("");
    try {
      const url = await handleImageUpload(file, "storefront/background");
      setProfileData({ ...profileData, storefrontBackgroundImageUrl: url });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingBackground(false);
      e.target.value = "";
    }
  };

  const handleThemeSelect = (theme: ThemePresetId) => {
    const preset = THEME_PRESET_VALUES[theme] ?? THEME_PRESET_VALUES.minimal;
    setDesignSettings((prev) => ({
      ...prev,
      themePreset: theme,
      backgroundColor: preset.backgroundColor,
      backgroundImageUrl: (preset.backgroundImageUrl as string) || "",
      textColor: preset.textColor,
      subheadlineColor: (preset.subheadlineColor as string) || preset.textColor,
      buttonColor: preset.buttonColor,
      buttonTextColor: preset.buttonTextColor,
      fontFamily: (preset.fontFamily as FontFamilyId) || prev.fontFamily,
      cardStyle: preset.cardStyle,
      buttonRadius: preset.buttonRadius,
      buttonStyle: (preset.buttonStyle as ButtonStyleId) || "default",
    }));
  };

  const handleAddBlock = (type: StorefrontBlock["type"]) => {
    if (type === "header" && storefrontBlocks.some((b) => b.type === "header")) return;
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

  const availableBlockTypes = BLOCK_TYPES.filter(
    (t) => t.id !== "header" || !storefrontBlocks.some((b) => b.type === "header")
  );

  const handleUpdateBlock = (id: string, data: Record<string, unknown>) => {
    setStorefrontBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, data } : b))
    );
    setEditingBlock((prev) => (prev?.id === id ? { ...prev, data } : prev));
  };

  const handleRemoveBlock = (id: string) => {
    const block = storefrontBlocks.find((b) => b.id === id);
    if (block?.type === "header") return; // Lock header - expert identity must stay
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
          tiktok_url: profileData.tiktokUrl || null,
          twitter_url: profileData.twitterUrl || null,
          youtube_url: profileData.youtubeUrl || null,
          storefront_background_image_url: profileData.storefrontBackgroundImageUrl || null,
          avatar_url: profileData.avatarUrl || null,
          listed_on_marketplace: profileData.listedOnMarketplace,
          custom_slug: profileData.customSlug.trim() || null,
          storefront_theme_preset: designSettings.themePreset,
          storefront_custom_brand_color: designSettings.buttonColor || null,
          storefront_button_style: designSettings.buttonRadius === "pill" ? "rounded-full" : designSettings.buttonRadius === "sharp" ? "sharp" : "rounded-md",
          storefront_font_family: designSettings.fontFamily,
          storefront_background_type: designSettings.backgroundType,
          storefront_background_color: designSettings.backgroundColor || null,
          storefront_card_style: designSettings.cardStyle,
          storefront_text_color: designSettings.textColor || null,
          storefront_button_text_color: designSettings.buttonTextColor || null,
          storefront_button_variant: designSettings.buttonStyle || "default",
          storefront_subheadline_color: designSettings.subheadlineColor || null,
          storefront_blocks: storefrontBlocks,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });

      if (profileError) {
        if (profileError.message?.includes("storefront_subheadline_color") || profileError.message?.includes("column")) {
          const { error: retryError } = await supabase.from("profiles").upsert({
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
            tiktok_url: profileData.tiktokUrl || null,
            twitter_url: profileData.twitterUrl || null,
            youtube_url: profileData.youtubeUrl || null,
            storefront_background_image_url: profileData.storefrontBackgroundImageUrl || null,
            avatar_url: profileData.avatarUrl || null,
            listed_on_marketplace: profileData.listedOnMarketplace,
            custom_slug: profileData.customSlug.trim() || null,
            storefront_theme_preset: designSettings.themePreset,
            storefront_custom_brand_color: designSettings.buttonColor || null,
            storefront_button_style: designSettings.buttonRadius === "pill" ? "rounded-full" : designSettings.buttonRadius === "sharp" ? "sharp" : "rounded-md",
            storefront_font_family: designSettings.fontFamily,
            storefront_background_type: designSettings.backgroundType,
            storefront_background_color: designSettings.backgroundColor || null,
            storefront_card_style: designSettings.cardStyle,
            storefront_text_color: designSettings.textColor || null,
            storefront_button_text_color: designSettings.buttonTextColor || null,
            storefront_button_variant: designSettings.buttonStyle || "default",
            storefront_blocks: storefrontBlocks,
            updated_at: new Date().toISOString(),
          }, { onConflict: "id" });
          if (retryError) throw retryError;
        } else {
          throw profileError;
        }
      }
      router.refresh();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
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

  const productsBlock = storefrontBlocks.find((b) => b.type === "products");
  const selectedProductIds = (productsBlock?.data?.selectedProductIds as string[] | undefined);
  const showProducts = !!productsBlock;
  const displayedProducts =
    !showProducts
      ? []
      : selectedProductIds === undefined
        ? products
        : selectedProductIds.length > 0
          ? products.filter((p) => selectedProductIds.includes(p.id))
          : [];

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
          designSettings.buttonColor
            ? { "--brand": designSettings.buttonColor, "--brand-color": designSettings.buttonColor } as React.CSSProperties
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
                    backgroundFileInputRef={backgroundFileInputRef}
                    onBackgroundUpload={handleBackgroundUpload}
                    uploadingBackground={uploadingBackground}
                  />
                )}

                {activeTab === "design" && (
                  <DesignTab
                    designSettings={designSettings}
                    isPro={isPro}
                    onThemeSelect={handleThemeSelect}
                    onDesignChange={setDesignSettings}
                    onBackgroundUpload={handleBackgroundUpload}
                    uploadingBackground={uploadingBackground}
                    backgroundImageUrl={profileData.storefrontBackgroundImageUrl}
                    backgroundFileInputRef={backgroundFileInputRef}
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
                    onImageUpload={handleImageUpload}
                    socialMediaUrls={{
                      instagram: profileData.instagramUrl,
                      tiktok: profileData.tiktokUrl,
                      linkedin: profileData.linkedin,
                      twitter: profileData.twitterUrl,
                      youtube: profileData.youtubeUrl,
                    }}
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
              {saveSuccess && <p className="text-green-400 text-sm mt-2">Changes saved successfully!</p>}
            </div>

            {/* Right - Sticky Mobile Preview */}
            <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
              <StorefrontPreview
                  designState={{
                    backgroundColor: designSettings.backgroundColor,
                    backgroundImageUrl: designSettings.backgroundImageUrl || profileData.storefrontBackgroundImageUrl,
                    textColor: designSettings.textColor,
                    subheadlineColor: designSettings.subheadlineColor,
                    buttonColor: designSettings.buttonColor,
                    buttonTextColor: designSettings.buttonTextColor,
                    fontFamily: designSettings.fontFamily,
                    cardStyle: designSettings.cardStyle,
                    buttonRadius: designSettings.buttonRadius,
                    buttonStyle: designSettings.buttonStyle,
                    themePreset: designSettings.themePreset,
                    glowElement: THEME_PRESET_VALUES[designSettings.themePreset]?.glowElement,
                  }}
                  customLinks={customLinks}
                  showProducts={showProducts}
                  showAppointments={true}
                  showBlog={true}
                  bioOverride={undefined}
                  expertName={profileData.name || "Expert"}
                  expertBio={profileData.bio || ""}
                  expertAvatar={profileData.avatarUrl}
                  verified={false}
                  products={displayedProducts}
                  storefrontBlocks={storefrontBlocks.length > 0 ? [...storefrontBlocks].sort((a, b) => a.order - b.order) : undefined}
                  profileData={profileData}
                />
              </div>
            </div>
          </div>
        </div>

      {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} />}

      {showAddBlockModal && (
        <AddBlockModal
          blockTypes={availableBlockTypes}
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
  backgroundFileInputRef,
  onBackgroundUpload,
  uploadingBackground,
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
    tiktokUrl: string;
    twitterUrl: string;
    youtubeUrl: string;
    storefrontBackgroundImageUrl: string;
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
  backgroundFileInputRef: React.RefObject<HTMLInputElement>;
  onBackgroundUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadingBackground: boolean;
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
      <div>
        <label className="block text-sm font-medium text-slate-200 mb-2">Social Media Links</label>
        <div className="space-y-2">
          <input type="url" value={profileData.website} onChange={(e) => onProfileChange("website", e.target.value)} placeholder="Website" className={INPUT_CLASS} />
          <input type="url" value={profileData.linkedin} onChange={(e) => onProfileChange("linkedin", e.target.value)} placeholder="LinkedIn URL" className={INPUT_CLASS} />
          <input type="url" value={profileData.instagramUrl} onChange={(e) => onProfileChange("instagramUrl", e.target.value)} placeholder="Instagram URL" className={INPUT_CLASS} />
          <input type="url" value={profileData.tiktokUrl} onChange={(e) => onProfileChange("tiktokUrl", e.target.value)} placeholder="TikTok URL" className={INPUT_CLASS} />
          <input type="url" value={profileData.twitterUrl} onChange={(e) => onProfileChange("twitterUrl", e.target.value)} placeholder="Twitter/X URL" className={INPUT_CLASS} />
          <input type="url" value={profileData.youtubeUrl} onChange={(e) => onProfileChange("youtubeUrl", e.target.value)} placeholder="YouTube URL" className={INPUT_CLASS} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-200 mb-1">Storefront Background Image</label>
        <div className="flex items-center gap-4">
          {profileData.storefrontBackgroundImageUrl && (
            <img src={profileData.storefrontBackgroundImageUrl} alt="Background" className="w-24 h-16 rounded object-cover border-2 border-slate-700" />
          )}
          <div>
            <input ref={backgroundFileInputRef} type="file" accept="image/*" onChange={onBackgroundUpload} className="hidden" />
            <button
              type="button"
              onClick={() => backgroundFileInputRef.current?.click()}
              disabled={uploadingBackground}
              className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-100 rounded-lg text-sm hover:bg-slate-700 disabled:opacity-50"
            >
              {uploadingBackground ? "Uploading..." : profileData.storefrontBackgroundImageUrl ? "Change background" : "Upload background"}
            </button>
          </div>
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
  onBackgroundUpload,
  uploadingBackground,
  backgroundImageUrl,
  backgroundFileInputRef,
}: {
  designSettings: {
    themePreset: ThemePresetId;
    fontFamily: FontFamilyId;
    backgroundType: "solid" | "gradient" | "mesh";
    backgroundColor: string;
    backgroundImageUrl: string;
    textColor: string;
    subheadlineColor: string;
    buttonColor: string;
    buttonTextColor: string;
    cardStyle: CardStyleId;
    buttonRadius: ButtonRadiusId;
    buttonStyle: ButtonStyleId;
  };
  isPro: boolean;
  onThemeSelect: (theme: ThemePresetId) => void;
  onDesignChange: React.Dispatch<React.SetStateAction<typeof designSettings>>;
  onBackgroundUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadingBackground?: boolean;
  backgroundImageUrl?: string;
  backgroundFileInputRef?: React.RefObject<HTMLInputElement>;
}) {
  return (
    <div className="space-y-8">
      {/* Themes Section - Mini phone previews */}
      <section>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Theme</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Object.values(THEME_PRESETS).map((preset) => {
            const themeKey = preset.id;
            const theme = THEME_PRESET_VALUES[themeKey];
            const isSelected = designSettings.themePreset === themeKey;
            const bgStyle =
              theme.backgroundColor.startsWith("conic") || theme.backgroundColor.startsWith("linear")
                ? {
                    background:
                      themeKey === "pearl-silk" || themeKey === "soft-gradient"
                        ? "conic-gradient(at top right, #fdf2f8 0%, #f8fafc 50%, #fffbeb 100%)"
                        : theme.backgroundColor,
                    backgroundImage: theme.backgroundImageUrl ? `url(${theme.backgroundImageUrl})` : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : {
                    backgroundColor: theme.backgroundColor,
                    backgroundImage: theme.backgroundImageUrl ? `url(${theme.backgroundImageUrl})` : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  };
            const btnRadius =
              theme.buttonRadius === "pill" ? "999px" : theme.buttonRadius === "rounded" ? "4px" : "0";
            const btnStyle =
              theme.buttonStyle === "glass"
                ? {
                    backgroundColor: "rgba(255,255,255,0.1)",
                    backdropFilter: "blur(4px)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: btnRadius,
                    boxShadow: "none",
                  }
                : theme.buttonStyle === "neon"
                  ? {
                      backgroundColor: theme.buttonColor,
                      borderRadius: btnRadius,
                      boxShadow: `0 0 4px ${theme.buttonColor}`,
                    }
                  : {
                      backgroundColor: theme.buttonColor,
                      borderRadius: btnRadius,
                      boxShadow: "none",
                    };
            return (
              <button
                key={themeKey}
                type="button"
                onClick={() => onThemeSelect(themeKey)}
                className={`relative flex flex-col items-center p-3 rounded-xl border-2 transition-all cursor-pointer ${
                  isSelected ? "border-indigo-500 bg-indigo-500/10" : "border-slate-800 bg-slate-900/50 hover:border-slate-600"
                }`}
              >
                <div
                  className="w-full aspect-[1/2] rounded-lg overflow-hidden relative shadow-inner mb-3 border border-slate-700/50 flex flex-col items-center py-4 px-2 gap-2"
                  style={bgStyle}
                >
                  {themeKey === "fluid-aura" && (
                    <div className="absolute inset-0 bg-fuchsia-500/30 blur-xl mix-blend-screen pointer-events-none" aria-hidden />
                  )}
                  {themeKey === "midnight-glass" && (
                    <div className="absolute inset-0 bg-indigo-900/20 blur-xl pointer-events-none -z-10" aria-hidden />
                  )}
                  <div className="w-6 h-6 rounded-full bg-black/20 backdrop-blur-sm border border-white/20 z-10 shrink-0" />
                  <div
                    className="w-12 h-1 rounded-full shrink-0 z-10"
                    style={{ backgroundColor: theme.textColor, opacity: 0.6 }}
                  />
                  <div
                    className="w-8 h-1 rounded-full shrink-0 mb-2 z-10"
                    style={{ backgroundColor: theme.textColor, opacity: 0.4 }}
                  />
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-full h-4 z-10 shrink-0" style={btnStyle} />
                  ))}
                </div>
                <span className="text-sm font-medium text-slate-200">{preset.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Typography Section */}
      <section>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Typography</h3>
        <select
          value={designSettings.fontFamily}
          onChange={(e) => onDesignChange((s) => ({ ...s, fontFamily: e.target.value as FontFamilyId }))}
          className={`w-full ${INPUT_CLASS}`}
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </section>

      {/* Background Section */}
      <section>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Background</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {designSettings.backgroundColor?.startsWith("#") && (
              <input
                type="color"
                value={designSettings.backgroundColor || "#FAFAFA"}
                onChange={(e) => onDesignChange((s) => ({ ...s, backgroundColor: e.target.value }))}
                className="w-12 h-12 rounded-lg border border-slate-700 cursor-pointer flex-shrink-0"
              />
            )}
            <input
              type="text"
              value={designSettings.backgroundColor || ""}
              onChange={(e) => onDesignChange((s) => ({ ...s, backgroundColor: e.target.value || THEME_PRESET_VALUES.minimal.backgroundColor }))}
              placeholder="#FAFAFA or linear-gradient(...)"
              className={`flex-1 ${INPUT_CLASS} py-2`}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Upload Background Image</label>
            <div className="flex items-center gap-4">
              {backgroundImageUrl && (
                <img src={backgroundImageUrl} alt="Background" className="w-24 h-16 rounded object-cover border-2 border-slate-700" />
              )}
              {onBackgroundUpload && backgroundFileInputRef && (
                <div>
                  <input ref={backgroundFileInputRef} type="file" accept="image/*" onChange={onBackgroundUpload} className="hidden" />
                  <button
                    type="button"
                    onClick={() => backgroundFileInputRef.current?.click()}
                    disabled={uploadingBackground}
                    className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-100 rounded-lg text-sm hover:bg-slate-700 disabled:opacity-50"
                  >
                    {uploadingBackground ? "Uploading..." : backgroundImageUrl ? "Change" : "Upload"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Shapes Section */}
      <section>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Shapes</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Card Style</label>
            <div className="flex flex-wrap gap-2">
              {CARD_STYLES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onDesignChange((s) => ({ ...s, cardStyle: c.id }))}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                    designSettings.cardStyle === c.id ? "border-indigo-500 bg-indigo-500/10 text-slate-50" : "border-slate-700 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Button Radius</label>
            <div className="flex flex-wrap gap-2">
              {BUTTON_RADIUS_OPTIONS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onDesignChange((s) => ({ ...s, buttonRadius: b.id }))}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                    designSettings.buttonRadius === b.id ? "border-indigo-500 bg-indigo-500/10 text-slate-50" : "border-slate-700 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Button Style</label>
            <div className="flex flex-wrap gap-2">
              {BUTTON_STYLE_OPTIONS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onDesignChange((s) => ({ ...s, buttonStyle: b.id }))}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                    designSettings.buttonStyle === b.id ? "border-indigo-500 bg-indigo-500/10 text-slate-50" : "border-slate-700 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Colors */}
      <section>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Colors</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Text Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={designSettings.textColor?.startsWith("#") ? designSettings.textColor : "#111827"}
                onChange={(e) => onDesignChange((s) => ({ ...s, textColor: e.target.value }))}
                className="w-10 h-10 rounded border border-slate-700 cursor-pointer flex-shrink-0"
              />
              <input
                type="text"
                value={designSettings.textColor || ""}
                onChange={(e) => onDesignChange((s) => ({ ...s, textColor: e.target.value }))}
                placeholder="#111827"
                className={`flex-1 ${INPUT_CLASS} py-2`}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Subheadline Color (tagline, link descriptions)</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={designSettings.subheadlineColor?.startsWith("#") ? designSettings.subheadlineColor : "#6B7280"}
                onChange={(e) => onDesignChange((s) => ({ ...s, subheadlineColor: e.target.value }))}
                className="w-10 h-10 rounded border border-slate-700 cursor-pointer flex-shrink-0"
              />
              <input
                type="text"
                value={designSettings.subheadlineColor || ""}
                onChange={(e) => onDesignChange((s) => ({ ...s, subheadlineColor: e.target.value }))}
                placeholder="#6B7280 or rgba(...)"
                className={`flex-1 ${INPUT_CLASS} py-2`}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Button Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={designSettings.buttonColor || "#6366f1"}
                onChange={(e) => onDesignChange((s) => ({ ...s, buttonColor: e.target.value }))}
                className="w-10 h-10 rounded border border-slate-700 cursor-pointer flex-shrink-0"
              />
              <input
                type="text"
                value={designSettings.buttonColor || ""}
                onChange={(e) => onDesignChange((s) => ({ ...s, buttonColor: e.target.value }))}
                placeholder="#6366f1"
                className={`flex-1 ${INPUT_CLASS} py-2`}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Button Text Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={designSettings.buttonTextColor || "#FFFFFF"}
                onChange={(e) => onDesignChange((s) => ({ ...s, buttonTextColor: e.target.value }))}
                className="w-10 h-10 rounded border border-slate-700 cursor-pointer flex-shrink-0"
              />
              <input
                type="text"
                value={designSettings.buttonTextColor || ""}
                onChange={(e) => onDesignChange((s) => ({ ...s, buttonTextColor: e.target.value }))}
                placeholder="#FFFFFF"
                className={`flex-1 ${INPUT_CLASS} py-2`}
              />
            </div>
          </div>
        </div>
      </section>
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
  onImageUpload,
  socialMediaUrls,
}: {
  blocks: StorefrontBlock[];
  editingBlock: StorefrontBlock | null;
  onAddBlock: () => void;
  onEditBlock: (b: StorefrontBlock | null) => void;
  onUpdateBlock: (id: string, data: Record<string, unknown>) => void;
  onRemoveBlock: (id: string) => void;
  onMoveBlock: (id: string, dir: "up" | "down") => void;
  products: Array<{ id: string; name: string; price: number; pricing_type: string }>;
  onImageUpload: (file: File, pathPrefix: string) => Promise<string>;
  socialMediaUrls?: { instagram?: string; tiktok?: string; linkedin?: string; twitter?: string; youtube?: string };
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
        {(() => {
          const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order);
          return sortedBlocks.map((block, idx) => {
            const isHeader = block.type === "header";
          return (
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
                  disabled={idx === sortedBlocks.length - 1}
                  className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button type="button" onClick={() => onEditBlock(editingBlock?.id === block.id ? null : block)} className="px-2 py-1 text-indigo-400 text-sm">
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveBlock(block.id)}
                  disabled={isHeader}
                  className="px-2 py-1 text-red-400 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  title={isHeader ? "Header cannot be removed" : undefined}
                >
                  Remove
                </button>
              </div>
            </div>
            {editingBlock?.id === block.id && (
              <BlockEditForm
                block={block}
                onUpdate={(d) => onUpdateBlock(block.id, d)}
                onClose={() => onEditBlock(null)}
                products={products}
                onImageUpload={onImageUpload}
                socialMediaUrls={socialMediaUrls}
              />
            )}
          </div>
          );
          });
        })()}
      </div>
    </div>
  );
}

function BlockEditForm({
  block,
  onUpdate,
  onClose,
  products,
  onImageUpload,
  socialMediaUrls,
}: {
  block: StorefrontBlock;
  onUpdate: (data: Record<string, unknown>) => void;
  onClose: () => void;
  products: Array<{ id: string; name: string; price: number; pricing_type: string }>;
  onImageUpload: (file: File, pathPrefix: string) => Promise<string>;
  socialMediaUrls?: { instagram?: string; tiktok?: string; linkedin?: string; twitter?: string; youtube?: string };
}) {
  const data = block.data;
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [imageTextUploading, setImageTextUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>("");
  const [uploadErrorIndex, setUploadErrorIndex] = useState<number | null>(null);

  if (block.type === "header") {
    return (
      <div className="mt-4">
        <p className="text-slate-400 text-sm italic">
          Header details (Name, Bio, Avatar) are managed in the &quot;Profile Info&quot; tab. Use the arrows above to reorder where your header appears.
        </p>
      </div>
    );
  }
  if (block.type === "links") {
    const items = (data.items as Array<{ title: string; url: string; icon?: string; order: number; description?: string; thumbnailUrl?: string; emoji?: string }>) || [];
    const textAlign = (data.textAlign as "left" | "center" | "right") || "left";
    return (
      <div className="mt-4 space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-slate-400 text-sm">Text alignment:</span>
          {(["left", "center", "right"] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => onUpdate({ ...data, textAlign: a })}
              className={`px-2 py-1 text-xs rounded ${textAlign === a ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"}`}
            >
              {a}
            </button>
          ))}
        </div>
        {items.map((item, i) => (
          <div key={i} className="bg-slate-900 border border-slate-700 p-4 rounded-lg">
            <input
              type="text"
              value={item.title || ""}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...next[i], title: e.target.value };
                onUpdate({ ...data, items: next });
              }}
              placeholder="Title"
              className={`${INPUT_CLASS} mb-2`}
            />
            <input
              type="text"
              value={item.url || ""}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...next[i], url: e.target.value };
                onUpdate({ ...data, items: next });
              }}
              placeholder="URL"
              className={`${INPUT_CLASS} mb-2`}
            />
            <input
              type="text"
              value={item.emoji || ""}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...next[i], emoji: e.target.value };
                onUpdate({ ...data, items: next });
              }}
              placeholder="Emoji (e.g. 🔗)"
              maxLength={4}
              className={`${INPUT_CLASS} mb-2 w-20`}
            />
            <textarea
              value={item.description || ""}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...next[i], description: e.target.value };
                onUpdate({ ...data, items: next });
              }}
              placeholder="Description (optional)"
              rows={2}
              className={`${INPUT_CLASS} mb-2 resize-none`}
            />
            <div className="flex items-center gap-2 mb-2">
              {item.thumbnailUrl && (
                <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0">
                  <Image src={item.thumbnailUrl} alt="" fill className="object-cover" />
                </div>
              )}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id={`link-thumb-${i}`}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingIndex(i);
                    setUploadError("");
                    setUploadErrorIndex(null);
                    try {
                      const url = await onImageUpload(file, "storefront/links");
                      const next = [...items];
                      next[i] = { ...next[i], thumbnailUrl: url };
                      onUpdate({ ...data, items: next });
                    } catch (err) {
                      setUploadError(err instanceof Error ? err.message : "Upload failed");
                      setUploadErrorIndex(i);
                    } finally {
                      setUploadingIndex(null);
                      e.target.value = "";
                    }
                  }}
                />
                <label
                  htmlFor={`link-thumb-${i}`}
                  className={`inline-block px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-200 text-sm cursor-pointer hover:bg-slate-700 ${uploadingIndex === i ? "opacity-50 pointer-events-none" : ""}`}
                >
                  {uploadingIndex === i ? "Uploading..." : item.thumbnailUrl ? "Change thumbnail" : "Add thumbnail"}
                </label>
              </div>
            </div>
            {uploadErrorIndex === i && uploadError && <p className="text-red-400 text-xs mb-2">{uploadError}</p>}
            <button
              type="button"
              onClick={() => onUpdate({ ...data, items: items.filter((_, j) => j !== i) })}
              className="text-red-400 text-sm"
            >
              Remove link
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            onUpdate({
              ...data,
              items: [...items, { title: "", url: "", icon: "", order: items.length, description: "", thumbnailUrl: "", emoji: "" }],
            })
          }
          className="text-indigo-400 text-sm"
        >
          + Add link
        </button>
      </div>
    );
  }
  if (block.type === "products") {
    const selectedIds = data.selectedProductIds as string[] | undefined;
    const legacyShow = (data.showProducts as boolean) !== false;
    const ids = selectedIds !== undefined ? selectedIds : legacyShow ? products.map((p) => p.id) : [];
    return (
      <div className="mt-4 space-y-2">
        <p className="text-slate-400 text-sm mb-3">Select which products to display:</p>
        {products.length === 0 ? (
          <p className="text-slate-500 text-sm italic">No products yet. Add products in your dashboard first.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {products.map((p) => {
              const checked = ids.includes(p.id);
              return (
                <label
                  key={p.id}
                  className="flex items-center gap-3 p-2 rounded-lg border border-slate-700 hover:bg-slate-800/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked ? [...ids, p.id] : ids.filter((id) => id !== p.id);
                      onUpdate({ ...data, selectedProductIds: next });
                    }}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-500"
                  />
                  <span className="text-slate-200 text-sm flex-1">{p.name}</span>
                  <span className="text-slate-500 text-xs">{p.price === 0 ? "Free" : `$${p.price}`}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    );
  }
  if (block.type === "image_text") {
    return (
      <div className="mt-4 space-y-2">
        <div>
          <label className="block text-slate-400 text-sm mb-1">Image</label>
          {(data.imageUrl as string) && (
            <div className="relative w-full h-24 rounded-lg overflow-hidden mb-2">
              <Image src={data.imageUrl as string} alt="" fill className="object-cover" />
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            id="image-text-upload"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setImageTextUploading(true);
              setUploadError("");
              try {
                const url = await onImageUpload(file, "storefront/image-text");
                onUpdate({ ...data, imageUrl: url });
              } catch (err) {
                setUploadError(err instanceof Error ? err.message : "Upload failed");
              } finally {
                setImageTextUploading(false);
                e.target.value = "";
              }
            }}
          />
          <label
            htmlFor="image-text-upload"
            className="inline-block px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 text-sm cursor-pointer hover:bg-slate-700 disabled:opacity-50"
          >
            {imageTextUploading ? "Uploading..." : (data.imageUrl as string) ? "Change image" : "Upload image"}
          </label>
          {uploadError && <p className="text-red-400 text-xs mt-1">{uploadError}</p>}
        </div>
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
            <button type="button" onClick={() => onUpdate({ ...data, items: items.filter((_, j) => j !== i) })} className="text-red-400 text-sm">
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onUpdate({ ...data, items: [...items, { question: "", answer: "" }] })}
          className="text-indigo-400 text-sm"
        >
          + Add FAQ
        </button>
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
            <button type="button" onClick={() => onUpdate({ ...data, items: items.filter((_, j) => j !== i) })} className="text-red-400 text-sm">
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onUpdate({ ...data, items: [...items, { name: "", quote: "", avatarUrl: "" }] })}
          className="text-indigo-400 text-sm"
        >
          + Add testimonial
        </button>
      </div>
    );
  }
  if (block.type === "rich_text") {
    return (
      <div className="mt-4">
        <label className="block text-slate-400 text-sm mb-1">Content (HTML supported)</label>
        <textarea
          value={(data.content as string) || ""}
          onChange={(e) => onUpdate({ ...data, content: e.target.value })}
          placeholder="Enter paragraphs, quotes, or HTML..."
          rows={5}
          className={`${INPUT_CLASS} resize-none`}
        />
      </div>
    );
  }
  if (block.type === "image_banner") {
    return (
      <div className="mt-4 space-y-2">
        <label className="block text-slate-400 text-sm mb-1">Banner Image</label>
        {(data.imageUrl as string) && (
          <div className="relative w-full h-24 rounded-lg overflow-hidden mb-2">
            <Image src={data.imageUrl as string} alt="" fill className="object-cover" />
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          id="image-banner-upload"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setImageTextUploading(true);
            setUploadError("");
            try {
              const url = await onImageUpload(file, "storefront/banners");
              onUpdate({ ...data, imageUrl: url });
            } catch (err) {
              setUploadError(err instanceof Error ? err.message : "Upload failed");
            } finally {
              setImageTextUploading(false);
              e.target.value = "";
            }
          }}
        />
        <label
          htmlFor="image-banner-upload"
          className="inline-block px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 text-sm cursor-pointer hover:bg-slate-700 disabled:opacity-50"
        >
          {imageTextUploading ? "Uploading..." : (data.imageUrl as string) ? "Change image" : "Upload image"}
        </label>
        {uploadError && <p className="text-red-400 text-xs mt-1">{uploadError}</p>}
      </div>
    );
  }
  if (block.type === "bullet_list") {
    const items = Array.isArray(data.items) ? (data.items as string[]) : [""];
    return (
      <div className="mt-4 space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={item}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                onUpdate({ ...data, items: next });
              }}
              placeholder={`Item ${i + 1}`}
              className={INPUT_CLASS}
            />
            <button type="button" onClick={() => onUpdate({ ...data, items: items.filter((_, j) => j !== i) })} className="text-red-400 text-sm shrink-0">
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onUpdate({ ...data, items: [...items, ""] })}
          className="text-indigo-400 text-sm"
        >
          + Add item
        </button>
      </div>
    );
  }
  if (block.type === "social_media") {
    const platforms = (data.platforms as string[]) || ["instagram", "linkedin", "tiktok", "twitter", "youtube"];
    const availablePlatforms = [
      { id: "instagram", name: "Instagram", url: socialMediaUrls?.instagram },
      { id: "tiktok", name: "TikTok", url: socialMediaUrls?.tiktok },
      { id: "linkedin", name: "LinkedIn", url: socialMediaUrls?.linkedin },
      { id: "twitter", name: "Twitter/X", url: socialMediaUrls?.twitter },
      { id: "youtube", name: "YouTube", url: socialMediaUrls?.youtube },
    ].filter((p) => p.url);
    return (
      <div className="mt-4 space-y-2">
        <p className="text-slate-400 text-sm">Select which social links to show (only platforms with URLs in Profile):</p>
        {availablePlatforms.length === 0 ? (
          <p className="text-slate-500 text-sm italic">Add social media URLs in the Profile tab first.</p>
        ) : (
          <div className="space-y-2">
            {availablePlatforms.map((p) => {
              const checked = platforms.includes(p.id);
              return (
                <label key={p.id} className="flex items-center gap-3 p-2 rounded-lg border border-slate-700 hover:bg-slate-800/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked ? [...platforms, p.id] : platforms.filter((id) => id !== p.id);
                      onUpdate({ ...data, platforms: next });
                    }}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-500"
                  />
                  <span className="text-slate-200 text-sm">{p.name}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    );
  }
  if (block.type === "book_me") {
    return (
      <div className="mt-4">
        <p className="text-slate-400 text-sm italic">
          This block links to your appointment booking page. No configuration needed.
        </p>
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
