"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { BlogPostsList } from "@/components/blog-posts-list";
import { ExpertCourses } from "@/components/expert-courses";
import { SubscribeButton } from "@/components/subscribe-button";

interface Expert {
  id: string;
  name: string;
  title: string;
  category: string;
  bio: string;
  location: string;
  website?: string;
  linkedin?: string;
  instagram_url?: string;
  verified: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  pricing_type: "one-off" | "hourly";
}

interface AppointmentSlot {
  id: string;
  start_time: string;
  end_time: string;
  rate_per_hour: number;
  is_available: boolean;
}

export function ExpertProfile({ expertId }: { expertId: string }) {
  const [expert, setExpert] = useState<Expert | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [appointmentSlots, setAppointmentSlots] = useState<AppointmentSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<"none" | "pending" | "accepted" | "rejected">("none");
  const [connecting, setConnecting] = useState(false);
  const [registeringInterest, setRegisteringInterest] = useState<string | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [showInterestForm, setShowInterestForm] = useState<string | null>(null);
  const [interestFormData, setInterestFormData] = useState({
    countryCode: "",
    phoneNumber: "",
  });
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
            instagram_url,
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
            instagram_url: data.instagram_url || undefined,
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
      fetchAppointmentSlots();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expertId, supabase, user]);

  const fetchAppointmentSlots = async () => {
    try {
      const { data, error } = await supabase
        .from("appointment_slots")
        .select("*")
        .eq("expert_id", expertId)
        .eq("is_available", true)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(5);

      if (error) throw error;
      setAppointmentSlots(data || []);
    } catch (err) {
      console.error("Error fetching appointment slots:", err);
    } finally {
      setLoadingSlots(false);
    }
  };

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

    // Show form to collect phone number (optional)
    setShowInterestForm(productId);
  };

  const handleSubmitInterest = async (productId: string) => {
    if (!user) {
      alert("Please sign in to register interest");
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
        country_code: interestFormData.countryCode || null,
        phone_number: interestFormData.phoneNumber || null,
      });

      if (error) {
        if (error.code === "23505") {
          alert("You have already registered interest in this product");
        } else {
          throw error;
        }
      } else {
        alert("Interest registered! The expert will be notified.");
        setShowInterestForm(null);
        setInterestFormData({ countryCode: "", phoneNumber: "" });
        
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
                <span className="text-cyber-green text-xl" title="Verified Expert">
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

        {/* Appointment Slots Section */}
        {appointmentSlots.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-custom-text mb-4">Available Appointment Slots</h2>
            <div className="space-y-3 mb-4">
              {appointmentSlots.slice(0, 3).map((slot) => {
                const startDate = new Date(slot.start_time);
                const endDate = new Date(slot.end_time);
                const duration = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60)));
                const total = duration > 0 ? (slot.rate_per_hour * duration) / 60 : 0;
                
                return (
                  <div
                    key={slot.id}
                    className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-custom-text font-semibold">
                          {startDate.toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })} - {endDate.toLocaleString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                        <p className="text-custom-text/70 text-sm">
                          {duration} minutes • ${slot.rate_per_hour}/hour • Total: ${total.toFixed(2)}
                        </p>
                      </div>
                      {user && user.id !== expert.id ? (
                        <Link
                          href={`/appointments/book/${expert.id}?slot=${slot.id}`}
                          className="px-4 py-2 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors text-sm"
                        >
                          Book Now
                        </Link>
                      ) : !user ? (
                        <Link
                          href={`/login?redirect=/appointments/book/${expert.id}?slot=${slot.id}`}
                          className="px-4 py-2 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors text-sm"
                        >
                          Sign In to Book
                        </Link>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
            {appointmentSlots.length > 3 && (
              <Link
                href={`/appointments/book/${expert.id}`}
                className="text-cyber-green hover:text-cyber-green-light text-sm font-medium"
              >
                View all {appointmentSlots.length} available slots →
              </Link>
            )}
          </div>
        )}

        {/* Book Appointment Button */}
        {user && user.id !== expert.id && appointmentSlots.length === 0 && (
          <div className="mb-6">
            <Link
              href={`/appointments/book/${expert.id}`}
              className="inline-block px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
            >
              Book 1-on-1 Appointment
            </Link>
          </div>
        )}

        {(expert.website || expert.linkedin || expert.instagram_url) && (
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
              {expert.instagram_url && (
                <a
                  href={expert.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyber-green hover:text-cyber-green-light underline transition-colors"
                >
                  Instagram
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
                      <div>
                        {showInterestForm === product.id ? (
                          <div className="space-y-3 bg-dark-green-800/30 p-4 rounded-lg border border-cyber-green/30">
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="block text-xs text-custom-text/70 mb-1">Country Code</label>
                                <input
                                  type="text"
                                  placeholder="+1"
                                  value={interestFormData.countryCode}
                                  onChange={(e) => setInterestFormData({ ...interestFormData, countryCode: e.target.value })}
                                  className="w-full px-2 py-1.5 bg-dark-green-900/50 border border-cyber-green/30 rounded text-custom-text placeholder-custom-text/50 text-sm"
                                />
                              </div>
                              <div className="col-span-2">
                                <label className="block text-xs text-custom-text/70 mb-1">Phone Number (Optional)</label>
                                <input
                                  type="tel"
                                  placeholder="1234567890"
                                  value={interestFormData.phoneNumber}
                                  onChange={(e) => setInterestFormData({ ...interestFormData, phoneNumber: e.target.value })}
                                  className="w-full px-2 py-1.5 bg-dark-green-900/50 border border-cyber-green/30 rounded text-custom-text placeholder-custom-text/50 text-sm"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSubmitInterest(product.id)}
                                disabled={registeringInterest === product.id}
                                className="flex-1 bg-cyber-green text-custom-text py-2 rounded-lg font-semibold hover:bg-cyber-green-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                              >
                                {registeringInterest === product.id ? "Registering..." : "Submit"}
                              </button>
                              <button
                                onClick={() => {
                                  setShowInterestForm(null);
                                  setInterestFormData({ countryCode: "", phoneNumber: "" });
                                }}
                                className="px-4 py-2 border border-cyber-green/30 text-custom-text rounded-lg hover:bg-dark-green-800/50 transition-colors text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleRegisterInterest(product.id)}
                            className="w-full bg-cyber-green text-custom-text py-2 rounded-lg font-semibold hover:bg-cyber-green-light transition-colors"
                          >
                            {user ? "Register Your Interest" : "Sign in to Register Interest"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Blog Posts Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-custom-text mb-4">Blog Posts</h2>
          <BlogPostsList expertId={expertId} limit={6} />
        </div>

        {/* Courses Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-custom-text mb-4">Courses</h2>
          <ExpertCourses expertId={expertId} />
        </div>

        {/* Subscribe Button */}
        {user && user.id !== expert.id && (
          <div className="mb-6 pt-6 border-t border-cyber-green/30">
            <SubscribeButton expertId={expert.id} expertName={expert.name} />
          </div>
        )}

        <div className="flex gap-4 pt-6 border-t border-cyber-green/30">
          <Link
            href={`/messages?expert=${expert.id}`}
            className="flex-1 bg-cyber-green text-custom-text py-3 rounded-lg font-semibold hover:bg-cyber-green-light transition-colors text-center"
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

