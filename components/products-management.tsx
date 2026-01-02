"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  pricing_type: "one-off" | "hourly";
  created_at: string;
}

interface ProductInterest {
  id: string;
  product_id: string;
  product_name: string;
  user_id: string;
  user_email: string;
  user_name: string;
  country_code?: string;
  phone_number?: string;
  created_at: string;
}

export function ProductsManagement() {
  const { user } = useAuth();
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [interests, setInterests] = useState<ProductInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    pricing_type: "one-off" as "one-off" | "hourly",
  });
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"products" | "interests">("products");
  const [descriptionMode, setDescriptionMode] = useState<"edit" | "preview">("edit");

  useEffect(() => {
    if (user) {
      fetchProducts();
    }
  }, [user]);

  const fetchProducts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("expert_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (err: any) {
      console.error("Error fetching products:", err);
      setError(err.message || "Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  const fetchInterests = async () => {
    if (!user) {
      setInterests([]);
      return;
    }
    
    // Wait for products to be loaded
    if (products.length === 0) {
      setInterests([]);
      return;
    }
    
    try {
      console.log("Fetching interests for products:", products.map(p => p.id));
      const productIds = products.map((p) => p.id);
      
      // First, get all interests for the expert's products
      const { data, error } = await supabase
        .from("product_interests")
        .select(`
          id,
          product_id,
          user_id,
          user_email,
          country_code,
          phone_number,
          created_at,
          products!inner(name, expert_id)
        `)
        .in("product_id", productIds)
        .eq("products.expert_id", user.id);

      if (error) {
        console.error("Error fetching interests:", error);
        // If no interests found, that's okay
        if (error.code !== "PGRST116") {
          throw error;
        }
        setInterests([]);
        return;
      }

      console.log("Interests fetched:", data?.length || 0);

      // Fetch user names separately if we have user IDs
      const userIds = Array.from(new Set((data || []).map((item: any) => item.user_id)));
      let userNameMap: { [key: string]: string } = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", userIds);
        
        if (profilesData) {
          profilesData.forEach((profile: any) => {
            userNameMap[profile.id] = profile.name || "Unknown User";
          });
        }
      }

      const interestsData = (data || []).map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.products?.name || "Unknown Product",
        user_id: item.user_id,
        user_email: item.user_email,
        user_name: userNameMap[item.user_id] || "Unknown User",
        country_code: item.country_code || undefined,
        phone_number: item.phone_number || undefined,
        created_at: item.created_at,
      }));

      setInterests(interestsData);
    } catch (err: any) {
      console.error("Error fetching interests:", err);
      setInterests([]);
    }
  };

  useEffect(() => {
    if (activeTab === "interests") {
      fetchInterests();
    }
  }, [activeTab, products, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!user) return;

    if (!formData.name || !formData.description || !formData.price) {
      setError("Please fill in all fields");
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      setError("Please enter a valid price");
      return;
    }

    try {
      if (editingProduct) {
        // Update existing product
        const { error } = await supabase
          .from("products")
          .update({
            name: formData.name,
            description: formData.description,
            price: price,
            pricing_type: formData.pricing_type,
          })
          .eq("id", editingProduct.id)
          .eq("expert_id", user.id);

        if (error) throw error;
      } else {
        // Create new product
        const { error } = await supabase.from("products").insert({
          expert_id: user.id,
          name: formData.name,
          description: formData.description,
          price: price,
          pricing_type: formData.pricing_type,
        });

        if (error) throw error;
      }

      setFormData({
        name: "",
        description: "",
        price: "",
        pricing_type: "one-off",
      });
      setShowAddForm(false);
      setEditingProduct(null);
      fetchProducts();
      if (activeTab === "interests") {
        fetchInterests();
      }
    } catch (err: any) {
      setError(err.message || "Failed to save product");
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      pricing_type: product.pricing_type,
    });
    setShowAddForm(true);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    if (!user) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId)
        .eq("expert_id", user.id);

      if (error) throw error;
      fetchProducts();
      if (activeTab === "interests") {
        fetchInterests();
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete product");
    }
  };

  const downloadInterestsCSV = () => {
    if (interests.length === 0) {
      alert("No interests to download");
      return;
    }

    const headers = ["Product Name", "User Name", "User Email", "Phone Number", "Registered Date"];
    const rows = interests.map((interest) => [
      interest.product_name,
      interest.user_name,
      interest.user_email,
      interest.country_code && interest.phone_number 
        ? `${interest.country_code} ${interest.phone_number}` 
        : interest.phone_number || "",
      new Date(interest.created_at).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `product-interests-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-dark-green-800/50 rounded"></div>
        <div className="h-32 bg-dark-green-800/50 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-custom-text">Products & Services</h2>
        {activeTab === "products" && (
          <button
            onClick={() => {
              setShowAddForm(true);
              setEditingProduct(null);
              setFormData({
                name: "",
                description: "",
                price: "",
                pricing_type: "one-off",
              });
            }}
            className="bg-cyber-green text-custom-text px-4 py-2 rounded-lg font-semibold hover:bg-cyber-green-light transition-colors shadow-[0_0_15px_rgba(0,255,136,0.3)]"
          >
            + Add Product
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-cyber-green/30">
        <button
          onClick={() => setActiveTab("products")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "products"
              ? "text-cyber-green border-b-2 border-cyber-green"
              : "text-custom-text/70 hover:text-custom-text"
          }`}
        >
          My Products ({products.length})
        </button>
        <button
          onClick={() => setActiveTab("interests")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "interests"
              ? "text-cyber-green border-b-2 border-cyber-green"
              : "text-custom-text/70 hover:text-custom-text"
          }`}
        >
          Registered Interests ({interests.length})
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-500/50 text-red-200 rounded-lg">
          {error}
        </div>
      )}

      {/* Add/Edit Product Form */}
      {showAddForm && activeTab === "products" && (
        <div className="bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 rounded-xl p-6">
          <h3 className="text-xl font-bold text-custom-text mb-4">
            {editingProduct ? "Edit Product" : "Add New Product"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-custom-text mb-2">
                Product Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg focus:ring-2 focus:ring-cyber-green focus:border-cyber-green text-custom-text placeholder-custom-text/50"
                placeholder="e.g., 1-on-1 Consultation"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-custom-text">
                  Description * <span className="text-xs text-custom-text/60">(HTML supported)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setDescriptionMode(descriptionMode === "edit" ? "preview" : "edit")}
                  className="px-3 py-1 text-xs font-medium bg-dark-green-800/50 border border-cyber-green/30 rounded-lg text-custom-text hover:bg-dark-green-800 hover:border-cyber-green transition-colors"
                >
                  {descriptionMode === "edit" ? "Preview" : "Edit"}
                </button>
              </div>
              {descriptionMode === "edit" ? (
                <>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    rows={6}
                    className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg focus:ring-2 focus:ring-cyber-green focus:border-cyber-green text-custom-text placeholder-custom-text/50 font-mono text-sm"
                    placeholder="Describe your product or service... HTML code is supported (e.g., &lt;strong&gt;bold&lt;/strong&gt;, &lt;a href=&quot;...&quot;&gt;links&lt;/a&gt;)"
                  />
                  <p className="mt-1 text-xs text-custom-text/60">
                    You can use HTML tags like &lt;strong&gt;, &lt;em&gt;, &lt;a&gt;, &lt;ul&gt;, &lt;li&gt;, etc.
                  </p>
                </>
              ) : (
                <div className="w-full min-h-[150px] px-4 py-3 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg">
                  {formData.description ? (
                    <div 
                      className="text-custom-text/80"
                      style={{
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word',
                      }}
                    >
                      <div 
                        className="product-preview"
                        dangerouslySetInnerHTML={{ __html: formData.description }}
                      />
                    </div>
                  ) : (
                    <p className="text-custom-text/50 italic">No description entered yet. Click &quot;Edit&quot; to add content.</p>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-custom-text mb-2">
                  Price *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg focus:ring-2 focus:ring-cyber-green focus:border-cyber-green text-custom-text placeholder-custom-text/50"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-custom-text mb-2">
                  Pricing Type *
                </label>
                <select
                  value={formData.pricing_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pricing_type: e.target.value as "one-off" | "hourly",
                    })
                  }
                  className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg focus:ring-2 focus:ring-cyber-green focus:border-cyber-green text-custom-text"
                >
                  <option value="one-off">One-off</option>
                  <option value="hourly">Hourly</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                type="submit"
                className="bg-cyber-green text-custom-text px-6 py-2 rounded-lg font-semibold hover:bg-cyber-green-light transition-colors shadow-[0_0_15px_rgba(0,255,136,0.3)]"
              >
                {editingProduct ? "Update Product" : "Add Product"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingProduct(null);
                  setFormData({
                    name: "",
                    description: "",
                    price: "",
                    pricing_type: "one-off",
                  });
                }}
                className="px-6 py-2 border border-cyber-green/30 text-custom-text rounded-lg hover:bg-dark-green-800/50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products List */}
      {activeTab === "products" && (
        <div className="space-y-4">
          {products.length === 0 ? (
            <div className="text-center py-12 bg-dark-green-800/30 border border-cyber-green/30 rounded-xl">
              <p className="text-custom-text/70 mb-4">No products yet. Add your first product to get started!</p>
            </div>
          ) : (
            products.map((product) => (
              <div
                key={product.id}
                className="bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 rounded-xl p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-custom-text mb-2">{product.name}</h3>
                    <p className="text-custom-text/80 mb-3">{product.description}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-cyber-green font-semibold">
                        USD ${product.price} {product.pricing_type === "hourly" ? "/ hour" : ""}
                      </span>
                      <span className="text-custom-text/60">
                        {product.pricing_type === "hourly" ? "Hourly Rate" : "One-off Price"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(product)}
                      className="px-4 py-2 bg-dark-green-800/50 text-custom-text border border-cyber-green/30 rounded-lg hover:bg-dark-green-800 hover:border-cyber-green transition-colors text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="px-4 py-2 bg-red-900/30 text-red-200 border border-red-500/50 rounded-lg hover:bg-red-900/50 transition-colors text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Interests List */}
      {activeTab === "interests" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-custom-text/80">
              Users who registered interest in your products
            </p>
            {interests.length > 0 && (
              <button
                onClick={downloadInterestsCSV}
                className="bg-cyber-green text-custom-text px-4 py-2 rounded-lg font-semibold hover:bg-cyber-green-light transition-colors shadow-[0_0_15px_rgba(0,255,136,0.3)] text-sm"
              >
                Download CSV
              </button>
            )}
          </div>
          {interests.length === 0 ? (
            <div className="text-center py-12 bg-dark-green-800/30 border border-cyber-green/30 rounded-xl">
              <p className="text-custom-text/70">No interests registered yet.</p>
            </div>
          ) : (
            <div className="bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-dark-green-900/50 border-b border-cyber-green/30">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-custom-text">Product</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-custom-text">User Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-custom-text">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-custom-text">Phone</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-custom-text">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {interests.map((interest) => (
                    <tr
                      key={interest.id}
                      className="border-b border-cyber-green/10 hover:bg-dark-green-900/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-custom-text">{interest.product_name}</td>
                      <td className="px-4 py-3 text-sm text-custom-text">{interest.user_name}</td>
                      <td className="px-4 py-3 text-sm text-custom-text">{interest.user_email}</td>
                      <td className="px-4 py-3 text-sm text-custom-text/70">
                        {interest.country_code && interest.phone_number 
                          ? `${interest.country_code} ${interest.phone_number}` 
                          : interest.phone_number || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-custom-text/70">
                        {new Date(interest.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

