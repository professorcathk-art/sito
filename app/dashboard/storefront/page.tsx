"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StorefrontPreview } from "@/components/storefront-preview";
import { UpgradeModal } from "@/components/upgrade-modal";

interface StorefrontSettings {
  themePreset: string;
  customBrandColor?: string;
  buttonStyle: string;
  customLinks: Array<{ title: string; url: string; icon?: string; order: number }>;
  showProducts: boolean;
  showAppointments: boolean;
  showBlog: boolean;
  bioOverride?: string;
}

interface ExpertData {
  name: string;
  bio: string;
  avatar_url?: string;
  verified: boolean;
  custom_slug?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  pricing_type: string;
}

export default function StorefrontEditorPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expertData, setExpertData] = useState<ExpertData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isPro, setIsPro] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [settings, setSettings] = useState<StorefrontSettings>({
    themePreset: "default",
    customBrandColor: undefined,
    buttonStyle: "rounded-md",
    customLinks: [],
    showProducts: true,
    showAppointments: true,
    showBlog: true,
    bioOverride: undefined,
  });

  useEffect(() => {
    async function loadData() {
      if (!user) return;

      try {
        // Load expert profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, bio, avatar_url, verified, custom_slug, is_pro_store, storefront_theme_preset, storefront_custom_brand_color, storefront_button_style, storefront_custom_links, storefront_show_products, storefront_show_appointments, storefront_show_blog, storefront_bio_override")
          .eq("id", user.id)
          .single();

        if (profile) {
          setExpertData({
            name: profile.name || "Expert",
            bio: profile.bio || "",
            avatar_url: profile.avatar_url,
            verified: profile.verified || false,
            custom_slug: profile.custom_slug,
          });

          setIsPro(profile.is_pro_store || false);

          // Load storefront settings
          setSettings({
            themePreset: profile.storefront_theme_preset || "default",
            customBrandColor: profile.storefront_custom_brand_color || undefined,
            buttonStyle: profile.storefront_button_style || "rounded-md",
            customLinks: (profile.storefront_custom_links as any) || [],
            showProducts: profile.storefront_show_products !== false,
            showAppointments: profile.storefront_show_appointments !== false,
            showBlog: profile.storefront_show_blog !== false,
            bioOverride: profile.storefront_bio_override || undefined,
          });
        }

        // Load products
        const { data: productsData } = await supabase
          .from("products")
          .select("id, name, price, pricing_type")
          .eq("expert_id", user.id)
          .limit(10);

        if (productsData) {
          setProducts(productsData);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user, supabase]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          storefront_theme_preset: settings.themePreset,
          storefront_custom_brand_color: settings.customBrandColor || null,
          storefront_button_style: settings.buttonStyle,
          storefront_custom_links: settings.customLinks,
          storefront_show_products: settings.showProducts,
          storefront_show_appointments: settings.showAppointments,
          storefront_show_blog: settings.showBlog,
          storefront_bio_override: settings.bioOverride || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      alert("Storefront settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleThemeSelect = (theme: string) => {
    if (theme === "midnight-glass" && !isPro) {
      setShowUpgradeModal(true);
      return;
    }
    setSettings({ ...settings, themePreset: theme });
  };

  const handleAddLink = () => {
    const newLink = {
      title: "",
      url: "",
      icon: "",
      order: settings.customLinks.length,
    };
    setSettings({
      ...settings,
      customLinks: [...settings.customLinks, newLink],
    });
  };

  const handleUpdateLink = (index: number, field: string, value: string) => {
    const updated = [...settings.customLinks];
    updated[index] = { ...updated[index], [field]: value };
    setSettings({ ...settings, customLinks: updated });
  };

  const handleRemoveLink = (index: number) => {
    const updated = settings.customLinks.filter((_, i) => i !== index);
    setSettings({ ...settings, customLinks: updated });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-800 rounded w-1/3"></div>
            <div className="h-64 bg-slate-800 rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-50 mb-2">Storefront Editor</h1>
            <p className="text-slate-400">
              Customize your Link-in-Bio storefront. {expertData?.custom_slug && (
                <span>Preview at: <a href={`/s/${expertData.custom_slug}`} target="_blank" className="text-indigo-400 hover:text-indigo-300 underline">sito.club/s/{expertData.custom_slug}</a></span>
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Side - Editor Controls */}
            <div className="space-y-6">
              {/* Theme Selector */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-slate-50 mb-4">Theme</h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "default", name: "Default", pro: false },
                    { id: "midnight-glass", name: "Midnight Glass", pro: true },
                    { id: "minimal-light", name: "Minimal Light", pro: false },
                    { id: "bold-dark", name: "Bold Dark", pro: false },
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => handleThemeSelect(theme.id)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        settings.themePreset === theme.id
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-slate-700 hover:border-slate-600"
                      } ${theme.pro && !isPro ? "opacity-60" : ""}`}
                    >
                      <div className="text-slate-50 font-medium">{theme.name}</div>
                      {theme.pro && (
                        <div className="text-xs text-slate-400 mt-1">⭐ PRO</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brand Color */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-slate-50 mb-4">Brand Color</h2>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={settings.customBrandColor || "#6366f1"}
                    onChange={(e) => setSettings({ ...settings, customBrandColor: e.target.value })}
                    className="w-16 h-16 rounded-lg border border-slate-700 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.customBrandColor || ""}
                    onChange={(e) => setSettings({ ...settings, customBrandColor: e.target.value })}
                    placeholder="#6366f1"
                    className="flex-1 px-4 py-2 bg-slate-950 border border-slate-700 text-slate-100 rounded-lg placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* Button Style */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-slate-50 mb-4">Button Style</h2>
                <div className="grid grid-cols-2 gap-3">
                  {["rounded-full", "rounded-md", "hard-edge", "outline"].map((style) => (
                    <button
                      key={style}
                      onClick={() => setSettings({ ...settings, buttonStyle: style })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        settings.buttonStyle === style
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      <div className="text-slate-50 text-sm capitalize">{style.replace("-", " ")}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bio Override */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-slate-50 mb-4">Storefront Bio</h2>
                <textarea
                  value={settings.bioOverride || ""}
                  onChange={(e) => setSettings({ ...settings, bioOverride: e.target.value })}
                  placeholder="Custom bio for storefront (optional)"
                  rows={4}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-700 text-slate-100 rounded-lg placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>

              {/* Custom Links */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-slate-50">Custom Links</h2>
                  <button
                    onClick={handleAddLink}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition-colors text-sm"
                  >
                    + Add Link
                  </button>
                </div>
                <div className="space-y-3">
                  {settings.customLinks.map((link, index) => (
                    <div key={index} className="p-4 bg-slate-950 border border-slate-700 rounded-lg space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={link.title}
                          onChange={(e) => handleUpdateLink(index, "title", e.target.value)}
                          placeholder="Link title"
                          className="px-3 py-2 bg-slate-950 border border-slate-700 text-slate-100 rounded-lg placeholder-slate-500 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                        <input
                          type="text"
                          value={link.url}
                          onChange={(e) => handleUpdateLink(index, "url", e.target.value)}
                          placeholder="https://..."
                          className="px-3 py-2 bg-slate-950 border border-slate-700 text-slate-100 rounded-lg placeholder-slate-500 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={link.icon || ""}
                          onChange={(e) => handleUpdateLink(index, "icon", e.target.value)}
                          placeholder="Icon emoji"
                          className="px-3 py-2 bg-slate-950 border border-slate-700 text-slate-100 rounded-lg placeholder-slate-500 text-sm w-20 focus:border-indigo-500 outline-none"
                        />
                        <button
                          onClick={() => handleRemoveLink(index)}
                          className="px-3 py-2 bg-red-900/30 border border-red-500/50 text-red-200 rounded-lg text-sm hover:bg-red-900/50 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-slate-50 mb-4">Display Options</h2>
                <div className="space-y-3">
                  {[
                    { key: "showProducts", label: "Show Products" },
                    { key: "showAppointments", label: "Show Appointments" },
                    { key: "showBlog", label: "Show Blog Posts" },
                  ].map((option) => (
                    <label key={option.key} className="flex items-center justify-between cursor-pointer">
                      <span className="text-slate-50">{option.label}</span>
                      <input
                        type="checkbox"
                        checked={settings[option.key as keyof StorefrontSettings] as boolean}
                        onChange={(e) =>
                          setSettings({ ...settings, [option.key]: e.target.checked })
                        }
                        className="w-12 h-6 bg-slate-950 border border-slate-700 rounded-full appearance-none relative cursor-pointer checked:bg-indigo-600 transition-colors"
                        style={{
                          background: (settings[option.key as keyof StorefrontSettings] as boolean)
                            ? settings.customBrandColor || undefined
                            : undefined,
                        }}
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>

            {/* Right Side - Live Preview */}
            <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
              <StorefrontPreview
                themePreset={settings.themePreset}
                customBrandColor={settings.customBrandColor}
                buttonStyle={settings.buttonStyle}
                customLinks={settings.customLinks}
                showProducts={settings.showProducts}
                showAppointments={settings.showAppointments}
                showBlog={settings.showBlog}
                bioOverride={settings.bioOverride}
                expertName={expertData?.name || "Expert"}
                expertBio={expertData?.bio || ""}
                expertAvatar={expertData?.avatar_url}
                verified={expertData?.verified || false}
                products={products}
              />
            </div>
          </div>
        </div>
      </div>

      {showUpgradeModal && (
        <UpgradeModal onClose={() => setShowUpgradeModal(false)} />
      )}
    </DashboardLayout>
  );
}
