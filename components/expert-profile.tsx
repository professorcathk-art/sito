"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { BlogPostsList } from "@/components/blog-posts-list";
import { ExpertCourses } from "@/components/expert-courses";
import { ExpertCoursesWithProducts } from "@/components/expert-courses-with-products";
import { SubscribeButton } from "@/components/subscribe-button";
import { CourseEnrollment } from "@/components/course-enrollment";
import { QuestionnaireForm } from "@/components/questionnaire-form";

interface Expert {
  id: string;
  name: string;
  title: string;
  tagline?: string;
  category: string;
  bio: string;
  location: string;
  avatar_url?: string;
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
  product_type?: "e-learning" | "appointment" | "service";
  course_id?: string;
  enrollment_on_request?: boolean;
  webinar_expiry_date?: string | null;
  webinar_date_time?: string | null;
  e_learning_subtype?: string | null;
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
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [questionnaireId, setQuestionnaireId] = useState<string | null>(null);
  const [currentProductForInterest, setCurrentProductForInterest] = useState<string | null>(null);
  const [hasBlogPosts, setHasBlogPosts] = useState<boolean | null>(null);
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
            tagline,
            bio,
            avatar_url,
            website,
            linkedin,
            instagram_url,
            verified,
            listed_on_marketplace,
            categories!profiles_category_id_fkey(name),
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
            tagline: data.tagline || undefined,
            category: (data.categories as any)?.name || "",
            bio: data.bio || "",
            location: (data.countries as any)?.name || "",
            avatar_url: data.avatar_url || undefined,
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
      checkBlogPosts();
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

  const checkBlogPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id", { count: "exact", head: true })
        .eq("expert_id", expertId)
        .eq("access_level", "public")
        .not("published_at", "is", null)
        .limit(1);

      if (error) throw error;
      setHasBlogPosts((data?.length || 0) > 0);
    } catch (err) {
      console.error("Error checking blog posts:", err);
      setHasBlogPosts(false);
    }
  };

  const fetchProducts = async () => {
    if (!expertId) return;
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          courses(id, price, is_free)
        `)
        .eq("expert_id", expertId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Filter out expired live webinars
      const now = new Date();
      const filteredProducts = (data || []).filter((product: any) => {
        // If it's a live webinar with expiry date, check if expired
        if (product.e_learning_subtype === "live-webinar" && product.webinar_expiry_date) {
          const expiryDate = new Date(product.webinar_expiry_date);
          return expiryDate > now;
        }
        return true; // Keep all other products
      });
      
      setProducts(filteredProducts);
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

    // Find the product to check if it's an appointment
    const product = products.find(p => p.id === productId);
    
    // For appointment products, show questionnaire form
    if (product?.product_type === "appointment") {
      try {
        // Check if questionnaire exists for this product (linked by product_id)
        const { data: questionnaire, error: qError } = await supabase
          .from("questionnaires")
          .select("id")
          .eq("product_id", productId)
          .maybeSingle();

        if (qError && qError.code !== "PGRST116") {
          console.error("Error checking for questionnaire:", qError);
        }

        let finalQuestionnaireId = questionnaire?.id || null;

        // Don't create questionnaire - only experts can create them
        // If questionnaire doesn't exist, show error
        if (!finalQuestionnaireId) {
          console.error("No questionnaire found for appointment product");
          alert("Appointment form is not yet set up by the expert. Please contact them directly.");
          return;
        }

        // Fetch ALL fields (not just check if they exist)
        const { data: allFields, error: fieldsCheckError } = await supabase
          .from("questionnaire_fields")
          .select("*")
          .eq("questionnaire_id", finalQuestionnaireId)
          .order("order_index", { ascending: true });

        if (fieldsCheckError) {
          console.error("Error checking fields:", fieldsCheckError);
        }

        if (allFields && allFields.length > 0) {
          // Fields exist, show the form
          setQuestionnaireId(finalQuestionnaireId);
          setCurrentProductForInterest(productId);
          setShowQuestionnaire(true);
        } else {
          alert("The expert has not set up a booking form for this service. Please contact them directly.");
        }
      } catch (err: any) {
        console.error("Error setting up questionnaire:", err);
        // Fallback to simple form
        setShowInterestForm(productId);
      }
    } else {
      // For non-appointment products, show simple form
      setShowInterestForm(productId);
    }
  };

  const handleSubmitInterest = async (productId: string) => {
    if (!user) {
      alert("Please sign in to register interest");
      return;
    }

    setRegisteringInterest(productId);
    try {
      // Get user email from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", user.id)
        .single();

      // Fallback to auth user email if profile email not found
      let userEmail = profile?.email;
      if (!userEmail) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        userEmail = authUser?.email;
      }

      if (!userEmail) {
        throw new Error("User email not found");
      }

      const { error } = await supabase.from("product_interests").insert({
        product_id: productId,
        user_id: user.id,
        user_email: userEmail,
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
        try {
          await fetch("/api/notify-product-interest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productId,
              expertId,
              userId: user.id,
              userEmail: userEmail,
            }),
          });
        } catch (emailErr) {
          console.error("Error sending notification:", emailErr);
          // Don't fail the whole operation if email fails
        }
      }
    } catch (err: any) {
      console.error("Error registering interest:", err);
      alert(`Failed to register interest. ${err.message || "Please try again."}`);
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
        <div className="bg-surface border border-border-default rounded-xl shadow-lg shadow-black/20 p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-surface/80 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-surface/80 rounded w-1/2 mb-8"></div>
            <div className="h-32 bg-surface/80 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!expert) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-surface border border-border-default rounded-xl shadow-lg shadow-black/20 p-8 text-center">
          <p className="text-text-secondary">Expert not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
      <div className="bg-surface border border-border-default rounded-xl shadow-lg shadow-black/20 p-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4 flex-1">
            {expert.avatar_url && (
              <img
                src={expert.avatar_url}
                alt={expert.name}
                className="w-20 h-20 rounded-full object-cover border-2 border-border-default flex-shrink-0"
              />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-text-primary">{expert.name}</h1>
                {expert.verified && (
                  <span className="text-primary text-xl" title="Verified Expert">
                    ✓
                  </span>
                )}
              </div>
            {(expert.tagline || expert.title) && (
              <p className="text-base sm:text-xl text-text-secondary mb-2">{expert.tagline || expert.title}</p>
            )}
            <div className="flex items-center gap-4 text-text-secondary">
              {expert.category && (
                <span className="text-xs text-primary bg-transparent px-2 py-1 rounded-full border border-primary">
                  {expert.category}
                </span>
              )}
              {expert.location && <span>{expert.location}</span>}
            </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold text-text-primary mb-3">About</h2>
          <p className="text-text-primary leading-relaxed whitespace-pre-line">{expert.bio}</p>
        </div>

        {/* 1-on-1 Timeslots Section - Show View Button Only if slots exist */}
        {appointmentSlots.length > 0 && user && user.id !== expert.id && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-text-primary">1-on-1 Appointments</h2>
              <Link
                href={`/appointments/book/${expert.id}`}
                className="px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors"
              >
                View Available Timeslots
              </Link>
            </div>
          </div>
        )}

        {(expert.website || expert.linkedin || expert.instagram_url) && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-text-primary mb-3">Links</h2>
            <div className="flex flex-wrap gap-4">
              {expert.website && (
                <a
                  href={expert.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary-hover underline transition-colors"
                >
                  Website
                </a>
              )}
              {expert.linkedin && (
                <a
                  href={expert.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary-hover underline transition-colors"
                >
                  LinkedIn
                </a>
              )}
              {expert.instagram_url && (
                <a
                  href={expert.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary-hover underline transition-colors"
                >
                  Instagram
                </a>
              )}
            </div>
          </div>
        )}

        {/* Blog Posts Section - Only show if blog posts exist */}
        {hasBlogPosts && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-text-primary mb-4">Blog Posts</h2>
            <BlogPostsList expertId={expertId} limit={6} />
          </div>
        )}

        {/* Courses Section - Show only course products */}
        {loadingProducts ? (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-text-primary mb-3">Courses</h2>
            <div className="animate-pulse space-y-4">
              <div className="h-24 bg-surface/80 rounded-xl"></div>
            </div>
          </div>
        ) : products.filter(p => p.product_type === "e-learning").length > 0 ? (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-text-primary mb-4">Secret Recipe</h2>
            <div className="space-y-4">
              {products.filter(p => p.product_type === "e-learning").map((product) => {
                const isExpanded = expandedProducts.has(product.id);
                return (
                  <div
                    key={product.id}
                    className="bg-surface border border-border-default rounded-xl p-6 relative"
                  >
                    {/* Eye-catching Live Webinar Label - Top on mobile, top-right on desktop */}
                    {product.e_learning_subtype === "live-webinar" && (
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:top-4 sm:right-4 z-10">
                        <div className="bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-white text-[10px] sm:text-xs font-bold px-2 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-lg animate-pulse flex items-center gap-1">
                          <span className="text-[10px] sm:text-xs">🔴</span>
                          <span className="hidden sm:inline">LIVE WEBINAR</span>
                          <span className="sm:hidden">LIVE WEBINAR</span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 pt-8 sm:pt-0">
                        <Link 
                          href={product.course_id ? `/courses/${product.course_id}` : '#'}
                          className="block hover:text-primary transition-colors"
                        >
                          <h3 className="text-base sm:text-lg font-bold text-text-primary mb-2">{product.name}</h3>
                        </Link>
                        {/* Show webinar date/time for live webinars */}
                        {product.e_learning_subtype === "live-webinar" && product.webinar_date_time && (
                          <div className="mb-3 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                            <p className="text-xs text-text-secondary mb-1">📅 Webinar Date & Time:</p>
                            <p className="text-sm font-semibold text-primary">
                              {new Date(product.webinar_date_time).toLocaleString('en-US', {
                                timeZone: 'Asia/Hong_Kong',
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              })} (HKT)
                            </p>
                          </div>
                        )}
                        {isExpanded && (
                          <div 
                            className="text-text-secondary mb-3 product-preview"
                            dangerouslySetInnerHTML={{ __html: product.description }}
                          />
                        )}
                      </div>
                    </div>
                    {user?.id !== expertId && product.product_type === "e-learning" && product.course_id && (
                      <div className="mt-4">
                        <CourseEnrollment
                          courseId={product.course_id}
                          expertId={expertId}
                          coursePrice={(product as any).courses?.price || product.price || 0}
                          isFree={(product as any).courses?.is_free || product.price === 0}
                          currentUserId={user?.id}
                          enrollmentOnRequest={product.enrollment_on_request === true}
                          returnUrl={typeof window !== 'undefined' ? window.location.pathname + window.location.search : undefined}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : !loadingProducts ? (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-custom-text mb-4">Secret Recipe</h2>
            <p className="text-text-secondary">No e-learning products available yet.</p>
          </div>
        ) : null}

        {/* Other Products (Appointments/Services) Section - Hidden as requested */}
        {false && !loadingProducts && products.filter(p => p.product_type !== "e-learning").length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-custom-text mb-4">Services & Products</h2>
            <div className="space-y-4">
              {products.filter(p => p.product_type !== "e-learning").map((product) => {
                const isExpanded = expandedProducts.has(product.id);
                const hasRegisteredInterest = false; // Could check this if needed
                return (
                  <div
                    key={product.id}
                    className="bg-surface border border-border-default rounded-xl p-6"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-custom-text mb-2">{product.name}</h3>
                        {isExpanded && (
                          <div 
                            className="text-text-secondary mb-3 product-preview"
                            dangerouslySetInnerHTML={{ __html: product.description }}
                          />
                        )}
                        {!isExpanded && product.description && (
                          <button
                            onClick={() => {
                              const newExpanded = new Set(expandedProducts);
                              newExpanded.add(product.id);
                              setExpandedProducts(newExpanded);
                            }}
                            className="text-cyber-green hover:text-primary-hover text-sm"
                          >
                            Show more
                          </button>
                        )}
                      </div>
                    </div>
                    {user?.id !== expertId && (
                      <div className="mt-4">
                        {showInterestForm === product.id ? (
                          <div className="bg-surface border border-border-default rounded-lg p-4 space-y-3">
                            <h4 className="text-sm font-semibold text-custom-text">Register Interest</h4>
                            <div>
                              <label className="block text-xs text-text-secondary mb-1">Country Code (Optional)</label>
                              <input
                                type="text"
                                value={interestFormData.countryCode}
                                onChange={(e) => setInterestFormData({ ...interestFormData, countryCode: e.target.value })}
                                className="w-full px-3 py-2 bg-custom-bg border border-border-default rounded-lg text-custom-text text-sm"
                                placeholder="+1"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-text-secondary mb-1">Phone Number (Optional)</label>
                              <input
                                type="text"
                                value={interestFormData.phoneNumber}
                                onChange={(e) => setInterestFormData({ ...interestFormData, phoneNumber: e.target.value })}
                                className="w-full px-3 py-2 bg-custom-bg border border-border-default rounded-lg text-custom-text text-sm"
                                placeholder="1234567890"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSubmitInterest(product.id)}
                                disabled={registeringInterest === product.id}
                                className="px-4 py-2 bg-cyber-green text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors text-sm disabled:opacity-50"
                              >
                                {registeringInterest === product.id ? "Submitting..." : "Submit"}
                              </button>
                              <button
                                onClick={() => {
                                  setShowInterestForm(null);
                                  setInterestFormData({ countryCode: "", phoneNumber: "" });
                                }}
                                className="px-4 py-2 border border-border-default text-custom-text rounded-lg hover:bg-surface transition-colors text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleRegisterInterest(product.id)}
                            className="px-4 py-2 bg-cyber-green text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors text-sm"
                          >
                            Register Interest
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons - Subscribe, Send Message, Connect */}
        {user && user.id !== expert.id && (
          <div className="flex items-center gap-3 pt-6 border-t border-border-default flex-wrap">
            <div className="flex items-center gap-2">
              <SubscribeButton expertId={expert.id} expertName={expert.name} />
            </div>
            <Link
              href={`/messages?expert=${expert.id}`}
              className="px-4 py-2 bg-cyber-green text-custom-text rounded-lg font-semibold hover:bg-primary-hover transition-colors text-sm whitespace-nowrap"
            >
              Send Message
            </Link>
            <button
              onClick={handleConnect}
              disabled={connecting || connectionStatus !== "none"}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors text-sm whitespace-nowrap ${
                connectionStatus === "pending"
                  ? "border border-border-default text-cyber-green bg-surface cursor-not-allowed"
                  : connectionStatus === "accepted"
                  ? "border border-cyber-green text-cyber-green bg-surface cursor-not-allowed"
                  : "border border-border-default text-custom-text hover:bg-surface hover:border-cyber-green"
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
          </div>
        )}
      </div>

      {/* Questionnaire Form Modal for Appointments */}
      {showQuestionnaire && questionnaireId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-green-900 border border-border-default rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-custom-text">Register Interest</h2>
              <button
                onClick={() => {
                  setShowQuestionnaire(false);
                  setQuestionnaireId(null);
                  setCurrentProductForInterest(null);
                }}
                className="text-text-secondary hover:text-custom-text transition-colors"
              >
                ✕
              </button>
            </div>
            <QuestionnaireForm
              questionnaireId={questionnaireId}
              onSubmit={async (responses) => {
                if (!user || !currentProductForInterest) return;

                try {
                  // Get user email
                  const { data: profile } = await supabase
                    .from("profiles")
                    .select("email")
                    .eq("id", user.id)
                    .single();

                  let userEmail = profile?.email;
                  if (!userEmail) {
                    const { data: { user: authUser } } = await supabase.auth.getUser();
                    userEmail = authUser?.email;
                  }

                  if (!userEmail) {
                    throw new Error("User email not found");
                  }

                  // Save questionnaire response
                  const { data: responseData, error: responseError } = await supabase
                    .from("questionnaire_responses")
                    .insert({
                      questionnaire_id: questionnaireId,
                      user_id: user.id,
                      responses: responses,
                    })
                    .select()
                    .single();

                  if (responseError) throw responseError;

                  // Register interest with questionnaire response
                  const { error: interestError } = await supabase.from("product_interests").insert({
                    product_id: currentProductForInterest,
                    user_id: user.id,
                    user_email: userEmail,
                    questionnaire_response_id: responseData.id,
                  });

                  if (interestError) {
                    if (interestError.code === "23505") {
                      alert("You have already registered interest in this service");
                    } else {
                      throw interestError;
                    }
                  } else {
                    alert("Interest registered! The expert will be notified.");
                    setShowQuestionnaire(false);
                    setQuestionnaireId(null);
                    setCurrentProductForInterest(null);

                    // Send email notification
                    try {
                      await fetch("/api/notify-product-interest", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          productId: currentProductForInterest,
                          expertId,
                          userId: user.id,
                          userEmail: userEmail,
                        }),
                      });
                    } catch (emailErr) {
                      console.error("Error sending notification:", emailErr);
                    }
                  }
                } catch (err: any) {
                  console.error("Error submitting questionnaire:", err);
                  alert(`Failed to register interest: ${err.message || "Please try again."}`);
                }
              }}
              onCancel={() => {
                setShowQuestionnaire(false);
                setQuestionnaireId(null);
                setCurrentProductForInterest(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

