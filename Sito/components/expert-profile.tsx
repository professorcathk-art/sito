"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";

interface Expert {
  id: string;
  name: string;
  title: string;
  category: string;
  bio: string;
  location: string;
  website?: string;
  linkedin?: string;
  verified: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  pricing_type: "one-off" | "hourly";
}

export function ExpertProfile({ expertId }: { expertId: string }) {
  const [expert, setExpert] = useState<Expert | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<"none" | "pending" | "accepted" | "rejected">("none");
  const [connecting, setConnecting] = useState(false);
  const [registeringInterest, setRegisteringInterest] = useState<string | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const supabase = createClient();
  const { user } = useAuth();

  useEffect(() => {
    async function fetchExpert() {
      try {
        // Build query - allow viewing if listed OR if it's the user's own profile
        let query = supabase
          .from("profiles")
          .select(`
            id,
            name,
            title,
            bio,
            website,
            linkedin,
            verified,
            listed_on_marketplace,
            categories(name),
            countries(name)
          `)
          .eq("id", expertId);

        // If not viewing own profile, only show if listed
        if (!user || user.id !== expertId) {
          query = query.eq("listed_on_marketplace", true);
        }

        const { data, error } = await query.single();

        if (error) {
          console.error("Error fetching expert:", error);
          setExpert(null);
        } else if (data) {
          setExpert({
            id: data.id,
            name: data.name || "Anonymous",
            title: data.title || "",
            category: (data.categories as any)?.name || "",
            bio: data.bio || "",
            location: (data.countries as any)?.name || "",
            website: data.website || undefined,
            linkedin: data.linkedin || undefined,
            verified: data.verified || false,
          });
        } else {
          setExpert(null);
        }
      } catch (error) {
        console.error("Error:", error);
        setExpert(null);
      } finally {
        setLoading(false);
      }
    }

    if (expertId) {
      fetchExpert();
      fetchProducts();
    }
  }, [expertId, supabase, user]);

  const fetchProducts = async () => {
    if (!expertId) return;
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("expert_id", expertId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleRegisterInterest = async (productId: string) => {
    if (!user) {
      // Redirect to login page with return URL
      const currentUrl = window.location.pathname + window.location.search;
      window.location.href = `/login?redirect=${encodeURIComponent(currentUrl)}`;
      return;
    }

    setRegisteringInterest(productId);
    try {
      // Get user email
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser?.email) {
        throw new Error("User email not found");
      }

      const { error } = await supabase.from("product_interests").insert({
        product_id: productId,
        user_id: user.id,
        user_email: authUser.email,
      });

      if (error) {
        if (error.code === "23505") {
          alert("You have already registered interest in this product");
        } else {
          throw error;
        }
      } else {
        alert("Interest registered! The expert will be notified.");
        
        // Send email notification
        await fetch("/api/notify-product-interest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId,
            expertId,
            userId: user.id,
            userEmail: authUser.email,
          }),
        });
      }
    } catch (err: any) {
      console.error("Error registering interest:", err);
      alert("Failed to register interest. Please try again.");
    } finally {
      setRegisteringInterest(null);
    }
  };

  // Check connection status
  useEffect(() => {
    async function checkConnectionStatus() {
      if (!user || !expert || user.id === expert.id) {
        setConnectionStatus("none");
        return;
      }

      try {
        // Check if user has sent a connection request to this expert
        const { data: sentConnection } = await supabase
          .from("connections")
          .select("status")
          .eq("user_id", user.id)
          .eq("expert_id", expert.id)
          .single();

        if (sentConnection) {
          setConnectionStatus(sentConnection.status as "pending" | "accepted" | "rejected");
        } else {
          // Check if expert has sent a connection request to user
          const { data: receivedConnection } = await supabase
            .from("connections")
            .select("status")
            .eq("user_id", expert.id)
            .eq("expert_id", user.id)
            .single();

          if (receivedConnection) {
            setConnectionStatus(receivedConnection.status === "accepted" ? "accepted" : "none");
          } else {
            setConnectionStatus("none");
          }
        }
      } catch (error) {
        // No connection found
        setConnectionStatus("none");
      }
    }

    if (expert && user) {
      checkConnectionStatus();
    }
  }, [expert, user, supabase]);

  const handleConnect = async () => {
    if (!user || !expert || user.id === expert.id) {
      return;
    }

    setConnecting(true);
    try {
      const { error } = await supabase
        .from("connections")
        .insert({
          user_id: user.id,
          expert_id: expert.id,
          status: "pending",
        });

      if (error) {
        if (error.code === "23505") {
          // Unique constraint violation - connection already exists
          alert("Connection request already sent");
        } else {
          throw error;
        }
      } else {
        setConnectionStatus("pending");
        
        // Send email notification to expert
        try {
          const { data: userProfile } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", user.id)
            .single();

          await fetch("/api/notify-connection", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              expert_id: expert.id,
              user_name: userProfile?.name || "Someone",
            }),
          });
        } catch (emailError) {
          console.error("Failed to send email notification:", emailError);
          // Don't fail the connection request if email fails
        }
        
        alert("Connection request sent!");
      }
    } catch (error: any) {
      console.error("Error sending connection request:", error);
      alert("Failed to send connection request. Please try again.");
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 rounded-2xl shadow-lg p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-dark-green-800/50 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-dark-green-800/50 rounded w-1/2 mb-8"></div>
            <div className="h-32 bg-dark-green-800/50 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!expert) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 rounded-2xl shadow-lg p-8 text-center">
          <p className="text-custom-text/80">Expert not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 rounded-2xl shadow-lg p-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-custom-text">{expert.name}</h1>
              {expert.verified && (
                <span className="text-cyber-green text-xl animate-pulse-glow" title="Verified Expert">
                  ✓
                </span>
              )}
            </div>
            <p className="text-xl text-custom-text/80 mb-2">{expert.title}</p>
            <div className="flex items-center gap-4 text-custom-text/70">
              {expert.category && (
                <span className="text-xs text-cyber-green bg-dark-green-900/50 px-2 py-1 rounded-full border border-cyber-green/30">
                  {expert.category}
                </span>
              )}
              {expert.location && <span>{expert.location}</span>}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold text-custom-text mb-3">About</h2>
          <p className="text-custom-text/90 leading-relaxed">{expert.bio}</p>
        </div>

        {(expert.website || expert.linkedin) && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-custom-text mb-3">Links</h2>
            <div className="flex flex-wrap gap-4">
              {expert.website && (
                <a
                  href={expert.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyber-green hover:text-cyber-green-light underline transition-colors"
                >
                  Website
                </a>
              )}
              {expert.linkedin && (
                <a
                  href={expert.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyber-green hover:text-cyber-green-light underline transition-colors"
                >
                  LinkedIn
                </a>
              )}
            </div>
          </div>
        )}

        {/* Products Section */}
        {loadingProducts ? (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-custom-text mb-3">Products & Services</h2>
            <div className="animate-pulse space-y-4">
              <div className="h-24 bg-dark-green-800/50 rounded-xl"></div>
            </div>
          </div>
        ) : products.length > 0 ? (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-custom-text mb-4">Products & Services</h2>
            <div className="space-y-4">
              {products.map((product) => {
                const isExpanded = expandedProducts.has(product.id);
                return (
                  <div
                    key={product.id}
                    className="bg-dark-green-900/30 border border-cyber-green/30 rounded-xl p-6"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-custom-text mb-2">{product.name}</h3>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-cyber-green font-semibold">
                            USD ${product.price} {product.pricing_type === "hourly" ? "/ hour" : ""}
                          </span>
                          <span className="text-custom-text/60 text-sm">
                            {product.pricing_type === "hourly" ? "Hourly Rate" : "One-off Price"}
                          </span>
                        </div>
                        {isExpanded && (
                          <div 
                            className="text-custom-text/80 mb-3 product-preview"
                            dangerouslySetInnerHTML={{ __html: product.description }}
                          />
                        )}
                        <button
                          onClick={() => {
                            const newExpanded = new Set(expandedProducts);
                            if (isExpanded) {
                              newExpanded.delete(product.id);
                            } else {
                              newExpanded.add(product.id);
                            }
                            setExpandedProducts(newExpanded);
                          }}
                          className="text-cyber-green hover:text-cyber-green-light text-sm font-medium transition-colors mb-3"
                        >
                          {isExpanded ? "Hide Details" : "View Full Details"}
                        </button>
                      </div>
                    </div>
                    {user?.id !== expertId && (
                      <button
                        onClick={() => handleRegisterInterest(product.id)}
                        disabled={registeringInterest === product.id}
                        className="w-full bg-cyber-green text-custom-text py-2 rounded-lg font-semibold hover:bg-cyber-green-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(0,255,136,0.3)]"
                      >
                        {registeringInterest === product.id 
                          ? "Registering..." 
                          : user 
                          ? "Register Your Interest" 
                          : "Sign in to Register Interest"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="flex gap-4 pt-6 border-t border-cyber-green/30">
          <Link
            href={`/messages?expert=${expert.id}`}
            className="flex-1 bg-cyber-green text-custom-text py-3 rounded-lg font-semibold hover:bg-cyber-green-light transition-colors text-center shadow-[0_0_15px_rgba(0,255,136,0.3)]"
          >
            Send Message
          </Link>
          {user && user.id !== expert.id && (
            <button
              onClick={handleConnect}
              disabled={connecting || connectionStatus !== "none"}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                connectionStatus === "pending"
                  ? "border border-cyber-green/50 text-cyber-green bg-dark-green-900/30 cursor-not-allowed"
                  : connectionStatus === "accepted"
                  ? "border border-cyber-green text-cyber-green bg-dark-green-900/30 cursor-not-allowed"
                  : "border border-cyber-green/30 text-custom-text hover:bg-dark-green-800/50 hover:border-cyber-green"
              }`}
            >
              {connecting
                ? "Connecting..."
                : connectionStatus === "pending"
                ? "Pending"
                : connectionStatus === "accepted"
                ? "Connected"
                : "Connect"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

