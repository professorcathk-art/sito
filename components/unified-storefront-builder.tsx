"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StorefrontPreview } from "@/components/storefront-preview";
import { UpgradeModal } from "@/components/upgrade-modal";
import { PagesFunnelsTab } from "@/components/storefront/pages-funnels-tab";
import type { StorefrontBlock } from "@/types/storefront";
import {
  parseStorefrontNav,
  type StorefrontNavConfig,
} from "@/lib/storefront-pages";
import {
  THEME_PRESETS,
  THEME_PRESET_VALUES,
  FONT_FAMILIES,
  CARD_STYLES,
  BUTTON_RADIUS_OPTIONS,
  BUTTON_STYLE_OPTIONS,
  normalizeThemePreset,
  type ThemePresetId,
  type FontFamilyId,
  type CardStyleId,
  type ButtonRadiusId,
  type ButtonStyleId,
} from "@/lib/storefront-theme-config";

const INPUT_CLASS =
  "w-full min-h-[44px] px-4 py-3 sm:py-2 text-base bg-slate-950 border border-slate-700 text-slate-100 rounded-md placeholder-slate-500 focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] outline-none transition-colors";

interface Category {
  id: string;
  name: string;
}

interface Country {
  id: string;
  name: string;
  code: string;
}

/** Addable section types — hero & social live on Profile Info */
const BLOCK_TYPES: { id: StorefrontBlock["type"]; name: string }[] = [
  { id: "header", name: "Header" },
  { id: "lead_magnet", name: "Lead Magnet" },
  { id: "links", name: "Links" },
  { id: "products", name: "Products" },
  { id: "book_me", name: "Book Me" },
  { id: "blog", name: "Blog Posts" },
  { id: "image_text", name: "Image + Text" },
  { id: "faq", name: "FAQ" },
  { id: "testimonials", name: "Testimonials" },
  { id: "rich_text", name: "Rich Text" },
  { id: "image_banner", name: "Image Banner" },
  { id: "bullet_list", name: "Bullet List" },
];

const DEFAULT_BLOCK_DATA: Record<StorefrontBlock["type"], Record<string, unknown>> = {
  hero: { imageUrl: "", overlayOpacity: 40, overlayColor: "#0f172a", avatarPosition: "center" },
  header: { name: "", tagline: "", bio: "", avatarUrl: "" },
  lead_magnet: {
    leadMagnetId: "",
    title: "Get my free guide",
    subtitle: "Join my list for exclusive tips and updates.",
    ctaText: "Send me the freebie",
    placeholder: "Enter your email",
    successMessage: "You're in! Check your inbox soon.",
  },
  links: {
    items: [
      {
        title: "",
        url: "",
        icon: "",
        order: 0,
        description: "",
        thumbnailUrl: "",
        emoji: "",
        variant: "card" as const,
      },
    ],
    textAlign: "left" as "left" | "center" | "right",
  },
  products: { showProducts: true, displayMode: "inline" },
  social_media: { platforms: ["instagram", "linkedin", "tiktok", "twitter", "youtube"] },
  book_me: {},
  blog: { title: "Latest posts", limit: 6 },
  image_text: { imageUrl: "", title: "", text: "", alignment: "left" },
  faq: { items: [{ question: "", answer: "" }] },
  testimonials: { items: [{ name: "", quote: "", avatarUrl: "" }] },
  rich_text: { content: "" },
  image_banner: { imageUrl: "", overlayOpacity: 0, overlayColor: "#000000", avatarPosition: "center" },
  bullet_list: { items: [""] },
};

const DEFAULT_BLOCKS: StorefrontBlock[] = [
  { id: "default-header", type: "header", order: 0, data: { ...DEFAULT_BLOCK_DATA.header } },
  { id: "default-lead-magnet", type: "lead_magnet", order: 1, data: { ...DEFAULT_BLOCK_DATA.lead_magnet } },
  { id: "default-products", type: "products", order: 2, data: { ...DEFAULT_BLOCK_DATA.products } },
  { id: "default-testimonials", type: "testimonials", order: 3, data: { items: [{ name: "", quote: "" }] } },
  { id: "default-faq", type: "faq", order: 4, data: { items: [{ question: "", answer: "" }] } },
  { id: "default-book-me", type: "book_me", order: 5, data: {} },
];

/**
 * Strip profile-owned blocks; keep header locked at top.
 * Preserves the given array order for non-header blocks (do not re-sort by stale `order`,
 * or drag/reorder swaps get undone).
 */
function normalizeEditableBlocks(blocks: StorefrontBlock[]): StorefrontBlock[] {
  const filtered = blocks.filter((b) => b.type !== "hero" && b.type !== "social_media");
  const header = filtered.find((b) => b.type === "header");
  const rest = filtered.filter((b) => b.type !== "header");
  if (!header) {
    return [
      { id: "default-header", type: "header" as const, order: 0, data: { ...DEFAULT_BLOCK_DATA.header } },
      ...rest.map((b, i) => ({ ...b, order: i + 1 })),
    ];
  }
  return [{ ...header, order: 0 }, ...rest.map((b, i) => ({ ...b, order: i + 1 }))];
}

function extractHeroSettings(blocks: StorefrontBlock[]): { overlayOpacity: number; overlayColor: string } {
  const hero = blocks.find((b) => b.type === "hero");
  return {
    overlayOpacity: typeof hero?.data?.overlayOpacity === "number" ? hero.data.overlayOpacity : 40,
    overlayColor: (hero?.data?.overlayColor as string) || "#0f172a",
  };
}

function buildDirtySnapshot(
  profileData: Record<string, unknown>,
  designSettings: Record<string, unknown>,
  storefrontBlocks: StorefrontBlock[],
  storefrontNav?: StorefrontNavConfig
) {
  return JSON.stringify({ profileData, designSettings, storefrontBlocks, storefrontNav });
}

export function UnifiedStorefrontBuilder() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<"profile" | "design" | "blocks" | "pages">("profile");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "design" || tab === "blocks" || tab === "profile" || tab === "pages") {
      setActiveTab(tab);
    }
  }, [searchParams]);
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
    heroOverlayOpacity: 40,
    heroOverlayColor: "#0f172a",
    listedOnMarketplace: false,
    avatarUrl: "",
    customSlug: "",
  });
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugError, setSlugError] = useState("");
  const [slugCopied, setSlugCopied] = useState(false);
  const [existingProfile, setExistingProfile] = useState<{ category_id?: string; bio?: string } | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backgroundFileInputRef = useRef<HTMLInputElement>(null);

  // Design settings (Theme & Styling Engine)
  const [isPro, setIsPro] = useState(false);
  const [hidePoweredBySito, setHidePoweredBySito] = useState(false);
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
  const [storefrontNav, setStorefrontNav] = useState<StorefrontNavConfig>(() => parseStorefrontNav(null));
  const [showAddBlockModal, setShowAddBlockModal] = useState(false);
  const [editingBlock, setEditingBlock] = useState<StorefrontBlock | null>(null);

  // Products for preview
  const [products, setProducts] = useState<
    Array<{
      id: string;
      name: string;
      price: number;
      pricing_type: string;
      product_type?: string;
      e_learning_subtype?: string;
      cover_image_url?: string | null;
      description?: string;
      duration_label?: string | null;
    }>
  >([]);

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
              is_pro_store, plan_tier, hide_powered_by_sito, storefront_theme_preset, storefront_custom_brand_color, storefront_button_style,
              storefront_font_family, storefront_background_type, storefront_background_color, storefront_card_style,
              storefront_text_color, storefront_button_text_color, storefront_button_variant, storefront_blocks, storefront_nav,
              categories!profiles_category_id_fkey(name),
              countries(name)
            `;
        let profileRes = await supabase
          .from("profiles")
          .select(`${baseProfileSelect}, storefront_subheadline_color`)
          .eq("id", user.id)
          .single();
        if (profileRes.error) {
          const withoutNav = baseProfileSelect.replace(/,\s*storefront_nav/, "");
          const withoutBilling = withoutNav
            .replace(/,\s*plan_tier/, "")
            .replace(/,\s*hide_powered_by_sito/, "");
          profileRes = await supabase
            .from("profiles")
            .select(`${withoutBilling}, storefront_subheadline_color`)
            .eq("id", user.id)
            .single();
          if (profileRes.error) {
            profileRes = await supabase
              .from("profiles")
              .select(withoutBilling)
              .eq("id", user.id)
              .single();
          }
        }
        const [categoriesRes, countriesRes, productsRes] = await Promise.all([
          supabase.from("categories").select("id, name").order("name"),
          supabase.from("countries").select("id, name, code").order("name"),
          supabase
            .from("products")
            .select("id, name, description, price, pricing_type, product_type, e_learning_subtype, course_id, courses(cover_image_url)")
            .eq("expert_id", user.id)
            .limit(24),
        ]);

        if (profileRes.data) {
          const p = profileRes.data as Record<string, unknown>;
          const cat = p.categories as { name: string } | { name: string }[] | undefined;
          const country = p.countries as { name: string } | { name: string }[] | undefined;
          const categoryName = Array.isArray(cat) ? cat[0]?.name : cat?.name;
          const countryName = Array.isArray(country) ? country[0]?.name : country?.name;
          setExistingProfile({ category_id: p.category_id as string | undefined, bio: p.bio as string | undefined });
          const dbBlocksRaw = (p.storefront_blocks as StorefrontBlock[]) || [];
          const heroSettings = extractHeroSettings(dbBlocksRaw);
          const nextProfile = {
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
            heroOverlayOpacity: heroSettings.overlayOpacity,
            heroOverlayColor: heroSettings.overlayColor,
            listedOnMarketplace: (p.listed_on_marketplace as boolean) || false,
            avatarUrl: (p.avatar_url as string) || "",
            customSlug: (p.custom_slug as string) || "",
          };
          setProfileData(nextProfile);
          if (p.category_id) setCategorySearch(categoryName || "");
          if (p.country_id) setCountrySearch(countryName || "");
          if (p.custom_slug) setSlugAvailable(true);

          setIsPro((p.is_pro_store as boolean) || p.plan_tier === "pro");
          setHidePoweredBySito(!!p.hide_powered_by_sito && ((p.is_pro_store as boolean) || p.plan_tier === "pro"));
          const themePreset = normalizeThemePreset(p.storefront_theme_preset as string);
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
          const nextDesign = {
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
          };
          setDesignSettings(nextDesign);
          const nextBlocks =
            dbBlocksRaw.length > 0
              ? normalizeEditableBlocks([...dbBlocksRaw].sort((a, b) => a.order - b.order))
              : [...DEFAULT_BLOCKS];
          setStorefrontBlocks(nextBlocks);
          const nextNav = parseStorefrontNav(p.storefront_nav);
          setStorefrontNav(nextNav);
          setSavedSnapshot(buildDirtySnapshot(nextProfile, nextDesign, nextBlocks, nextNav));
        } else {
          setSavedSnapshot(
            buildDirtySnapshot(
              {
                name: "",
                title: "",
                categoryId: "",
                categoryName: "",
                bio: "",
                countryId: "",
                countryName: "",
                languagesSupported: [],
                phoneNumber: "",
                website: "",
                linkedin: "",
                instagramUrl: "",
                tiktokUrl: "",
                twitterUrl: "",
                youtubeUrl: "",
                storefrontBackgroundImageUrl: "",
                heroOverlayOpacity: 40,
                heroOverlayColor: "#0f172a",
                listedOnMarketplace: false,
                avatarUrl: "",
                customSlug: "",
              },
              {
                themePreset: "minimal",
                fontFamily: "inter",
                backgroundType: "solid",
                backgroundImageUrl: "",
                buttonStyle: "default",
                ...THEME_PRESET_VALUES.minimal,
                subheadlineColor:
                  (THEME_PRESET_VALUES.minimal as { subheadlineColor?: string }).subheadlineColor ??
                  THEME_PRESET_VALUES.minimal.textColor,
              },
              DEFAULT_BLOCKS,
              parseStorefrontNav(null)
            )
          );
        }

        if (categoriesRes.data) setCategories(categoriesRes.data);
        if (countriesRes.data) setCountries(countriesRes.data);
        if (productsRes.data) {
          setProducts(
            productsRes.data.map((p: Record<string, unknown>) => {
              const courses = p.courses as { cover_image_url?: string } | { cover_image_url?: string }[] | null;
              const cover =
                (Array.isArray(courses) ? courses[0]?.cover_image_url : courses?.cover_image_url) ?? null;
              const productType = p.product_type as string | undefined;
              const subtype = ((p.e_learning_subtype as string) || "").toLowerCase();
              let duration_label: string | null = null;
              if (productType === "appointment") duration_label = "1-on-1 Session";
              else if (subtype.includes("webinar")) duration_label = "Live webinar";
              else if (subtype.includes("course")) duration_label = "Self-paced course";
              else if (subtype.includes("ebook")) duration_label = "Instant download";
              return {
                id: p.id as string,
                name: p.name as string,
                description: (p.description as string) || "",
                price: Number(p.price) || 0,
                pricing_type: (p.pricing_type as string) || "one_time",
                product_type: productType,
                e_learning_subtype: p.e_learning_subtype as string | undefined,
                cover_image_url: cover,
                duration_label,
              };
            })
          );
        }
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

  const handleProfileChange = (field: string, value: string | string[] | boolean | number) => {
    setProfileData({ ...profileData, [field]: value });
  };

  const storefrontPublicUrl = useMemo(() => {
    if (!profileData.customSlug.trim()) return "";
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://www.sito.club";
    return `${origin}/s/${profileData.customSlug.trim()}`;
  }, [profileData.customSlug]);

  const hasUnsavedChanges = useMemo(() => {
    if (savedSnapshot === null) return false;
    return buildDirtySnapshot(profileData, designSettings, storefrontBlocks, storefrontNav) !== savedSnapshot;
  }, [profileData, designSettings, storefrontBlocks, storefrontNav, savedSnapshot]);

  const handleCopyStorefrontUrl = async () => {
    if (!storefrontPublicUrl) return;
    try {
      await navigator.clipboard.writeText(storefrontPublicUrl);
      setSlugCopied(true);
      setTimeout(() => setSlugCopied(false), 2000);
    } catch {
      setError("Could not copy link");
    }
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
    if (type === "hero" || type === "social_media") return;
    if (type === "header" && storefrontBlocks.some((b) => b.type === "header")) return;
    const maxOrder = storefrontBlocks.length ? Math.max(...storefrontBlocks.map((b) => b.order)) : -1;
    const block: StorefrontBlock = {
      id: crypto.randomUUID(),
      type,
      order: maxOrder + 1,
      data: { ...DEFAULT_BLOCK_DATA[type] },
    };
    setStorefrontBlocks((prev) => normalizeEditableBlocks([...prev, block]));
    setShowAddBlockModal(false);
    setEditingBlock(block);
  };

  const availableBlockTypes = BLOCK_TYPES.filter((t) => {
    if (t.id === "header") return !storefrontBlocks.some((b) => b.type === "header");
    if (t.id === "blog") return !storefrontBlocks.some((b) => b.type === "blog");
    return true;
  });

  const handleUpdateBlock = (id: string, data: Record<string, unknown>) => {
    setStorefrontBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, data } : b))
    );
    setEditingBlock((prev) => (prev?.id === id ? { ...prev, data } : prev));
  };

  const handleRemoveBlock = (id: string) => {
    const block = storefrontBlocks.find((b) => b.id === id);
    if (block?.type === "header") return; // Lock header - expert identity must stay
    setStorefrontBlocks((prev) => normalizeEditableBlocks(prev.filter((b) => b.id !== id)));
    if (editingBlock?.id === id) setEditingBlock(null);
  };

  const handleMoveBlock = (id: string, direction: "up" | "down") => {
    // Work from display order (header first, no hero/social)
    const sorted = normalizeEditableBlocks(
      [...storefrontBlocks].sort((a, b) => a.order - b.order)
    );
    const idx = sorted.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const block = sorted[idx];
    if (block.type === "header") return; // Header stays at top
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= sorted.length) return;
    if (sorted[newIdx].type === "header") return; // Nothing may move above header
    const reordered = [...sorted];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    // Preserve swapped array order — normalize reassigns order indices only
    setStorefrontBlocks(normalizeEditableBlocks(reordered));
  };

  const blocksForSave = (): StorefrontBlock[] => {
    const editable = normalizeEditableBlocks(storefrontBlocks);
    const heroBlock: StorefrontBlock = {
      id: "managed-hero",
      type: "hero",
      order: 0,
      data: {
        imageUrl: profileData.storefrontBackgroundImageUrl || "",
        overlayOpacity: profileData.heroOverlayOpacity,
        overlayColor: profileData.heroOverlayColor,
        avatarPosition: "center",
      },
    };
    return [
      heroBlock,
      ...editable.map((b, i) => ({ ...b, order: i + 1 })),
    ];
  };

  const handleSave = async () => {
    if (!user) return;
    if (!profileData.name.trim()) {
      setError("Display name is required.");
      setActiveTab("profile");
      return;
    }
    if (!profileData.bio.trim() && !existingProfile?.bio) {
      setError("Bio is required to unlock Products and Earnings.");
      setActiveTab("profile");
      return;
    }
    if (!profileData.categoryId && !existingProfile?.category_id) {
      setError("Select an area of expertise to unlock creator tools.");
      setActiveTab("profile");
      return;
    }
    setSaving(true);
    setError("");
    const blocksPayload = blocksForSave();
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
          storefront_blocks: blocksPayload,
          storefront_nav: isPro ? storefrontNav : parseStorefrontNav(null),
          hide_powered_by_sito: isPro ? hidePoweredBySito : false,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });

      if (profileError) {
        if (profileError.message?.includes("storefront_nav") || profileError.message?.includes("storefront_subheadline_color") || profileError.message?.includes("column")) {
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
            storefront_blocks: blocksPayload,
            updated_at: new Date().toISOString(),
          }, { onConflict: "id" });
          if (retryError) throw retryError;
          if (profileError.message?.includes("storefront_nav")) {
            setError("Nav settings need migration 060_storefront_pages_funnels.sql in Supabase. Other changes were saved.");
          }
        } else {
          throw profileError;
        }
      }
      setSavedSnapshot(buildDirtySnapshot(profileData, designSettings, storefrontBlocks, storefrontNav));
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
        className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8"
        style={
          designSettings.buttonColor
            ? { "--brand": designSettings.buttonColor, "--brand-color": designSettings.buttonColor } as React.CSSProperties
            : undefined
        }
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-50 mb-2">Storefront Builder</h1>
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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left - Editor Controls (2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="w-full overflow-x-auto overflow-y-hidden hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                <div className="flex whitespace-nowrap gap-2 border-b border-slate-700 pb-2 min-w-max">
                {(["profile", "design", "blocks", "pages"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      router.replace(`/dashboard/storefront?tab=${tab}`, { scroll: false });
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === tab ? "bg-slate-800 text-slate-50" : "text-slate-400 hover:text-slate-50"
                    }`}
                  >
                    {tab === "profile"
                      ? "Profile Info"
                      : tab === "design"
                        ? "Theme"
                        : tab === "blocks"
                          ? "Section Blocks"
                          : "Pages & Funnels"}
                  </button>
                ))}
                </div>
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
                    onRemoveBackground={() =>
                      setProfileData((p) => ({ ...p, storefrontBackgroundImageUrl: "" }))
                    }
                    uploadingBackground={uploadingBackground}
                    storefrontPublicUrl={storefrontPublicUrl}
                    slugCopied={slugCopied}
                    onCopyStorefrontUrl={handleCopyStorefrontUrl}
                  />
                )}

                {activeTab === "design" && (
                  <DesignTab
                    designSettings={designSettings}
                    isPro={isPro}
                    hidePoweredBySito={hidePoweredBySito}
                    onHidePoweredByChange={(next) => {
                      if (!isPro && next) {
                        setShowUpgradeModal(true);
                        return;
                      }
                      setHidePoweredBySito(next);
                    }}
                    onUpgradeClick={() => setShowUpgradeModal(true)}
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

                {activeTab === "pages" && user && (
                  <PagesFunnelsTab
                    isPro={isPro}
                    customSlug={profileData.customSlug}
                    navConfig={storefrontNav}
                    onNavChange={setStorefrontNav}
                    onUpgradeClick={() => setShowUpgradeModal(true)}
                    userId={user.id}
                  />
                )}
              </div>

              {error && (
                <div className="p-4 bg-red-900/30 border border-red-500/50 text-red-200 rounded-lg text-sm">{error}</div>
              )}

              <button
                onClick={handleSave}
                disabled={saving || !hasUnsavedChanges}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg font-semibold transition-colors disabled:bg-slate-700 disabled:text-slate-400 disabled:hover:bg-slate-700 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : hasUnsavedChanges ? "Save All Changes" : "No changes to save"}
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
                  hidePoweredBy={isPro && hidePoweredBySito}
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
  onRemoveBackground,
  uploadingBackground,
  storefrontPublicUrl,
  slugCopied,
  onCopyStorefrontUrl,
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
    heroOverlayOpacity: number;
    heroOverlayColor: string;
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
  onProfileChange: (field: string, value: string | string[] | boolean | number) => void;
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
  onRemoveBackground: () => void;
  uploadingBackground: boolean;
  storefrontPublicUrl: string;
  slugCopied: boolean;
  onCopyStorefrontUrl: () => void;
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
              className="min-h-[44px] px-4 py-3 sm:py-2 text-base bg-slate-800 border border-slate-700 text-slate-100 rounded-lg hover:bg-slate-700 disabled:opacity-50"
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
        <label className="block text-sm font-medium text-slate-200 mb-1">Storefront Cover Image</label>
        <p className="text-xs text-slate-500 mb-2">Recommended 1920×1080 (16:9). Shown as a wide banner on your public page.</p>
        <div className="flex flex-wrap items-center gap-4">
          {profileData.storefrontBackgroundImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profileData.storefrontBackgroundImageUrl} alt="Cover" className="w-32 h-[72px] rounded object-cover border-2 border-slate-700" />
          )}
          <div className="flex flex-wrap gap-2">
            <input ref={backgroundFileInputRef} type="file" accept="image/*" onChange={onBackgroundUpload} className="hidden" />
            <button
              type="button"
              onClick={() => backgroundFileInputRef.current?.click()}
              disabled={uploadingBackground}
              className="min-h-[44px] px-4 py-3 sm:py-2 text-base bg-slate-800 border border-slate-700 text-slate-100 rounded-lg hover:bg-slate-700 disabled:opacity-50"
            >
              {uploadingBackground ? "Uploading..." : profileData.storefrontBackgroundImageUrl ? "Change cover" : "Upload cover"}
            </button>
            {profileData.storefrontBackgroundImageUrl && (
              <button
                type="button"
                onClick={onRemoveBackground}
                className="min-h-[44px] px-4 py-3 sm:py-2 text-base border border-red-500/40 text-red-300 rounded-lg hover:bg-red-950/40"
              >
                Remove cover
              </button>
            )}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Cover overlay ({profileData.heroOverlayOpacity}%)
            </label>
            <input
              type="range"
              min={0}
              max={80}
              value={profileData.heroOverlayOpacity}
              onChange={(e) => onProfileChange("heroOverlayOpacity", Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Overlay color</label>
            <input
              type="color"
              value={profileData.heroOverlayColor}
              onChange={(e) => onProfileChange("heroOverlayColor", e.target.value)}
              className="h-10 w-16 cursor-pointer rounded border border-slate-700 bg-slate-950"
            />
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
          <label className="block text-sm font-medium text-slate-200 mb-1">Custom Slug</label>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm shrink-0">/s/</span>
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
          {profileData.customSlug.length >= 3 && storefrontPublicUrl && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
              <p className="min-w-0 flex-1 truncate text-xs text-slate-300" title={storefrontPublicUrl}>
                {storefrontPublicUrl}
              </p>
              <button
                type="button"
                onClick={onCopyStorefrontUrl}
                className="shrink-0 rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700"
              >
                {slugCopied ? "Copied!" : "Copy URL"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DesignTab({
  designSettings,
  isPro,
  hidePoweredBySito,
  onHidePoweredByChange,
  onUpgradeClick,
  onThemeSelect,
  onDesignChange,
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
  hidePoweredBySito: boolean;
  onHidePoweredByChange: (next: boolean) => void;
  onUpgradeClick: () => void;
  onThemeSelect: (theme: ThemePresetId) => void;
  onDesignChange: React.Dispatch<React.SetStateAction<typeof designSettings>>;
}) {
  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
        <h3 className="text-sm font-semibold text-slate-200">Storefront navigation</h3>
        <p className="mt-1 text-xs text-slate-500">
          Toggle Shop, Blog, and Free Guides links — and publish lead magnet landing pages — from the{" "}
          <span className="text-slate-300">Pages & Funnels</span> tab (Pro).
        </p>
      </section>
      <section className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Branding</h3>
            <p className="mt-1 text-xs text-slate-500">
              Hide the “Powered by Sito” footer badge (Pro Creator).
            </p>
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hidePoweredBySito}
              onChange={(e) => onHidePoweredByChange(e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500"
            />
            <span className="text-sm text-slate-300">Hide Powered by Sito badge</span>
          </label>
        </div>
        {!isPro && (
          <p className="mt-3 text-xs text-amber-200/90">
            Free plans show the badge.{" "}
            <button
              type="button"
              onClick={onUpgradeClick}
              className="font-semibold text-sky-400 hover:underline"
            >
              Upgrade to Pro
            </button>{" "}
            to remove it.
          </p>
        )}
      </section>

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
                    background: theme.backgroundColor,
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

      {/* Background color (cover image is managed under Profile Info) */}
      <section>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Background color</h3>
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
          <p className="text-xs text-slate-500">
            Cover photo is set under Profile Info → Storefront Cover Image.
          </p>
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
          const sortedBlocks = [...blocks]
            .filter((b) => b.type !== "hero" && b.type !== "social_media")
            .sort((a, b) => a.order - b.order);
          return sortedBlocks.map((block, idx) => {
            const isHeader = block.type === "header";
            const isLocked = isHeader;
            // Header stays at index 0; other blocks can reorder among themselves
            const canMoveUp = !isHeader && idx > 1;
            const canMoveDown = !isHeader && idx < sortedBlocks.length - 1;
          return (
          <div key={block.id} className={`p-4 bg-slate-950 border rounded-lg ${isHeader ? "border-indigo-500/40" : "border-slate-700"}`}>
            <div className="flex items-center justify-between">
              <span className="text-slate-200 font-medium capitalize">
                {block.type.replace(/_/g, " ")}
                {isHeader ? <span className="ml-2 text-xs text-indigo-400 font-normal">Pinned top</span> : null}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => onMoveBlock(block.id, "up")}
                  disabled={!canMoveUp}
                  className={`p-1.5 rounded hover:bg-slate-800 ${
                    canMoveUp ? "text-slate-100" : "text-slate-600 cursor-not-allowed"
                  }`}
                  aria-label="Move up"
                  title={
                    isHeader
                      ? "Header stays at the top"
                      : !canMoveUp
                        ? "Already at the top (below header)"
                        : "Move up"
                  }
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => onMoveBlock(block.id, "down")}
                  disabled={!canMoveDown}
                  className={`p-1.5 rounded hover:bg-slate-800 ${
                    canMoveDown ? "text-slate-100" : "text-slate-600 cursor-not-allowed"
                  }`}
                  aria-label="Move down"
                  title={
                    isHeader
                      ? "Header stays at the top"
                      : !canMoveDown
                        ? "Already at the bottom"
                        : "Move down"
                  }
                >
                  ↓
                </button>
                <button type="button" onClick={() => onEditBlock(editingBlock?.id === block.id ? null : block)} className="px-2 py-1 text-indigo-400 text-sm">
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveBlock(block.id)}
                  disabled={isLocked}
                  className="px-2 py-1 text-red-400 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  title={isLocked ? "Header cannot be removed" : undefined}
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

function LeadMagnetBlockEditor({
  data,
  onUpdate,
}: {
  data: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => void;
}) {
  const { user } = useAuth();
  const supabase = createClient();
  const [magnets, setMagnets] = useState<Array<{ id: string; title: string; subtitle: string | null }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const { data: rows } = await supabase
        .from("lead_magnets")
        .select("id, title, subtitle")
        .eq("expert_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      setMagnets(rows || []);
      setLoading(false);
    }
    load();
  }, [user, supabase]);

  const selectedId = (data.leadMagnetId as string) || "";

  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm text-slate-400">
        Choose a lead magnet from{" "}
        <a href="/dashboard/leads" className="text-indigo-400 hover:underline">
          Leads &amp; Marketing
        </a>
        . Title and form come from that asset.
      </p>
      {loading ? (
        <p className="text-sm text-slate-500">Loading magnets…</p>
      ) : magnets.length === 0 ? (
        <p className="text-sm text-amber-300/90">
          No lead magnets yet. Create one under Leads first, then select it here.
        </p>
      ) : (
        <div>
          <label className="mb-1 block text-slate-400 text-sm">Lead magnet</label>
          <select
            value={selectedId}
            onChange={(e) => {
              const m = magnets.find((x) => x.id === e.target.value);
              onUpdate({
                ...data,
                leadMagnetId: e.target.value,
                title: m?.title || data.title,
                subtitle: m?.subtitle || data.subtitle,
              });
            }}
            className={INPUT_CLASS}
          >
            <option value="">Select a lead magnet…</option>
            {magnets.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </div>
      )}
      {selectedId && (
        <p className="text-xs text-slate-500">
          Selected: {magnets.find((m) => m.id === selectedId)?.title || selectedId}
        </p>
      )}
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

  if (block.type === "hero") {
    const overlayOpacity = typeof data.overlayOpacity === "number" ? data.overlayOpacity : 45;
    const overlayColor = (data.overlayColor as string) || "#0f172a";
    const avatarPosition = (data.avatarPosition as string) || "left";
    return (
      <div className="mt-4 space-y-4">
        <div>
          <label className="block text-slate-400 text-sm mb-1">Hero banner (16:9)</label>
          {(data.imageUrl as string) && (
            <div className="relative mb-2 aspect-video w-full overflow-hidden rounded-lg">
              <Image src={data.imageUrl as string} alt="" fill className="object-cover" />
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            id="hero-banner-upload"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setImageTextUploading(true);
              setUploadError("");
              try {
                const url = await onImageUpload(file, "storefront/heroes");
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
            htmlFor="hero-banner-upload"
            className="inline-block cursor-pointer rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
          >
            {imageTextUploading ? "Uploading..." : (data.imageUrl as string) ? "Change image" : "Upload image"}
          </label>
          {uploadError && <p className="mt-1 text-xs text-red-400">{uploadError}</p>}
        </div>
        <div>
          <label className="block text-slate-400 text-sm mb-1">Overlay opacity ({overlayOpacity}%)</label>
          <input
            type="range"
            min={0}
            max={80}
            value={overlayOpacity}
            onChange={(e) => onUpdate({ ...data, overlayOpacity: Number(e.target.value) })}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-slate-400 text-sm mb-1">Overlay color</label>
          <input
            type="color"
            value={overlayColor}
            onChange={(e) => onUpdate({ ...data, overlayColor: e.target.value })}
            className="h-10 w-16 cursor-pointer rounded border border-slate-700 bg-slate-950"
          />
        </div>
        <div>
          <label className="block text-slate-400 text-sm mb-1">Avatar position on banner</label>
          <select
            value={avatarPosition}
            onChange={(e) => onUpdate({ ...data, avatarPosition: e.target.value })}
            className={INPUT_CLASS}
          >
            <option value="left">Bottom left</option>
            <option value="center">Bottom center</option>
          </select>
        </div>
      </div>
    );
  }
  if (block.type === "lead_magnet") {
    return <LeadMagnetBlockEditor data={data} onUpdate={onUpdate} />;
  }
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
    const items =
      (data.items as Array<{
        title: string;
        url: string;
        icon?: string;
        order: number;
        description?: string;
        thumbnailUrl?: string;
        emoji?: string;
        variant?: "card" | "button";
      }>) || [];
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
        {items.map((item, i) => {
          const variant = item.variant === "button" ? "button" : "card";
          return (
          <div key={i} className="bg-slate-900 border border-slate-700 p-4 rounded-lg space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-500 text-xs uppercase tracking-wide">Style</span>
              {(
                [
                  { id: "card" as const, label: "Link card" },
                  { id: "button" as const, label: "CTA button" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    const next = [...items];
                    next[i] = { ...next[i], variant: opt.id };
                    onUpdate({ ...data, items: next });
                  }}
                  className={`px-2.5 py-1 text-xs rounded ${
                    variant === opt.id ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={item.title || ""}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...next[i], title: e.target.value };
                onUpdate({ ...data, items: next });
              }}
              placeholder={variant === "button" ? "Button label (e.g. Book a call)" : "Title"}
              className={INPUT_CLASS}
            />
            <input
              type="url"
              value={item.url || ""}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...next[i], url: e.target.value };
                onUpdate({ ...data, items: next });
              }}
              placeholder="Button URL (https://…)"
              className={INPUT_CLASS}
            />
            {variant === "button" ? (
              <p className="text-xs text-slate-500">
                Renders as a clean text button using your storefront button style — no icon or thumbnail.
              </p>
            ) : (
              <>
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
                  className={`${INPUT_CLASS} w-20`}
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
                  className={`${INPUT_CLASS} resize-none`}
                />
                <div className="flex items-center gap-2">
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
                {uploadErrorIndex === i && uploadError && <p className="text-red-400 text-xs">{uploadError}</p>}
              </>
            )}
            <button
              type="button"
              onClick={() => onUpdate({ ...data, items: items.filter((_, j) => j !== i) })}
              className="text-red-400 text-sm"
            >
              Remove link
            </button>
          </div>
          );
        })}
        <button
          type="button"
          onClick={() =>
            onUpdate({
              ...data,
              items: [
                ...items,
                {
                  title: "",
                  url: "",
                  icon: "",
                  order: items.length,
                  description: "",
                  thumbnailUrl: "",
                  emoji: "",
                  variant: "button",
                },
              ],
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
    const displayMode = (data.displayMode as string) === "subpage" ? "subpage" : "inline";
    return (
      <div className="mt-4 space-y-4">
        <div>
          <label className="block text-slate-400 text-sm mb-1">Where to show products</label>
          <select
            value={displayMode}
            onChange={(e) => onUpdate({ ...data, displayMode: e.target.value })}
            className={INPUT_CLASS}
          >
            <option value="inline">On main storefront page</option>
            <option value="subpage">On a separate /shop subpage</option>
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Subpage mode shows a “View shop” button on your main page and lists products at /s/your-slug/shop.
          </p>
        </div>
        <div>
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
  if (block.type === "blog") {
    const title = (data.title as string) || "Latest posts";
    const limit = typeof data.limit === "number" ? data.limit : 6;
    return (
      <div className="mt-4 space-y-3">
        <div>
          <label className="mb-1 block text-sm text-slate-400">Section title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => onUpdate({ ...data, title: e.target.value })}
            className={INPUT_CLASS}
            placeholder="Latest posts"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-400">Max posts to show</label>
          <select
            value={limit}
            onChange={(e) => onUpdate({ ...data, limit: Number(e.target.value) })}
            className={INPUT_CLASS}
          >
            {[3, 4, 6, 9, 12].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-slate-500">
          Shows your published Sharing Posts on the storefront.
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
