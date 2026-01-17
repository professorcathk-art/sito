"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";
import { RichTextEditor } from "@/components/rich-text-editor";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  pricing_type: "one-off" | "hourly";
  product_type?: "service" | "e-learning" | "appointment";
  e_learning_subtype?: "online-course" | "ebook" | "ai-prompt" | "live-webinar" | "other" | null;
  course_id?: string;
  appointment_slot_id?: string;
  stripe_product_id?: string | null;
  stripe_price_id?: string | null;
  payment_method?: "stripe" | "offline" | null;
  contact_email?: string | null;
  contact_url?: string | null;
  contact_type?: "email" | "url" | null;
  enrollment_on_request?: boolean;
  webinar_expiry_date?: string | null;
  webinar_date_time?: string | null;
  created_at: string;
}

interface Course {
  id: string;
  title: string;
  is_free: boolean;
  price: number;
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
  questionnaire_responses?: Record<string, any> | null;
  created_at: string;
  purchased?: boolean; // Whether user has purchased/enrolled
}

export function ProductsManagement() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [interests, setInterests] = useState<ProductInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [pendingCourseData, setPendingCourseData] = useState<{
    name: string;
    description: string;
    price: string;
    category: string;
    payment_method: "stripe" | "offline";
    contact_email: string;
    contact_url?: string;
    contact_type?: "email" | "url";
  } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    pricing_type: "one-off" as "one-off" | "hourly",
    product_type: "e-learning" as "e-learning" | "appointment",
    e_learning_subtype: "" as "" | "online-course" | "ebook" | "ai-prompt" | "live-webinar" | "other",
    course_id: "",
    category: "",
    payment_method: "stripe" as "stripe" | "offline",
    contact_email: "",
    contact_url: "",
    contact_type: "email" as "email" | "url",
    coverImageUrl: "",
    enrollmentOnRequest: false,
    webinarExpiryDate: "",
    webinarDateTime: "",
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"products" | "interests">("products");
  const [currentProductId, setCurrentProductId] = useState<string | null>(null);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [appointmentFormData, setAppointmentFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: "09:00",
    endTime: "17:00",
    intervalMinutes: "60",
    ratePerHour: "100",
  });
  const [courseLessons, setCourseLessons] = useState<any[]>([]);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any | null>(null);
  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    videoUrl: "",
    videoType: "youtube" as "youtube" | "vimeo",
    content: "",
  });
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(null);
  const [showQuestionnaireForm, setShowQuestionnaireForm] = useState(false);
  const [questionnaireType, setQuestionnaireType] = useState<"course_enrollment" | "appointment" | null>(null);
  const [currentQuestionnaireId, setCurrentQuestionnaireId] = useState<string | null>(null);
  const [questionnaireFields, setQuestionnaireFields] = useState<any[]>([]);
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [viewingFormProductId, setViewingFormProductId] = useState<string | null>(null);
  const [viewingFormFields, setViewingFormFields] = useState<any[]>([]);
  const [editingField, setEditingField] = useState<any | null>(null);
  const [fieldForm, setFieldForm] = useState({
    field_type: "text" as "text" | "email" | "phone" | "select" | "checkbox" | "radio",
    label: "",
    placeholder: "",
    required: false,
    options: "",
    country_code: "+852", // Default to Hong Kong
  });
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [isProfileListed, setIsProfileListed] = useState<boolean | null>(null);
  const [courseMembersMap, setCourseMembersMap] = useState<{ [courseId: string]: any[] }>({});
  const [showMembersForProduct, setShowMembersForProduct] = useState<string | null>(null);
  const [interestCounts, setInterestCounts] = useState<{ [productId: string]: number }>({});

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchCourses();
      fetchStripeAccountId();
      checkProfileListing();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Fetch interest counts for all products
  useEffect(() => {
    if (user && products.length > 0) {
      fetchInterestCounts();
    }
  }, [user, products]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchInterestCounts = async () => {
    if (!user || products.length === 0) return;
    
    try {
      const productIds = products.map((p) => p.id);
      
      // Fetch count of interests per product
      const { data, error } = await supabase
        .from("product_interests")
        .select("product_id")
        .in("product_id", productIds);
      
      if (error && error.code !== "PGRST116") {
        console.error("Error fetching interest counts:", error);
        return;
      }
      
      // Count interests per product
      const counts: { [productId: string]: number } = {};
      (data || []).forEach((interest: any) => {
        counts[interest.product_id] = (counts[interest.product_id] || 0) + 1;
      });
      
      setInterestCounts(counts);
    } catch (err) {
      console.error("Error fetching interest counts:", err);
    }
  };

  const checkProfileListing = async () => {
    if (!user) return;
    
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("listed_on_marketplace")
        .eq("id", user.id)
        .single();
      
      setIsProfileListed(profile?.listed_on_marketplace || false);
    } catch (err) {
      console.error("Error checking profile listing:", err);
      setIsProfileListed(false);
    }
  };

  /**
   * Fetch user's Stripe Connect account ID
   */
  const fetchStripeAccountId = async () => {
    if (!user) return;
    
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("stripe_connect_account_id")
        .eq("id", user.id)
        .single();
      
      if (profile?.stripe_connect_account_id) {
        setStripeAccountId(profile.stripe_connect_account_id);
      }
    } catch (err) {
      console.error("Error fetching Stripe account ID:", err);
    }
  };

  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB");
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `course-covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("blog-resources")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("blog-resources").getPublicUrl(filePath);
      setFormData({ ...formData, coverImageUrl: data.publicUrl });
    } catch (err: any) {
      console.error("Error uploading image:", err);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  /**
   * Create Stripe product for a paid product
   * Only creates Stripe product if:
   * - Product has a price > 0
   * - User has a Stripe Connect account
   * - Stripe account is ready to receive payments
   */
  const createStripeProduct = async (
    productName: string,
    productDescription: string,
    price: number,
    productId: string
  ): Promise<{ stripeProductId: string | null; stripePriceId: string | null }> => {
    // Only create Stripe product for paid products
    if (price <= 0 || !stripeAccountId) {
      return { stripeProductId: null, stripePriceId: null };
    }

    try {
      // Verify account is ready
      const statusResponse = await fetch(
        `/api/stripe/connect/account-status?accountId=${stripeAccountId}`
      );
      
      if (!statusResponse.ok) {
        console.warn("Stripe account not ready, skipping Stripe product creation");
        return { stripeProductId: null, stripePriceId: null };
      }

      const statusData = await statusResponse.json();
      if (!statusData.readyToReceivePayments) {
        console.warn("Stripe account not ready to receive payments, skipping Stripe product creation");
        return { stripeProductId: null, stripePriceId: null };
      }

      // Create Stripe product
      const response = await fetch("/api/stripe/products/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: productName,
          description: productDescription,
          priceInCents: Math.round(price * 100), // Convert to cents
          currency: "usd", // Use USD to match form display
          connectedAccountId: stripeAccountId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error("Error creating Stripe product:", data.error);
        // Don't throw - allow product creation to continue without Stripe
        return { stripeProductId: null, stripePriceId: null };
      }

      const data = await response.json();
      return {
        stripeProductId: data.productId,
        stripePriceId: data.priceId,
      };
    } catch (err) {
      console.error("Error creating Stripe product:", err);
      // Don't throw - allow product creation to continue without Stripe
      return { stripeProductId: null, stripePriceId: null };
    }
  };

  const fetchCourses = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, is_free, price")
        .eq("expert_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (err) {
      console.error("Error fetching courses:", err);
    }
  };

  const fetchCourseMembers = async (courseId: string) => {
    if (!user || !courseId) return;
    try {
      console.log("Fetching course members for courseId:", courseId);
      
      // Fetch ALL enrollments (both paid and free, by user_id and user_email)
      const { data, error } = await supabase
        .from("course_enrollments")
        .select(`
          id,
          user_id,
          user_email,
          enrolled_at,
          questionnaire_response_id,
          payment_intent_id,
          refund_status,
          refund_id,
          refunded_at,
          refund_amount,
          refund_reason
        `)
        .eq("course_id", courseId)
        .order("enrolled_at", { ascending: false });

      if (error) {
        console.error("Error fetching course enrollments:", error);
        throw error;
      }
      
      console.log("Found enrollments:", data?.length || 0, data);
      
      // Fetch profiles separately (user_id references auth.users, not profiles directly)
      const userIds = Array.from(new Set((data || []).map((e: any) => e.user_id).filter(Boolean)));
      let profilesMap: { [key: string]: { name: string; email: string } } = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", userIds);
        
        if (profilesData) {
          profilesData.forEach((profile: any) => {
            profilesMap[profile.id] = {
              name: profile.name || "N/A",
              email: profile.email || "N/A",
            };
          });
        }
      }
      
      // Fetch questionnaire responses using questionnaire_response_id from enrollments
      const questionnaireResponseIds = (data || []).map((e: any) => e.questionnaire_response_id).filter(Boolean);
      let questionnaireResponsesMap: { [key: string]: any } = {};
      let questionnaireFieldsMap: { [key: string]: { [key: string]: string } } = {};
      let responsesData: any[] | null = null;
      
      if (questionnaireResponseIds.length > 0) {
        // Fetch questionnaire responses by ID
        const { data: responsesDataResult } = await supabase
          .from("questionnaire_responses")
          .select("id, responses, questionnaire_id")
          .in("id", questionnaireResponseIds);
        
        responsesData = responsesDataResult || null;
        
        if (responsesData) {
          // Map responses by response ID
          responsesData.forEach((resp: any) => {
            questionnaireResponsesMap[resp.id] = resp.responses;
          });
          
          // Get all unique questionnaire IDs
          const questionnaireIds = Array.from(new Set(responsesData.map((r: any) => r.questionnaire_id).filter(Boolean)));
          
          if (questionnaireIds.length > 0) {
            // Fetch questionnaire fields to map field IDs to labels
            const { data: fieldsData } = await supabase
              .from("questionnaire_fields")
              .select("id, questionnaire_id, label")
              .in("questionnaire_id", questionnaireIds);
            
            if (fieldsData) {
              fieldsData.forEach((field: any) => {
                if (!questionnaireFieldsMap[field.questionnaire_id]) {
                  questionnaireFieldsMap[field.questionnaire_id] = {};
                }
                questionnaireFieldsMap[field.questionnaire_id][field.id] = field.label;
              });
            }
          }
        }
      }
      
      const members = (data || []).map((enrollment: any) => {
        let mappedResponses: { [key: string]: any } | null = null;
        
        if (enrollment.questionnaire_response_id && questionnaireResponsesMap[enrollment.questionnaire_response_id]) {
          const responses = questionnaireResponsesMap[enrollment.questionnaire_response_id];
          
          // Find questionnaire_id from response data
          const responseData = responsesData?.find((r: any) => r.id === enrollment.questionnaire_response_id);
          const questionnaireId = responseData?.questionnaire_id;
          
          if (questionnaireId && questionnaireFieldsMap[questionnaireId]) {
            // Map field IDs to labels
            mappedResponses = {};
            Object.entries(responses).forEach(([fieldId, value]) => {
              const label = questionnaireFieldsMap[questionnaireId][fieldId] || fieldId;
              mappedResponses![label] = value;
            });
          } else {
            mappedResponses = responses;
          }
        }
        
        return {
          id: enrollment.id,
          user_id: enrollment.user_id || null,
          name: enrollment.user_id ? (profilesMap[enrollment.user_id]?.name || "N/A") : "N/A",
          email: enrollment.user_email || (enrollment.user_id ? profilesMap[enrollment.user_id]?.email : "N/A") || "N/A",
          enrolled_at: enrollment.enrolled_at,
          questionnaire_responses: mappedResponses,
          payment_intent_id: enrollment.payment_intent_id,
          refund_status: enrollment.refund_status || "none",
          refund_id: enrollment.refund_id,
          refunded_at: enrollment.refunded_at,
          refund_amount: enrollment.refund_amount,
          refund_reason: enrollment.refund_reason,
        };
      });
      
      setCourseMembersMap((prev) => ({
        ...prev,
        [courseId]: members,
      }));
    } catch (err) {
      console.error("Error fetching course members:", err);
    }
  };

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
      // Simplified query to avoid RLS issues with questionnaire_responses join
      const { data, error } = await supabase
        .from("product_interests")
        .select(`
          id,
          product_id,
          user_id,
          user_email,
          country_code,
          phone_number,
          questionnaire_response_id,
          created_at,
          products!inner(name, expert_id)
        `)
        .in("product_id", productIds)
        .eq("products.expert_id", user.id);

      if (error) {
        console.error("Error fetching interests:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        // If no interests found, that's okay
        if (error.code !== "PGRST116") {
          // Don't throw - just log and set empty array
          console.warn("Non-fatal error fetching interests, continuing with empty array");
        }
        setInterests([]);
        // Update counts even if error (set to 0)
        const counts: { [productId: string]: number } = {};
        productIds.forEach((id) => {
          counts[id] = 0;
        });
        setInterestCounts(counts);
        return;
      }

      console.log("Interests fetched:", data?.length || 0);
      
      // Update interest counts
      const interestCountsMap: { [productId: string]: number } = {};
      (data || []).forEach((interest: any) => {
        interestCountsMap[interest.product_id] = (interestCountsMap[interest.product_id] || 0) + 1;
      });
      // Initialize counts for products with no interests
      productIds.forEach((id) => {
        if (!interestCountsMap[id]) {
          interestCountsMap[id] = 0;
        }
      });
      setInterestCounts(interestCountsMap);

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

      // Fetch questionnaire responses separately if questionnaire_response_id exists
      const questionnaireResponseIds = Array.from(
        new Set((data || []).map((item: any) => item.questionnaire_response_id).filter(Boolean))
      );
      const questionnaireResponsesMap: { [key: string]: any } = {};
      const questionnaireFieldsMap: { [key: string]: { [key: string]: string } } = {}; // questionnaire_id -> { fieldId -> fieldLabel }
      let responsesData: any[] | null = null;
      
      if (questionnaireResponseIds.length > 0) {
        const { data: responsesDataResult } = await supabase
          .from("questionnaire_responses")
          .select("id, responses, questionnaire_id")
          .in("id", questionnaireResponseIds);
        
        responsesData = responsesDataResult || null;
        
        if (responsesData) {
          responsesData.forEach((resp: any) => {
            questionnaireResponsesMap[resp.id] = resp.responses;
          });
          
          // Fetch all questionnaire IDs and their fields to map field IDs to labels
          const questionnaireIds = Array.from(new Set(responsesData.map((r: any) => r.questionnaire_id).filter(Boolean)));
          if (questionnaireIds.length > 0) {
            const { data: fieldsData } = await supabase
              .from("questionnaire_fields")
              .select("id, questionnaire_id, label")
              .in("questionnaire_id", questionnaireIds);
            
            if (fieldsData) {
              // Create a map: questionnaire_id -> { fieldId -> label }
              questionnaireIds.forEach((qId: string) => {
                questionnaireFieldsMap[qId] = {};
                fieldsData
                  .filter((f: any) => f.questionnaire_id === qId)
                  .forEach((field: any) => {
                    questionnaireFieldsMap[qId][field.id] = field.label;
                  });
              });
            }
          }
        }
      }

      // Check which products are courses and get their course_ids
      const courseProductMap: { [productId: string]: string } = {};
      products.forEach((p) => {
        if (p.product_type === "e-learning" && p.course_id) {
          courseProductMap[p.id] = p.course_id;
        }
      });
      
      // Fetch enrollments for course products to check purchase status
      const courseIds = Object.values(courseProductMap);
      let enrollmentsMap: { [key: string]: boolean } = {}; // user_id + course_id -> true
      
      if (courseIds.length > 0) {
        const { data: enrollmentsData } = await supabase
          .from("course_enrollments")
          .select("user_id, course_id, user_email")
          .in("course_id", courseIds);
        
        if (enrollmentsData) {
          enrollmentsData.forEach((enrollment: any) => {
            const key = `${enrollment.user_id || enrollment.user_email}_${enrollment.course_id}`;
            enrollmentsMap[key] = true;
          });
        }
      }
      
      const interestsData = (data || []).map((item: any) => {
        // Extract name and email from questionnaire responses if available
        let formName = item.user_email; // Default to email
        let formEmail = item.user_email;
        let mappedResponses: { [key: string]: any } | null = null;
        
        if (item.questionnaire_response_id && questionnaireResponsesMap[item.questionnaire_response_id]) {
          const responses = questionnaireResponsesMap[item.questionnaire_response_id];
          
          // Get questionnaire_id from response
          const responseData = responsesData?.find((r: any) => r.id === item.questionnaire_response_id);
          const questionnaireId = responseData?.questionnaire_id;
          
          // Map response keys (field IDs) to field labels
          if (questionnaireId && questionnaireFieldsMap[questionnaireId]) {
            mappedResponses = {};
            Object.entries(responses).forEach(([fieldId, value]) => {
              // Map field ID to label, fallback to fieldId if not found
              const label = questionnaireFieldsMap[questionnaireId][fieldId] || fieldId;
              mappedResponses![label] = value;
            });
          } else {
            mappedResponses = responses;
          }
          
          // Try to find name and email in responses
          Object.values(responses).forEach((value: any) => {
            if (typeof value === 'string') {
              if (value.includes('@')) {
                formEmail = value;
              } else if (value.length > 2 && !value.includes('@')) {
                formName = value;
              }
            }
          });
        }
        
        // Check if user has purchased/enrolled (for course products)
        let purchased = false;
        const courseId = courseProductMap[item.product_id];
        if (courseId) {
          const enrollmentKey = `${item.user_id}_${courseId}`;
          const enrollmentKeyByEmail = `${item.user_email}_${courseId}`;
          purchased = enrollmentsMap[enrollmentKey] || enrollmentsMap[enrollmentKeyByEmail] || false;
        }
        
        return {
          id: item.id,
          product_id: item.product_id,
          product_name: item.products?.name || "Unknown Product",
          user_id: item.user_id,
          user_email: formEmail || item.user_email,
          user_name: formName || userNameMap[item.user_id] || "Unknown User",
          country_code: item.country_code || undefined,
          phone_number: item.phone_number || undefined,
          questionnaire_responses: mappedResponses || (item.questionnaire_response_id 
            ? questionnaireResponsesMap[item.questionnaire_response_id] || null 
            : null),
          created_at: item.created_at,
          purchased: purchased,
        };
      });

      setInterests(interestsData);
      
      // Update interest counts after fetching interests
      const updatedCounts: { [productId: string]: number } = {};
      interestsData.forEach((interest: ProductInterest) => {
        updatedCounts[interest.product_id] = (updatedCounts[interest.product_id] || 0) + 1;
      });
      // Initialize counts for products with no interests
      products.forEach((p) => {
        if (!updatedCounts[p.id]) {
          updatedCounts[p.id] = 0;
        }
      });
      setInterestCounts((prev) => ({ ...prev, ...updatedCounts }));
    } catch (err: any) {
      console.error("Error fetching interests:", err);
      setInterests([]);
    }
  };

  useEffect(() => {
    if (activeTab === "interests") {
      fetchInterests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, products, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!user) return;

    // Check if description is empty (RichTextEditor might return empty HTML)
    const descriptionText = formData.description?.replace(/<[^>]*>/g, '').trim() || '';
    
    if (!formData.name || !descriptionText) {
      setError("Please fill in name and description");
      return;
    }

    if (formData.product_type === "e-learning" && !formData.category) {
      setError("Please select a category for your course");
      return;
    }

    try {
      // Check if editing first - skip questionnaire flow for edits
      if (editingProduct) {
        // Update existing product - DO NOT CREATE NEW PRODUCT
        // Warn user if somehow a new product would be created
        if (!editingProduct.id) {
          const shouldContinue = confirm(
            "Warning: Product ID not found. This will create a new product instead of updating. Continue?"
          );
          if (!shouldContinue) {
            return;
          }
        }
        
        const productData: any = {
          name: formData.name,
          description: formData.description,
        };

        // Don't change product_type when updating
        // productData.product_type = formData.product_type;

        // Add price if provided
        const newPrice = formData.price ? parseFloat(formData.price) || 0 : editingProduct.price;
        if (formData.price) {
          productData.price = newPrice;
        }

        // Update enrollment_on_request
        productData.enrollment_on_request = formData.enrollmentOnRequest || false;
        
        // Update webinar_expiry_date and webinar_date_time for live webinars
        if (formData.e_learning_subtype === "live-webinar") {
          if (formData.webinarExpiryDate) {
            productData.webinar_expiry_date = new Date(formData.webinarExpiryDate).toISOString();
          }
          if (formData.webinarDateTime) {
            productData.webinar_date_time = new Date(formData.webinarDateTime).toISOString();
          }
        } else if (editingProduct.e_learning_subtype !== "live-webinar") {
          // Clear webinar dates if not a live webinar
          productData.webinar_expiry_date = null;
          productData.webinar_date_time = null;
        }
        
        // Update payment method and contact email/URL
        if (formData.enrollmentOnRequest) {
          // If enrollment on request, clear payment method and contact info
          productData.payment_method = null;
          productData.contact_email = null;
          // Clear Stripe IDs if switching to enrollment on request
          if (editingProduct.stripe_product_id) {
            productData.stripe_product_id = null;
            productData.stripe_price_id = null;
          }
        } else {
          productData.payment_method = formData.payment_method || "stripe";
          if (formData.payment_method === "offline") {
            // Store email or URL in contact_email field
            productData.contact_email = formData.contact_type === "url" ? formData.contact_url : formData.contact_email || null;
            // Clear Stripe IDs if switching to offline
            if (editingProduct.stripe_product_id) {
              productData.stripe_product_id = null;
              productData.stripe_price_id = null;
            }
          } else {
            productData.contact_email = null;
          }
        }

        // Update Stripe product if price changed and product is paid
        if (newPrice > 0 && editingProduct.price !== newPrice && stripeAccountId && editingProduct.stripe_product_id) {
          // Price changed for paid product - update Stripe product
          // Note: Stripe doesn't allow updating prices, so we create a new price
          // For now, we'll just log this - in production you might want to archive old price and create new one
          console.log("Price changed for Stripe product - consider updating Stripe price");
          
          // Optionally create new Stripe product/price if needed
          // For simplicity, we'll keep the existing Stripe product ID
          // In production, you might want to handle price updates differently
        } else if (newPrice > 0 && !editingProduct.stripe_product_id && stripeAccountId) {
          // Product became paid but doesn't have Stripe product yet - create it
          const stripeResult = await createStripeProduct(
            formData.name || editingProduct.name,
            formData.description || editingProduct.description,
            newPrice,
            editingProduct.id
          );
          
          if (stripeResult.stripeProductId) {
            productData.stripe_product_id = stripeResult.stripeProductId;
            productData.stripe_price_id = stripeResult.stripePriceId;
          }
        } else if (newPrice === 0 && editingProduct.stripe_product_id) {
          // Product became free - remove Stripe product IDs
          productData.stripe_product_id = null;
          productData.stripe_price_id = null;
        }

        // If updating an e-learning product, also update the course price, description, and category
        if (editingProduct.product_type === "e-learning" && editingProduct.course_id) {
          const courseUpdateData: any = {};
          
          if (formData.price) {
            courseUpdateData.price = parseFloat(formData.price) || 0;
            // If enrollment_on_request is true, don't set is_free to true (on request ≠ free)
            courseUpdateData.is_free = parseFloat(formData.price) === 0 && !formData.enrollmentOnRequest;
          }
          
          // Update course title if product name changed
          if (formData.name) {
            courseUpdateData.title = formData.name;
          }
          
          // Update course description if provided
          if (formData.description) {
            courseUpdateData.description = formData.description;
          }
          
          // Update course category if provided
          if (formData.category) {
            courseUpdateData.category = formData.category;
          }
          
          // Update course cover image if provided
          if (formData.coverImageUrl !== undefined) {
            courseUpdateData.cover_image_url = formData.coverImageUrl || null;
          }
          
          if (Object.keys(courseUpdateData).length > 0) {
            const { error: courseUpdateError } = await supabase
              .from("courses")
              .update(courseUpdateData)
              .eq("id", editingProduct.course_id)
              .eq("expert_id", user.id);
            
            if (courseUpdateError) throw courseUpdateError;
          }
        }
        
        // If updating an appointment product, also update rate_per_hour for all slots
        if (editingProduct.product_type === "appointment" && formData.price) {
          const newRatePerHour = parseFloat(formData.price) || 0;
          if (newRatePerHour > 0 && editingProduct.price !== newRatePerHour) {
            // Update all slots' rate_per_hour for this product
            await supabase
              .from("appointment_slots")
              .update({ rate_per_hour: newRatePerHour })
              .eq("product_id", editingProduct.id)
              .eq("expert_id", user.id);
          }
        }

        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingProduct.id)
          .eq("expert_id", user.id);

        if (error) throw error;
        
        alert("Product updated successfully!");
        setFormData({
          name: "",
          description: "",
          price: "",
          pricing_type: "one-off",
          product_type: "appointment",
          e_learning_subtype: "",
          course_id: "",
          category: "",
          payment_method: "stripe",
          contact_email: "",
          contact_url: "",
          contact_type: "email",
          coverImageUrl: "",
          enrollmentOnRequest: false,
          webinarExpiryDate: "",
          webinarDateTime: "",
        });
        setShowAddForm(false);
        setEditingProduct(null);
        fetchProducts();
        if (activeTab === "interests") {
          fetchInterests();
        }
        return; // Exit early, don't create new product
      }

      if (formData.product_type === "e-learning") {
        // For e-learning: Create course and product first, THEN create questionnaire linked to product
        try {
          // Create course first
          const coursePrice = formData.price ? parseFloat(formData.price) || 0 : 0;
          // If enrollment_on_request is true, don't set is_free to true (on request ≠ free)
          const isFree = coursePrice === 0 && !formData.enrollmentOnRequest;
          const { data: newCourse, error: courseError } = await supabase
            .from("courses")
            .insert({
              expert_id: user.id,
              title: formData.name,
              description: formData.description,
              cover_image_url: formData.coverImageUrl || null,
              is_free: isFree,
              price: coursePrice,
              category: formData.category,
              published: false, // Will be published after questionnaire is ready
            })
            .select()
            .single();

          if (courseError) throw courseError;

          // Create product linked to course
          const { data: newProduct, error: productError } = await supabase
            .from("products")
            .insert({
              expert_id: user.id,
              name: formData.name,
              description: formData.description,
              product_type: "e-learning",
              e_learning_subtype: formData.e_learning_subtype || null,
              course_id: newCourse.id,
              price: coursePrice,
              pricing_type: "one-off",
              payment_method: formData.enrollmentOnRequest ? null : (formData.payment_method || "stripe"),
              contact_email: formData.enrollmentOnRequest ? null : (formData.payment_method === "offline" ? (formData.contact_type === "url" ? formData.contact_url : formData.contact_email) : null),
              enrollment_on_request: formData.enrollmentOnRequest || false,
              webinar_expiry_date: formData.e_learning_subtype === "live-webinar" && formData.webinarExpiryDate 
                ? new Date(formData.webinarExpiryDate).toISOString() 
                : null,
              webinar_date_time: formData.e_learning_subtype === "live-webinar" && formData.webinarDateTime 
                ? new Date(formData.webinarDateTime).toISOString() 
                : null,
            })
            .select()
            .single();

          if (productError) {
            // If product creation fails, delete the course
            await supabase.from("courses").delete().eq("id", newCourse.id);
            throw productError;
          }

          // Now create questionnaire linked to this product
          const { data: questionnaire, error: qError } = await supabase
            .from("questionnaires")
            .insert({
              expert_id: user.id,
              product_id: newProduct.id,
              type: "course_interest",
              title: `${formData.name} - Enrollment Form`,
              is_active: true,
            })
            .select()
            .single();

          if (qError) {
            console.error("Error creating questionnaire:", qError);
            // If questionnaire creation fails, delete product and course
            await supabase.from("products").delete().eq("id", newProduct.id);
            await supabase.from("courses").delete().eq("id", newCourse.id);
            throw new Error(`Failed to create form: ${qError.message || "Please try again."}`);
          }

          const questionnaireId = questionnaire?.id || null;

          if (!questionnaireId) {
            // If questionnaire creation failed, delete product and course
            await supabase.from("products").delete().eq("id", newProduct.id);
            await supabase.from("courses").delete().eq("id", newCourse.id);
            throw new Error("Failed to create form. Please try again.");
          }

          // Store product and course IDs for later use
          setCurrentProductId(newProduct.id);
          setCurrentCourseId(newCourse.id);

          // Check if fields already exist
          const { data: existingFields } = await supabase
            .from("questionnaire_fields")
            .select("id, label")
            .eq("questionnaire_id", questionnaireId);

          const hasNameField = existingFields?.some(f => f.label.toLowerCase().includes("name"));
          const hasEmailField = existingFields?.some(f => f.label.toLowerCase().includes("email"));

          // Only create mandatory fields if they don't exist
          if (!hasNameField || !hasEmailField) {
            const defaultFields = [];
            if (!hasNameField) {
              defaultFields.push({ questionnaire_id: questionnaireId, field_type: "text", label: "Name", placeholder: "Enter your name", required: true, order_index: 0 });
            }
            if (!hasEmailField) {
              defaultFields.push({ questionnaire_id: questionnaireId, field_type: "email", label: "Email", placeholder: "Enter your email", required: true, order_index: 1 });
            }

            if (defaultFields.length > 0) {
              const { error: fieldsError } = await supabase
                .from("questionnaire_fields")
                .insert(defaultFields);

              if (fieldsError) {
                console.error("Error creating questionnaire fields:", fieldsError);
                throw new Error(`Failed to create form fields: ${fieldsError.message || "Please try again."}`);
              }
            }
          }

          // Fetch fields for display
          const { data: fieldsData } = await supabase
            .from("questionnaire_fields")
            .select("*")
            .eq("questionnaire_id", questionnaireId)
            .order("order_index", { ascending: true });
          setQuestionnaireFields(fieldsData || []);

          // Show questionnaire form for editing (user can add more fields)
          setShowQuestionnaireForm(true);
          setQuestionnaireType("course_enrollment");
          setCurrentQuestionnaireId(questionnaireId);
          setFieldForm({
            field_type: "text",
            label: "",
            placeholder: "",
            required: false,
            options: "",
            country_code: "+852",
          });
          
          // Store form data temporarily (don't create course yet)
          // User will click "Publish Course" after questionnaire is ready
          setPendingCourseData({
            name: formData.name,
            description: formData.description,
            price: formData.price,
            category: formData.category || "",
            payment_method: formData.payment_method,
            contact_email: formData.contact_type === "url" ? formData.contact_url : formData.contact_email || "",
          });
          setShowAddForm(false);
          
        } catch (err: any) {
          console.error("Error creating questionnaire:", err);
          setError(err.message || "Failed to create form. Please try again.");
          throw err;
        }
        return; // Don't create course yet - wait for questionnaire completion
      } else if (formData.product_type === "appointment") {
        // For appointment: Check if expert already has an appointment product
        // Limit to 1 appointment product per expert
        try {
          const { data: existingAppointmentProduct } = await supabase
            .from("products")
            .select("id")
            .eq("expert_id", user.id)
            .eq("product_type", "appointment")
            .maybeSingle();

          if (existingAppointmentProduct?.id) {
            throw new Error("You can only create one appointment product. Please edit your existing appointment product instead.");
          }

          // Create product first (before questionnaire)
          const { data: newProduct, error: productError } = await supabase
            .from("products")
            .insert({
              expert_id: user.id,
              name: formData.name,
              description: formData.description,
              price: 0, // Price will be set when creating appointment slots
              pricing_type: formData.pricing_type || "one-off",
              product_type: "appointment",
              payment_method: formData.payment_method || "stripe",
              contact_email: formData.payment_method === "offline" ? (formData.contact_type === "url" ? formData.contact_url : formData.contact_email) : null,
            })
            .select()
            .single();

          if (productError) {
            console.error("Error creating product:", productError);
            // Check if it's the unique constraint violation (already has appointment product)
            if (productError.code === "23505") {
              throw new Error("You can only create one appointment product. Please edit your existing appointment product instead.");
            }
            throw new Error(`Failed to create product: ${productError.message || "Please try again."}`);
          }

          if (!newProduct?.id) {
            throw new Error("Failed to create product. Please try again.");
          }

          // Now create questionnaire linked to this product
          const { data: questionnaire, error: qError } = await supabase
            .from("questionnaires")
            .insert({
              expert_id: user.id,
              product_id: newProduct.id,
              type: "appointment",
              title: `${formData.name} - Booking Form`,
              is_active: true,
            })
            .select()
            .single();

          if (qError) {
            console.error("Error creating questionnaire:", qError);
            // If questionnaire creation fails, delete the product we just created
            await supabase.from("products").delete().eq("id", newProduct.id);
            throw new Error(`Failed to create form: ${qError.message || "Please try again."}`);
          }

          const questionnaireId = questionnaire?.id || null;

          if (!questionnaireId) {
            // If questionnaire creation failed, delete the product
            await supabase.from("products").delete().eq("id", newProduct.id);
            throw new Error("Failed to create form. Please try again.");
          }

          // Check if fields already exist
          const { data: existingFields } = await supabase
            .from("questionnaire_fields")
            .select("id, label")
            .eq("questionnaire_id", questionnaireId);

          const hasNameField = existingFields?.some(f => f.label.toLowerCase().includes("name"));
          const hasEmailField = existingFields?.some(f => f.label.toLowerCase().includes("email"));

          // Only create mandatory fields if they don't exist
          if (!hasNameField || !hasEmailField) {
            const defaultFields = [];
            if (!hasNameField) {
              defaultFields.push({ questionnaire_id: questionnaireId, field_type: "text", label: "Name", placeholder: "Enter your name", required: true, order_index: 0 });
            }
            if (!hasEmailField) {
              defaultFields.push({ questionnaire_id: questionnaireId, field_type: "email", label: "Email", placeholder: "Enter your email", required: true, order_index: 1 });
            }

            if (defaultFields.length > 0) {
              const { error: fieldsError } = await supabase
                .from("questionnaire_fields")
                .insert(defaultFields);

              if (fieldsError) {
                console.error("Error creating questionnaire fields:", fieldsError);
                throw new Error(`Failed to create form fields: ${fieldsError.message || "Please try again."}`);
              }
            }
          }

          // Fetch fields for display
          const { data: fieldsData } = await supabase
            .from("questionnaire_fields")
            .select("*")
            .eq("questionnaire_id", questionnaireId)
            .order("order_index", { ascending: true });
          setQuestionnaireFields(fieldsData || []);

          // Show questionnaire form for editing (user can add more fields)
          setShowQuestionnaireForm(true);
          setQuestionnaireType("appointment");
          setCurrentQuestionnaireId(questionnaireId);
          setCurrentProductId(newProduct.id); // Store product ID for later use
          setFieldForm({
            field_type: "text",
            label: "",
            placeholder: "",
            required: false,
            options: "",
            country_code: "+852",
          });
          
          // Store form data temporarily
          // User will click "Continue to Set Up Slots" after questionnaire is ready
          setPendingCourseData({
            name: formData.name,
            description: formData.description,
            price: "0", // Price will be set in appointment form
            category: "",
            payment_method: formData.payment_method,
            contact_email: formData.contact_type === "url" ? formData.contact_url : formData.contact_email || "",
          });
          setShowAddForm(false);
          
        } catch (err: any) {
          console.error("Error creating questionnaire:", err);
          setError(err.message || "Failed to create form. Please try again.");
          throw err;
        }
        return; // Don't create product yet - wait for questionnaire completion
      }

      setFormData({
        name: "",
        description: "",
        price: "",
        pricing_type: "one-off",
        product_type: "appointment",
        e_learning_subtype: "",
        course_id: "",
        category: "",
        payment_method: "stripe",
        contact_email: "",
        contact_url: "",
        contact_type: "email",
        coverImageUrl: "",
        enrollmentOnRequest: false,
        webinarExpiryDate: "",
        webinarDateTime: "",
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

  const handleEdit = async (product: Product) => {
    setEditingProduct(product);
    let category = "";
    let coverImageUrl = "";
    
    // If it's an e-learning product, fetch the course category and cover image
    if (product.product_type === "e-learning" && product.course_id) {
      try {
        const { data: courseData } = await supabase
          .from("courses")
          .select("category, cover_image_url")
          .eq("id", product.course_id)
          .single();
        if (courseData) {
          category = courseData.category || "";
          coverImageUrl = courseData.cover_image_url || "";
        }
      } catch (err) {
        console.error("Error fetching course data:", err);
      }
    }
    
    // For appointment products, get rate_per_hour from slots if available
    let appointmentRate = product.price.toString();
    if (product.product_type === "appointment") {
      try {
        const { data: slotsData } = await supabase
          .from("appointment_slots")
          .select("rate_per_hour")
          .eq("product_id", product.id)
          .limit(1)
          .single();
        if (slotsData?.rate_per_hour) {
          appointmentRate = slotsData.rate_per_hour.toString();
        }
      } catch (err) {
        // Use product price as fallback
      }
    }
    
    setFormData({
      name: product.name,
      description: product.description,
      price: appointmentRate,
      pricing_type: product.pricing_type,
      product_type: (product.product_type === "service" ? "appointment" : product.product_type) || "appointment",
      e_learning_subtype: product.e_learning_subtype || "",
      course_id: product.course_id || "",
      category: category,
      payment_method: product.payment_method || "stripe",
      contact_email: product.contact_email || "",
      contact_url: product.contact_email?.startsWith("http") ? product.contact_email : "",
      contact_type: product.contact_email?.startsWith("http") ? "url" as "email" | "url" : "email" as "email" | "url",
      coverImageUrl: coverImageUrl,
      enrollmentOnRequest: product.enrollment_on_request || false,
      webinarExpiryDate: product.webinar_expiry_date 
        ? new Date(product.webinar_expiry_date).toISOString().slice(0, 16) // Format for datetime-local input
        : "",
      webinarDateTime: product.webinar_date_time 
        ? new Date(product.webinar_date_time).toISOString().slice(0, 16) // Format for datetime-local input
        : "",
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

  const downloadInterestsCSV = async () => {
    if (interests.length === 0) {
      alert("No interests to download");
      return;
    }

    // Collect all unique questionnaire IDs to fetch field mappings
    const questionnaireIds = new Set<string>();
    interests.forEach((interest) => {
      if (interest.questionnaire_responses) {
        // Find questionnaire ID from product
        const product = products.find(p => p.id === interest.product_id);
        if (product) {
          // We'll need to fetch questionnaire ID from product
        }
      }
    });

    // Fetch all questionnaire fields to map field IDs to labels
    const questionnaireFieldsMap: { [questionnaireId: string]: { [fieldId: string]: string } } = {};
    const productQuestionnaireMap: { [productId: string]: string } = {};
    
    // Get questionnaire IDs for all products
    const productIds = Array.from(new Set(interests.map(i => i.product_id)));
    if (productIds.length > 0) {
      const { data: questionnaires } = await supabase
        .from("questionnaires")
        .select("id, product_id")
        .in("product_id", productIds);
      
      if (questionnaires) {
        questionnaires.forEach((q: any) => {
          productQuestionnaireMap[q.product_id] = q.id;
          questionnaireIds.add(q.id);
        });
      }
    }

    // Fetch all fields for all questionnaires
    if (questionnaireIds.size > 0) {
      const { data: fieldsData } = await supabase
        .from("questionnaire_fields")
        .select("id, questionnaire_id, label")
        .in("questionnaire_id", Array.from(questionnaireIds));
      
      if (fieldsData) {
        fieldsData.forEach((field: any) => {
          if (!questionnaireFieldsMap[field.questionnaire_id]) {
            questionnaireFieldsMap[field.questionnaire_id] = {};
          }
          questionnaireFieldsMap[field.questionnaire_id][field.id] = field.label;
        });
      }
    }

    // Collect all unique custom field labels (not IDs) from questionnaire responses
    const customFieldLabels = new Set<string>();
    interests.forEach((interest) => {
      if (interest.questionnaire_responses) {
        // questionnaire_responses already has labels as keys (from fetchInterests)
        Object.keys(interest.questionnaire_responses).forEach((label) => {
          customFieldLabels.add(label);
        });
      }
    });

    // Build headers: standard fields + custom fields (using labels)
    const headers = [
      "Product Name",
      "User Name",
      "User Email",
      "Phone Number",
      "Registered Date",
      ...Array.from(customFieldLabels).sort(),
    ];

    // Build rows with custom field data
    const rows = interests.map((interest) => {
      const baseRow = [
        interest.product_name,
        interest.user_name,
        interest.user_email,
        interest.country_code && interest.phone_number 
          ? `${interest.country_code} ${interest.phone_number}` 
          : interest.phone_number || "",
        new Date(interest.created_at).toLocaleDateString(),
      ];

      // Add custom field values in the same order as headers (using labels)
      const customValues = Array.from(customFieldLabels).map((fieldLabel) => {
        const value = interest.questionnaire_responses?.[fieldLabel];
        if (value === null || value === undefined) return "";
        if (Array.isArray(value)) return value.join("; ");
        return String(value);
      });

      return [...baseRow, ...customValues];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
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
      {/* Profile Listing Reminder */}
      {isProfileListed === false && activeTab === "products" && (
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-yellow-400 text-xl">⚠️</span>
            <div className="flex-1">
              <p className="text-sm text-yellow-400 font-semibold mb-1">
                List your profile publicly to make your products visible
              </p>
              <p className="text-xs text-yellow-300/80 mb-2">
                Your products will only be visible to you unless you list your profile on the marketplace. This allows other users to discover and purchase your products.
              </p>
              <a
                href="/profile"
                className="text-xs text-yellow-400 underline hover:text-yellow-300"
              >
                Go to Profile Settings →
              </a>
            </div>
          </div>
        </div>
      )}

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
                product_type: "e-learning",
                e_learning_subtype: "",
                course_id: "",
                category: "",
                payment_method: "stripe",
                contact_email: "",
                contact_url: "",
                contact_type: "email",
                coverImageUrl: "",
                enrollmentOnRequest: false,
                webinarExpiryDate: "",
                webinarDateTime: "",
              });
            }}
            className="bg-cyber-green text-custom-text px-4 py-2 rounded-lg font-semibold hover:bg-cyber-green-light transition-colors shadow-[0_0_15px_rgba(0,255,136,0.3)]"
          >
            + Add Product
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 border-b border-cyber-green/30 scrollbar-hide">
        <div className="flex gap-3 sm:gap-6 min-w-max pb-1">
          <button
            onClick={() => setActiveTab("products")}
            className={`px-4 sm:px-6 py-2.5 sm:py-3 font-semibold transition-colors whitespace-nowrap text-sm sm:text-base ${
              activeTab === "products"
                ? "text-cyber-green border-b-2 border-cyber-green"
                : "text-custom-text/70 hover:text-custom-text"
            }`}
          >
            My Products ({products.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("interests");
              fetchInterests(); // Fetch interests when tab is clicked
            }}
            className={`px-4 sm:px-6 py-2.5 sm:py-3 font-semibold transition-colors whitespace-nowrap text-sm sm:text-base ${
              activeTab === "interests"
                ? "text-cyber-green border-b-2 border-cyber-green"
                : "text-custom-text/70 hover:text-custom-text"
            }`}
          >
            Registered Interests ({Object.values(interestCounts).reduce((sum, count) => sum + count, 0)})
          </button>
        </div>
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
                Title of your product *
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
              <label className="block text-sm font-medium text-custom-text mb-2">
                Product Type *
              </label>
              <select
                value={formData.product_type}
                onChange={(e) => {
                  const newType = e.target.value as "e-learning" | "appointment";
                  setFormData({
                    ...formData,
                    product_type: newType,
                    e_learning_subtype: newType === "e-learning" ? "" : "",
                    course_id: "",
                    price: "",
                  });
                }}
                className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg focus:ring-2 focus:ring-cyber-green focus:border-cyber-green text-custom-text"
                required
              >
                <option value="e-learning">e-Learning</option>
                <option value="appointment">1-on-1 Session</option>
              </select>
              <p className="text-xs text-custom-text/60 mt-1">
                {formData.product_type === "e-learning" && "Create an e-learning product with lessons. You can add lessons now or skip and add them later."}
                {formData.product_type === "appointment" && "Create a 1-on-1 session service. After adding description, you'll set up appointment slots and pricing."}
              </p>
            </div>

            {formData.product_type === "e-learning" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-custom-text mb-2">
                    e-Learning Sub-type *
                  </label>
                  <select
                    value={formData.e_learning_subtype}
                    onChange={(e) => setFormData({ ...formData, e_learning_subtype: e.target.value as "online-course" | "ebook" | "ai-prompt" | "live-webinar" | "other" })}
                    className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg focus:ring-2 focus:ring-cyber-green focus:border-cyber-green text-custom-text"
                    required
                  >
                    <option value="">Select sub-type</option>
                    <option value="online-course">Online Course</option>
                    <option value="ebook">Ebook</option>
                    <option value="ai-prompt">AI Prompt</option>
                    <option value="live-webinar">Live Webinar</option>
                    <option value="other">Other</option>
                  </select>
                  <p className="text-xs text-custom-text/60 mt-1">Categorize your e-learning product</p>
                </div>
                
                {/* Webinar Date/Time and Expiry Date - only show for live webinar */}
                {formData.e_learning_subtype === "live-webinar" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-custom-text mb-2">
                        Webinar Date & Time (Hong Kong Time) *
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.webinarDateTime}
                        onChange={(e) => setFormData({ ...formData, webinarDateTime: e.target.value })}
                        className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg focus:ring-2 focus:ring-cyber-green focus:border-cyber-green text-custom-text"
                        required={formData.e_learning_subtype === "live-webinar"}
                      />
                      <p className="text-xs text-custom-text/60 mt-1">When the live webinar will take place</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-custom-text mb-2">
                        Registration Expiry Date (Hong Kong Time) *
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.webinarExpiryDate}
                        onChange={(e) => setFormData({ ...formData, webinarExpiryDate: e.target.value })}
                        className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg focus:ring-2 focus:ring-cyber-green focus:border-cyber-green text-custom-text"
                        required={formData.e_learning_subtype === "live-webinar"}
                      />
                      <p className="text-xs text-custom-text/60 mt-1">Registration will close after this date</p>
                    </div>
                  </>
                )}
              </>
            )}

            {formData.product_type === "e-learning" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-custom-text mb-2">
                    Topic *
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg focus:ring-2 focus:ring-cyber-green focus:border-cyber-green text-custom-text"
                    placeholder="e.g., AI Courses, Business, Design, Marketing"
                    required
                  />
                  <p className="text-xs text-custom-text/60 mt-1">Choose a topic to help users discover your course</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-custom-text mb-2">
                    Cover Photo
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverImageUpload}
                    disabled={uploadingImage}
                    className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text focus:ring-2 focus:ring-cyber-green focus:border-cyber-green"
                  />
                  {uploadingImage && (
                    <p className="text-xs text-custom-text/60 mt-1">Uploading image...</p>
                  )}
                  {formData.coverImageUrl && (
                    <div className="mt-4">
                      <img
                        src={formData.coverImageUrl}
                        alt="Cover preview"
                        className="max-w-md rounded-lg border border-cyber-green/30"
                      />
                    </div>
                  )}
                  <p className="text-xs text-custom-text/60 mt-1">Upload a cover image for your course (max 5MB)</p>
                </div>
              </>
            )}

            {/* Price field - hidden for appointments (price set in appointment form) */}
            {formData.product_type !== "appointment" && (
              <div>
                <label className="block text-sm font-medium text-custom-text mb-2">
                  Price (USD) *
                </label>
                <div className="flex flex-col gap-3 mb-2">
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-32 px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg focus:ring-2 focus:ring-cyber-green focus:border-cyber-green text-custom-text"
                      placeholder="0.00"
                      required={!formData.enrollmentOnRequest}
                      disabled={formData.enrollmentOnRequest}
                    />
                    <label className="flex items-center gap-2 text-custom-text">
                      <input
                        type="checkbox"
                        checked={(formData.price === "0" || formData.price === "") && !formData.enrollmentOnRequest}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, price: "0", enrollmentOnRequest: false });
                          } else {
                            // Unchecking free - set price to empty if it was "0"
                            setFormData({ ...formData, price: formData.price === "0" ? "" : formData.price });
                          }
                        }}
                        className="h-4 w-4 text-cyber-green focus:ring-cyber-green border-gray-300 rounded"
                        disabled={formData.enrollmentOnRequest}
                      />
                      <span className="text-sm">Free</span>
                    </label>
                    <label className="flex items-center gap-2 text-custom-text">
                      <input
                        type="checkbox"
                        checked={formData.enrollmentOnRequest}
                        onChange={(e) => {
                          setFormData({ 
                            ...formData, 
                            enrollmentOnRequest: e.target.checked,
                            // Don't set price to "0" when checking on request - leave it as is
                            // But clear it if it was "0" (free) to avoid confusion
                            price: e.target.checked && formData.price === "0" ? "" : formData.price
                          });
                        }}
                        className="h-4 w-4 text-cyber-green focus:ring-cyber-green border-gray-300 rounded"
                      />
                      <span className="text-sm">Enrollment on Request</span>
                    </label>
                  </div>
                  {formData.enrollmentOnRequest && (
                    <p className="text-xs text-custom-text/60 italic">
                      Note: This means price will not be displayed. Users will need to contact you directly for enrollment.
                    </p>
                  )}
                </div>
              </div>
            )}

            {formData.price && parseFloat(formData.price) > 0 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-custom-text mb-2">
                    Payment Method *
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => {
                      const method = e.target.value as "stripe" | "offline";
                      setFormData({
                        ...formData,
                        payment_method: method,
                        contact_email: method === "offline" && !formData.contact_email && !formData.contact_url ? (user?.email || "") : formData.contact_email,
                        contact_url: method === "offline" && formData.contact_type === "url" ? formData.contact_url : "",
                        contact_type: method === "offline" ? (formData.contact_type || "email") : "email",
                      });
                    }}
                    className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg focus:ring-2 focus:ring-cyber-green focus:border-cyber-green text-custom-text"
                    required
                  >
                    <option value="stripe">Stripe (Online Payment)</option>
                    <option value="offline">Offline Payment (Show Contact Email)</option>
                  </select>
                  <p className="text-xs text-custom-text/60 mt-1">
                    {formData.payment_method === "stripe" && "Users will pay via Stripe checkout. Make sure you have set up your Stripe account."}
                    {formData.payment_method === "offline" && "Users will see your contact email and can transact offline. After payment, you can manually add them to the course."}
                  </p>
                </div>

                {formData.payment_method === "offline" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-custom-text mb-2">
                        Contact Type *
                      </label>
                      <select
                        value={formData.contact_type}
                        onChange={(e) => setFormData({ ...formData, contact_type: e.target.value as "email" | "url", contact_email: "", contact_url: "" })}
                        className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg focus:ring-2 focus:ring-cyber-green focus:border-cyber-green text-custom-text"
                        required
                      >
                        <option value="email">Email</option>
                        <option value="url">URL</option>
                      </select>
                    </div>
                    {formData.contact_type === "email" && (
                      <div>
                        <label className="block text-sm font-medium text-custom-text mb-2">
                          Contact Email *
                        </label>
                        <input
                          type="email"
                          value={formData.contact_email}
                          onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                          className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg focus:ring-2 focus:ring-cyber-green focus:border-cyber-green text-custom-text"
                          placeholder="your@email.com"
                          required
                        />
                        <p className="text-xs text-custom-text/60 mt-1">This email will be shown to users for offline payment transactions</p>
                      </div>
                    )}
                    {formData.contact_type === "url" && (
                      <div>
                        <label className="block text-sm font-medium text-custom-text mb-2">
                          Contact URL *
                        </label>
                        <input
                          type="url"
                          value={formData.contact_url}
                          onChange={(e) => setFormData({ ...formData, contact_url: e.target.value })}
                          className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg focus:ring-2 focus:ring-cyber-green focus:border-cyber-green text-custom-text"
                          placeholder="https://example.com/contact"
                          required
                        />
                        <p className="text-xs text-custom-text/60 mt-1">This URL will be shown to users for offline payment transactions</p>
                      </div>
                    )}
                  </div>
                )}

                {formData.payment_method === "stripe" && !stripeAccountId && (
                  <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                    <p className="text-sm text-yellow-400">
                      ⚠️ You need to set up a Stripe account to accept online payments.{" "}
                      <a href="/dashboard/stripe-connect" className="underline hover:text-yellow-300">
                        Set up Stripe account
                      </a>
                    </p>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-custom-text mb-2">Description of your product *</label>
              <RichTextEditor
                content={formData.description}
                onChange={(newContent) => setFormData({ ...formData, description: newContent })}
                placeholder="This e-learning is a full course/ a ebook for download…"
              />
            </div>
            <div className="flex gap-4">
              <button
                type="submit"
                className="bg-cyber-green text-custom-text px-6 py-2 rounded-lg font-semibold hover:bg-cyber-green-light transition-colors shadow-[0_0_15px_rgba(0,255,136,0.3)]"
              >
                {editingProduct 
                  ? "Update Product" 
                  : formData.product_type === "e-learning" 
                    ? "Next: Create Form" 
                    : "Next: Set Up Sessions"}
              </button>
              {editingProduct && editingProduct.product_type === "appointment" && (
                <Link
                  href="/appointments/manage"
                  className="px-6 py-2 bg-blue-900/30 text-blue-200 border border-blue-500/50 rounded-lg hover:bg-blue-900/50 transition-colors text-center"
                >
                  Manage Timeslots
                </Link>
              )}
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
                    product_type: "appointment",
                    e_learning_subtype: "",
                    course_id: "",
                    category: "",
                    payment_method: "stripe",
                    contact_email: "",
                    contact_url: "",
                    contact_type: "email",
                    coverImageUrl: "",
                    enrollmentOnRequest: false,
                    webinarExpiryDate: "",
                    webinarDateTime: "",
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

      {/* Appointment Form (Embedded) */}
      {showAppointmentForm && currentProductId && (
        <div className="bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 rounded-xl p-6 mb-6">
          <h3 className="text-xl font-bold text-custom-text mb-4">Set Up Appointment Slots</h3>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!user || !currentProductId) return;

            try {
              const date = appointmentFormData.date;
              const startTime = appointmentFormData.startTime;
              const endTime = appointmentFormData.endTime;
              const intervalMinutes = parseInt(appointmentFormData.intervalMinutes);
              const ratePerHour = parseFloat(appointmentFormData.ratePerHour);

              const startDateTime = new Date(`${date}T${startTime}`);
              const endDateTime = new Date(`${date}T${endTime}`);

              if (endDateTime <= startDateTime) {
                alert("End time must be after start time");
                return;
              }

              const slots = [];
              let currentTime = new Date(startDateTime);

              while (currentTime < endDateTime) {
                const slotEnd = new Date(currentTime.getTime() + intervalMinutes * 60000);
                if (slotEnd > endDateTime) break;

                slots.push({
                  expert_id: user.id,
                  product_id: currentProductId,
                  start_time: currentTime.toISOString(),
                  end_time: slotEnd.toISOString(),
                  rate_per_hour: ratePerHour,
                  is_available: true,
                });

                currentTime = slotEnd;
              }

              if (slots.length === 0) {
                alert("No slots could be created with the given time range and interval.");
                return;
              }

              const { error } = await supabase.from("appointment_slots").insert(slots);
              if (error) {
                console.error("Error inserting slots:", error);
                throw error;
              }
              
              console.log(`✅ Created ${slots.length} slots with product_id: ${currentProductId}`);
              
              // Refresh slots in Manage Appointments page by triggering a page reload hint
              // Note: User will need to navigate to Manage Appointments to see them
              alert(`Successfully created ${slots.length} appointment slot(s)! They will be visible in the Manage Appointments page.`);

              // Update product with price (rate per hour) and create Stripe product if paid
              if (ratePerHour > 0) {
                // Calculate price for one hour session (for Stripe product)
                const sessionPrice = ratePerHour;
                
                // Create Stripe product for paid appointments
                let stripeProductId: string | null = null;
                let stripePriceId: string | null = null;
                
                if (stripeAccountId) {
                  // Get product details
                  const { data: productData } = await supabase
                    .from("products")
                    .select("name, description")
                    .eq("id", currentProductId)
                    .single();
                  
                  if (productData) {
                    const stripeResult = await createStripeProduct(
                      productData.name,
                      productData.description,
                      sessionPrice,
                      currentProductId
                    );
                    stripeProductId = stripeResult.stripeProductId;
                    stripePriceId = stripeResult.stripePriceId;
                  }
                }

                // Update product with price and Stripe IDs
                const { error: updateError } = await supabase
                  .from("products")
                  .update({
                    price: sessionPrice,
                    stripe_product_id: stripeProductId,
                    stripe_price_id: stripePriceId,
                  })
                  .eq("id", currentProductId);

                if (updateError) {
                  console.error("Error updating product price:", updateError);
                  // Don't throw - slots are created, just price update failed
                }
              }

              alert(`Successfully created ${slots.length} appointment slots! Your appointment service is now published.`);
              // Close appointment form - product is now complete
              setShowAppointmentForm(false);
              setCurrentProductId(null);
              fetchProducts();
            } catch (err: any) {
              console.error("Error creating slots:", err);
              alert("Failed to create appointment slots. Please try again.");
            }
          }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-custom-text mb-2">Date *</label>
                <input
                  type="date"
                  value={appointmentFormData.date}
                  onChange={(e) => setAppointmentFormData({ ...appointmentFormData, date: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-custom-text mb-2">Start Time *</label>
                <input
                  type="time"
                  value={appointmentFormData.startTime}
                  onChange={(e) => setAppointmentFormData({ ...appointmentFormData, startTime: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-custom-text mb-2">End Time *</label>
                <input
                  type="time"
                  value={appointmentFormData.endTime}
                  onChange={(e) => setAppointmentFormData({ ...appointmentFormData, endTime: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-custom-text mb-2">Session Duration *</label>
                <select
                  value={appointmentFormData.intervalMinutes}
                  onChange={(e) => setAppointmentFormData({ ...appointmentFormData, intervalMinutes: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                  required
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-custom-text mb-2">Rate per Hour (USD) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={appointmentFormData.ratePerHour}
                onChange={(e) => setAppointmentFormData({ ...appointmentFormData, ratePerHour: e.target.value })}
                className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                required
              />
            </div>
            <div className="flex gap-4">
              <button
                type="submit"
                className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
              >
                Create Slots
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAppointmentForm(false);
                  setCurrentProductId(null);
                }}
                className="px-6 py-3 border border-cyber-green/30 text-custom-text rounded-lg hover:bg-dark-green-800/50 transition-colors"
              >
                Skip for Now
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Questionnaire Form (Embedded) */}
      {showQuestionnaireForm && questionnaireType && (
        <div className="bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 rounded-xl p-6 mb-6">
          <h3 className="text-xl font-bold text-custom-text mb-4">
            {questionnaireType === "course_enrollment" ? "Create Enrollment Form (Required)" : "Create Appointment Booking Form"}
          </h3>
          <p className="text-sm text-custom-text/70 mb-6">
            {questionnaireType === "course_enrollment" 
              ? "Create a form for users to fill out before enrolling. Name and Email fields are already added and are required. You can add more fields if needed. Click 'Publish Course' when ready."
              : "Add custom questions for users to fill out before booking."}
          </p>

          {/* Existing Fields List */}
          {questionnaireFields.length > 0 && (
            <div className="mb-6 space-y-2">
              {questionnaireFields.map((field, index) => (
                <div key={field.id || index} className="bg-dark-green-900/50 border border-cyber-green/30 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex-1">
                    <span className="text-custom-text font-semibold">{field.label}</span>
                    <span className="text-custom-text/60 text-sm ml-2">({field.field_type})</span>
                    {field.required && <span className="text-red-400 text-sm ml-2">*</span>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingField(field);
                        setFieldForm({
                          field_type: field.field_type,
                          label: field.label,
                          placeholder: field.placeholder || "",
                          required: field.required,
                          options: field.options ? (Array.isArray(field.options) ? field.options.join(", ") : "") : "",
                          country_code: (field as any).country_code || "+852",
                        });
                        setShowFieldForm(true);
                      }}
                      className="text-cyber-green hover:text-cyber-green-light text-sm"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm("Delete this field?")) return;
                        try {
                          if (field.id && currentQuestionnaireId) {
                            const { error } = await supabase
                              .from("questionnaire_fields")
                              .delete()
                              .eq("id", field.id);
                            if (error) throw error;
                          }
                          setQuestionnaireFields(questionnaireFields.filter((_, i) => i !== index));
                        } catch (err) {
                          console.error("Error deleting field:", err);
                          alert("Failed to delete field.");
                        }
                      }}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add/Edit Field Form */}
          {showFieldForm && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!user || !currentQuestionnaireId) return;

              try {
                const options = fieldForm.field_type === "select" || fieldForm.field_type === "radio" || fieldForm.field_type === "checkbox"
                  ? fieldForm.options.split(",").map(o => o.trim()).filter(Boolean)
                  : null;

                if (editingField && editingField.id) {
                  // Update existing field
                  const { error } = await supabase
                    .from("questionnaire_fields")
                    .update({
                      field_type: fieldForm.field_type,
                      label: fieldForm.label,
                      placeholder: fieldForm.placeholder || null,
                      required: fieldForm.required,
                      options: options && options.length > 0 ? options : null,
                    })
                    .eq("id", editingField.id);
                  if (error) throw error;
                  setQuestionnaireFields(questionnaireFields.map(f => f.id === editingField.id ? { ...f, ...fieldForm, options } : f));
                  setEditingField(null);
                } else {
                  // Add new field(s)
                  if (fieldForm.field_type === "phone") {
                    // Create two fields: country code (select) and phone number (text)
                    const countryCodeField = {
                      questionnaire_id: currentQuestionnaireId,
                      field_type: "select" as const,
                      label: `${fieldForm.label} - Country Code`,
                      placeholder: null,
                      required: fieldForm.required,
                      options: ["+852", "+1", "+44", "+86", "+81", "+82", "+65", "+60", "+66", "+61", "+64", "+91", "+49", "+33", "+39", "+34", "+31", "+32", "+41", "+46", "+47", "+45", "+358", "+351", "+353", "+7", "+971", "+966", "+55", "+52", "+27", "+20", "+234", "+62", "+63", "+84", "+886"],
                      order_index: questionnaireFields.length,
                    };
                    const phoneNumberField = {
                      questionnaire_id: currentQuestionnaireId,
                      field_type: "text" as const,
                      label: `${fieldForm.label} - Phone Number`,
                      placeholder: fieldForm.placeholder || "Enter your phone number",
                      required: fieldForm.required,
                      options: null,
                      order_index: questionnaireFields.length + 1,
                    };
                    const { data: data1, error: error1 } = await supabase.from("questionnaire_fields").insert(countryCodeField).select().single();
                    if (error1) throw error1;
                    const { data: data2, error: error2 } = await supabase.from("questionnaire_fields").insert(phoneNumberField).select().single();
                    if (error2) throw error2;
                    setQuestionnaireFields([...questionnaireFields, data1, data2]);
                  } else {
                    const newField = {
                      questionnaire_id: currentQuestionnaireId,
                      field_type: fieldForm.field_type,
                      label: fieldForm.label,
                      placeholder: fieldForm.placeholder || null,
                      required: fieldForm.required,
                      options: options && options.length > 0 ? options : null,
                      order_index: questionnaireFields.length,
                    };
                    const { data, error } = await supabase.from("questionnaire_fields").insert(newField).select().single();
                    if (error) throw error;
                    setQuestionnaireFields([...questionnaireFields, data]);
                  }
                }

                setFieldForm({
                  field_type: "text",
                  label: "",
                  placeholder: "",
                  required: false,
                  options: "",
                  country_code: "+852",
                });
                setShowFieldForm(false);
              } catch (err: any) {
                console.error("Error saving field:", err);
                alert("Failed to save field. Please try again.");
              }
            }} className="space-y-4 mb-4 bg-dark-green-900/30 p-4 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-custom-text mb-2">Field Type *</label>
                <select
                  value={fieldForm.field_type}
                  onChange={(e) => setFieldForm({ ...fieldForm, field_type: e.target.value as any })}
                  className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                  required
                >
                  <option value="text">Text</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone Number</option>
                  <option value="select">Select</option>
                  <option value="radio">Radio</option>
                  <option value="checkbox">Checkbox</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-custom-text mb-2">Label *</label>
                <input
                  type="text"
                  value={fieldForm.label}
                  onChange={(e) => setFieldForm({ ...fieldForm, label: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-custom-text mb-2">Placeholder</label>
                <input
                  type="text"
                  value={fieldForm.placeholder}
                  onChange={(e) => setFieldForm({ ...fieldForm, placeholder: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                />
              </div>
              {fieldForm.field_type === "phone" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-custom-text mb-2">Country Code *</label>
                    <select
                      value={fieldForm.country_code || "+852"}
                      onChange={(e) => setFieldForm({ ...fieldForm, country_code: e.target.value })}
                      className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                      required
                    >
                      <option value="+852">🇭🇰 Hong Kong (+852)</option>
                      <option value="+1">🇺🇸 United States (+1)</option>
                      <option value="+44">🇬🇧 United Kingdom (+44)</option>
                      <option value="+86">🇨🇳 China (+86)</option>
                      <option value="+81">🇯🇵 Japan (+81)</option>
                      <option value="+82">🇰🇷 South Korea (+82)</option>
                      <option value="+65">🇸🇬 Singapore (+65)</option>
                      <option value="+60">🇲🇾 Malaysia (+60)</option>
                      <option value="+66">🇹🇭 Thailand (+66)</option>
                      <option value="+61">🇦🇺 Australia (+61)</option>
                      <option value="+64">🇳🇿 New Zealand (+64)</option>
                      <option value="+91">🇮🇳 India (+91)</option>
                      <option value="+49">🇩🇪 Germany (+49)</option>
                      <option value="+33">🇫🇷 France (+33)</option>
                      <option value="+39">🇮🇹 Italy (+39)</option>
                      <option value="+34">🇪🇸 Spain (+34)</option>
                      <option value="+31">🇳🇱 Netherlands (+31)</option>
                      <option value="+32">🇧🇪 Belgium (+32)</option>
                      <option value="+41">🇨🇭 Switzerland (+41)</option>
                      <option value="+46">🇸🇪 Sweden (+46)</option>
                      <option value="+47">🇳🇴 Norway (+47)</option>
                      <option value="+45">🇩🇰 Denmark (+45)</option>
                      <option value="+358">🇫🇮 Finland (+358)</option>
                      <option value="+351">🇵🇹 Portugal (+351)</option>
                      <option value="+353">🇮🇪 Ireland (+353)</option>
                      <option value="+7">🇷🇺 Russia (+7)</option>
                      <option value="+971">🇦🇪 UAE (+971)</option>
                      <option value="+966">🇸🇦 Saudi Arabia (+966)</option>
                      <option value="+55">🇧🇷 Brazil (+55)</option>
                      <option value="+52">🇲🇽 Mexico (+52)</option>
                      <option value="+27">🇿🇦 South Africa (+27)</option>
                      <option value="+20">🇪🇬 Egypt (+20)</option>
                      <option value="+234">🇳🇬 Nigeria (+234)</option>
                      <option value="+62">🇮🇩 Indonesia (+62)</option>
                      <option value="+63">🇵🇭 Philippines (+63)</option>
                      <option value="+84">🇻🇳 Vietnam (+84)</option>
                      <option value="+886">🇹🇼 Taiwan (+886)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-custom-text mb-2">Phone Number Label *</label>
                    <input
                      type="text"
                      value={fieldForm.label}
                      onChange={(e) => setFieldForm({ ...fieldForm, label: e.target.value })}
                      className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                      placeholder="e.g., Phone Number, Mobile Number"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-custom-text mb-2">Placeholder</label>
                    <input
                      type="text"
                      value={fieldForm.placeholder}
                      onChange={(e) => setFieldForm({ ...fieldForm, placeholder: e.target.value })}
                      className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                      placeholder="e.g., Enter your phone number"
                    />
                  </div>
                </div>
              )}
              {(fieldForm.field_type === "select" || fieldForm.field_type === "radio" || fieldForm.field_type === "checkbox") && (
                <div>
                  <label className="block text-sm font-medium text-custom-text mb-2">Options (comma-separated) *</label>
                  <input
                    type="text"
                    value={fieldForm.options}
                    onChange={(e) => setFieldForm({ ...fieldForm, options: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                    placeholder="Option 1, Option 2, Option 3"
                    required
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={fieldForm.required}
                  onChange={(e) => setFieldForm({ ...fieldForm, required: e.target.checked })}
                  className="w-4 h-4 text-cyber-green focus:ring-cyber-green border-gray-300 rounded"
                />
                <label className="text-sm text-custom-text">Required field</label>
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
                >
                  {editingField ? "Update Field" : "Add Field"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowFieldForm(false);
                    setEditingField(null);
                    setFieldForm({
                      field_type: "text",
                      label: "",
                      placeholder: "",
                      required: false,
                      options: "",
                      country_code: "+852",
                    });
                  }}
                  className="px-6 py-3 border border-cyber-green/30 text-custom-text rounded-lg hover:bg-dark-green-800/50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Field Templates */}
          {!showFieldForm && questionnaireFields.length === 0 && (
            <div className="mb-6">
              <p className="text-sm text-custom-text/70 mb-4">Quick add common fields:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { type: "text", label: "Phone Number", placeholder: "Enter your phone number", required: true },
                  { type: "text", label: "Country Code", placeholder: "+1, +852, etc.", required: false },
                  { type: "textarea", label: "Message", placeholder: "Tell us about your interest...", required: false },
                  { type: "select", label: "Preferred Contact Method", options: "Email, Phone, WhatsApp", required: false },
                  { type: "text", label: "Company/Organization", placeholder: "Optional", required: false },
                  { type: "text", label: "Job Title", placeholder: "Optional", required: false },
                ].map((template, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={async () => {
                      if (!currentQuestionnaireId && user) {
                        // Create questionnaire if needed
                        try {
                          const type = questionnaireType === "course_enrollment" ? "course_interest" : "appointment";
                          const { data, error } = await supabase
                            .from("questionnaires")
                            .insert({
                              expert_id: user.id,
                              type,
                              title: questionnaireType === "course_enrollment" ? "Course Enrollment Questionnaire" : "Appointment Questionnaire",
                              is_active: true,
                            })
                            .select()
                            .single();
                          if (error && error.code !== "23505") throw error;
                          if (error && error.code === "23505") {
                            const { data: existing } = await supabase
                              .from("questionnaires")
                              .select("id")
                              .eq("expert_id", user.id)
                              .eq("type", type)
                              .maybeSingle();
                            if (existing) setCurrentQuestionnaireId(existing.id);
                          } else if (data) {
                            setCurrentQuestionnaireId(data.id);
                          }
                        } catch (err) {
                          console.error("Error creating questionnaire:", err);
                        }
                      }
                      if (!currentQuestionnaireId) {
                        alert("Please create questionnaire first");
                        return;
                      }
                      try {
                        const options = template.options ? template.options.split(",").map(o => o.trim()) : null;
                        const { data, error } = await supabase
                          .from("questionnaire_fields")
                          .insert({
                            questionnaire_id: currentQuestionnaireId,
                            field_type: template.type,
                            label: template.label,
                            placeholder: template.placeholder,
                            required: template.required,
                            options: options,
                            order_index: questionnaireFields.length,
                          })
                          .select()
                          .single();
                        if (error) throw error;
                        setQuestionnaireFields([...questionnaireFields, data]);
                      } catch (err: any) {
                        console.error("Error adding template field:", err);
                        alert("Failed to add field. Please try again.");
                      }
                    }}
                    className="px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text hover:bg-dark-green-800/50 transition-colors text-left"
                  >
                    <div className="font-semibold">{template.label}</div>
                    <div className="text-xs text-custom-text/60">{template.type}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 mt-6">
            {!showFieldForm && (
              <button
                type="button"
                onClick={async () => {
                  // Create questionnaire if it doesn't exist
                  if (!currentQuestionnaireId && user) {
                    try {
                      const type = questionnaireType === "course_enrollment" ? "course_interest" : "appointment";
                      const { data, error } = await supabase
                        .from("questionnaires")
                        .insert({
                          expert_id: user.id,
                          type,
                          title: questionnaireType === "course_enrollment" ? "Course Enrollment Questionnaire" : "Appointment Questionnaire",
                          is_active: true,
                        })
                        .select()
                        .single();
                      if (error) throw error;
                      setCurrentQuestionnaireId(data.id);
                    } catch (err: any) {
                      console.error("Error creating questionnaire:", err);
                      if (err.code === "23505") {
                        // Questionnaire already exists, fetch it
                        const type = questionnaireType === "course_enrollment" ? "course_interest" : "appointment";
                        const { data } = await supabase
                          .from("questionnaires")
                          .select("id")
                          .eq("expert_id", user.id)
                          .eq("type", type)
                          .single();
                        if (data) {
                          setCurrentQuestionnaireId(data.id);
                          const { data: fieldsData } = await supabase
                            .from("questionnaire_fields")
                            .select("*")
                            .eq("questionnaire_id", data.id)
                            .order("order_index", { ascending: true });
                          if (fieldsData) setQuestionnaireFields(fieldsData);
                        }
                      } else {
                        alert("Failed to create questionnaire.");
                      }
                    }
                  }
                  setShowFieldForm(true);
                }}
                className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
              >
                + Add Custom Field
              </button>
            )}
            {questionnaireType === "course_enrollment" ? (
              <button
                type="button"
                onClick={async () => {
                  // Questionnaire is mandatory - ensure it has at least name and email fields
                  if (questionnaireFields.length === 0) {
                    alert("Please add at least Name and Email fields to your form. This is required.");
                    return;
                  }
                  
                  // Verify name and email fields exist
                  const hasName = questionnaireFields.some(f => 
                    f.label.toLowerCase().includes("name") && f.field_type === "text"
                  );
                  const hasEmail = questionnaireFields.some(f => 
                    f.label.toLowerCase().includes("email") && f.field_type === "email"
                  );
                  
                  if (!hasName || !hasEmail) {
                    alert("Your form must include both Name (text field) and Email (email field). Please add these fields.");
                    return;
                  }
                  
                  // Course and product already created - just publish the course
                  if (!currentCourseId || !user) {
                    alert("Course data not found. Please start over.");
                    return;
                  }
                  
                  try {
                    // Publish the course (it was created with published: false)
                    const { error: publishError } = await supabase
                      .from("courses")
                      .update({ published: true })
                      .eq("id", currentCourseId)
                      .eq("expert_id", user.id);

                    if (publishError) throw publishError;

                    // Create Stripe product if paid course and not already created
                    if (currentProductId) {
                      const { data: product } = await supabase
                        .from("products")
                        .select("price, stripe_product_id, stripe_price_id")
                        .eq("id", currentProductId)
                        .single();

                      if (product && product.price > 0 && !product.stripe_product_id && stripeAccountId) {
                        const { data: course } = await supabase
                          .from("courses")
                          .select("title, description")
                          .eq("id", currentCourseId)
                          .single();

                        if (course) {
                          const stripeResult = await createStripeProduct(
                            course.title,
                            course.description,
                            product.price,
                            currentProductId
                          );

                          if (stripeResult.stripeProductId) {
                            await supabase
                              .from("products")
                              .update({
                                stripe_product_id: stripeResult.stripeProductId,
                                stripe_price_id: stripeResult.stripePriceId,
                              })
                              .eq("id", currentProductId);
                          }
                        }
                      }
                    }
                    
                    // Reset form and close questionnaire form
                    setShowQuestionnaireForm(false);
                    setCurrentProductId(null);
                    setCurrentCourseId(null);
                    setQuestionnaireType(null);
                    setCurrentQuestionnaireId(null);
                    setQuestionnaireFields([]);
                    setPendingCourseData(null);
                    setFormData({
                      name: "",
                      description: "",
                      price: "",
                      pricing_type: "one-off",
                      product_type: "appointment",
                      e_learning_subtype: "",
                      course_id: "",
                      category: "",
                      payment_method: "stripe",
                      contact_email: "",
                      contact_url: "",
                      contact_type: "email",
                      coverImageUrl: "",
                      enrollmentOnRequest: false,
                      webinarExpiryDate: "",
                      webinarDateTime: "",
                    });
                    fetchProducts();
                    alert("Course published successfully! Your course is now live.");
                  } catch (err: any) {
                    console.error("Error publishing course:", err);
                    alert(`Failed to publish course: ${err.message || "Please try again."}`);
                  }
                }}
                className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
              >
                Publish Product
              </button>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  // Check if editing - if so, just save the questionnaire and return
                  if (editingProduct && editingProduct.product_type === "appointment") {
                    // Just save questionnaire updates, don't create new product or show appointment form
                    setShowQuestionnaireForm(false);
                    setQuestionnaireType(null);
                    setCurrentQuestionnaireId(null);
                    setQuestionnaireFields([]);
                    setShowAddForm(false);
                    setEditingProduct(null);
                    fetchProducts();
                    alert("Product updated successfully!");
                    return;
                  }
                  
                  // Questionnaire is mandatory - ensure it has at least name and email fields
                  if (questionnaireFields.length === 0) {
                    alert("Please add at least Name and Email fields to your form. This is required.");
                    return;
                  }
                  
                  // Verify name and email fields exist
                  const hasName = questionnaireFields.some(f => 
                    f.label.toLowerCase().includes("name") && f.field_type === "text"
                  );
                  const hasEmail = questionnaireFields.some(f => 
                    f.label.toLowerCase().includes("email") && f.field_type === "email"
                  );
                  
                  if (!hasName || !hasEmail) {
                    alert("Your form must include both Name (text field) and Email (email field). Please add these fields.");
                    return;
                  }
                  
                  try {
                    // Questionnaire is already linked to product (created with product_id)
                    // Just show appointment form to set up slots
                    if (!currentProductId) {
                      alert("Product ID not found. Please start over.");
                      return;
                    }

                    // Show appointment form
                    setShowQuestionnaireForm(false);
                    setShowAppointmentForm(true);
                    
                    // Reset questionnaire form state
                    setQuestionnaireType(null);
                    setCurrentQuestionnaireId(null);
                    setQuestionnaireFields([]);
                    setPendingCourseData(null);
                    
                    alert("Form saved! Now set up your appointment slots and pricing.");
                  } catch (err: any) {
                    console.error("Error setting up appointment:", err);
                    alert(`Failed to set up appointment: ${err.message || "Please try again."}`);
                  }
                }}
                className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
              >
                {editingProduct && editingProduct.product_type === "appointment" ? "Save Updates" : "Continue to Set Up Slots"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Course Lessons Form (Embedded) */}
      {showCourseForm && currentCourseId && (
        <div className="bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 rounded-xl p-6 mb-6">
          <h3 className="text-xl font-bold text-custom-text mb-4">Add Course Lessons</h3>
          {courseLessons.length > 0 && (
            <div className="mb-4 space-y-2">
              {courseLessons.map((lesson, index) => (
                <div key={lesson.id || index} className="bg-dark-green-900/50 border border-cyber-green/30 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-custom-text">{index + 1}. {lesson.title || "Untitled Lesson"}</span>
                  <button
                    type="button"
                    onClick={async () => {
                      if (lesson.id) {
                        const { error } = await supabase.from("course_lessons").delete().eq("id", lesson.id);
                        if (error) {
                          alert("Failed to delete lesson");
                          return;
                        }
                      }
                      setCourseLessons(courseLessons.filter((_, i) => i !== index));
                    }}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
          {showLessonForm && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!lessonForm.title || !currentCourseId) return;

              try {
                const orderIndex = editingLesson ? editingLesson.order_index : courseLessons.length;
                const lessonData = {
                  course_id: currentCourseId,
                  title: lessonForm.title,
                  description: lessonForm.description || null,
                  video_url: lessonForm.videoUrl || null,
                  content: lessonForm.content || null,
                  order_index: orderIndex,
                };

                if (editingLesson && editingLesson.id) {
                  const { error } = await supabase.from("course_lessons").update(lessonData).eq("id", editingLesson.id);
                  if (error) throw error;
                  setCourseLessons(courseLessons.map(l => l.id === editingLesson.id ? { ...editingLesson, ...lessonData } : l));
                } else {
                  const { data, error } = await supabase.from("course_lessons").insert(lessonData).select().single();
                  if (error) throw error;
                  setCourseLessons([...courseLessons, data]);
                }

                setShowLessonForm(false);
                setEditingLesson(null);
                setLessonForm({ title: "", description: "", videoUrl: "", videoType: "youtube", content: "" });
              } catch (err: any) {
                console.error("Error saving lesson:", err);
                alert("Failed to save lesson. Please try again.");
              }
            }} className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-custom-text mb-2">Lesson Title *</label>
                <input
                  type="text"
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-custom-text mb-2">Description</label>
                <textarea
                  value={lessonForm.description}
                  onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-custom-text mb-2">Video URL (YouTube/Vimeo)</label>
                <input
                  type="url"
                  value={lessonForm.videoUrl}
                  onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
                >
                  {editingLesson ? "Update Lesson" : "Add Lesson"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLessonForm(false);
                    setEditingLesson(null);
                    setLessonForm({ title: "", description: "", videoUrl: "", videoType: "youtube", content: "" });
                  }}
                  className="px-6 py-3 border border-cyber-green/30 text-custom-text rounded-lg hover:bg-dark-green-800/50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
          {!showLessonForm && (
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setShowLessonForm(true)}
                className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
              >
                + Add Lesson
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    // Publish course
                    if (currentCourseId) {
                      const { error } = await supabase
                        .from("courses")
                        .update({ published: true })
                        .eq("id", currentCourseId);
                      if (error) throw error;
                    }
                    setShowCourseForm(false);
                    setCurrentCourseId(null);
                    setCurrentProductId(null);
                    fetchProducts();
                    alert("Course published successfully!");
                  } catch (err: any) {
                    console.error("Error publishing course:", err);
                    alert("Failed to publish course. Please try again.");
                  }
                }}
                className="px-6 py-3 border border-cyber-green/30 text-custom-text rounded-lg hover:bg-dark-green-800/50 transition-colors"
              >
                {courseLessons.length === 0 ? "Skip & Publish Product" : "Publish Product"}
              </button>
            </div>
          )}
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
                className="bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 rounded-xl p-6 flex flex-col"
              >
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-custom-text mb-2">{product.name}</h3>
                      <div 
                        className="product-preview text-custom-text/80 mb-3"
                        dangerouslySetInnerHTML={{ __html: product.description }}
                      />
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <span className="text-cyber-green font-semibold">
                          USD ${product.price} {product.pricing_type === "hourly" ? "/ hour" : ""}
                        </span>
                        <span className="text-custom-text/60">
                          {product.pricing_type === "hourly" ? "Hourly Rate" : "One-off Price"}
                        </span>
                        {product.price > 0 && (
                          <span className={`text-xs px-2 py-1 rounded ${
                            product.stripe_product_id 
                              ? "bg-cyber-green/20 text-cyber-green border border-cyber-green/30" 
                              : "bg-yellow-900/20 text-yellow-400 border border-yellow-500/30"
                          }`}>
                            {product.stripe_product_id ? "✓ Stripe Ready" : "⚠ Stripe Not Set"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Buttons at bottom - stack on mobile, horizontal on desktop */}
                <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-cyber-green/20">
                  <button
                    onClick={async () => {
                      if (!user) return;
                      
                      // Fetch questionnaire for this product (linked by product_id)
                      const { data: questionnaire } = await supabase
                        .from("questionnaires")
                        .select("id")
                        .eq("product_id", product.id)
                        .maybeSingle();
                      
                      if (questionnaire?.id) {
                        // Fetch fields
                        const { data: fields } = await supabase
                          .from("questionnaire_fields")
                          .select("*")
                          .eq("questionnaire_id", questionnaire.id)
                          .order("order_index", { ascending: true });
                        
                        setViewingFormFields(fields || []);
                        setViewingFormProductId(product.id);
                      } else {
                        alert("No form has been set up for this product yet.");
                      }
                    }}
                    className="px-4 py-2 bg-blue-900/30 text-blue-200 border border-blue-500/50 rounded-lg hover:bg-blue-900/50 transition-colors text-sm w-full sm:w-auto"
                  >
                    View Form
                  </button>
                  {product.product_type === "e-learning" && product.course_id && (
                    <Link
                      href={`/courses/manage`}
                      onClick={async () => {
                        // Store course ID in sessionStorage to auto-select it
                        if (typeof window !== "undefined" && product.course_id) {
                          sessionStorage.setItem("selectedCourseId", product.course_id);
                        }
                      }}
                      className="px-4 py-2 bg-cyber-green text-dark-green-900 font-semibold border border-cyber-green rounded-lg hover:bg-cyber-green-light transition-colors text-sm inline-block text-center w-full sm:w-auto"
                    >
                      Set up e-Learnings
                    </Link>
                  )}
                  {product.product_type === "e-learning" && product.course_id && (
                    <button
                      onClick={async () => {
                        if (showMembersForProduct === product.id) {
                          setShowMembersForProduct(null);
                        } else {
                          setShowMembersForProduct(product.id);
                          const courseId = product.course_id;
                          if (courseId) {
                            // Always fetch fresh data when viewing members
                            console.log("View Members clicked for courseId:", courseId);
                            await fetchCourseMembers(courseId);
                            // Log the result after a short delay
                            setTimeout(() => {
                              console.log("Course members map after fetch:", courseMembersMap[courseId]);
                            }, 500);
                          }
                        }
                      }}
                      className="px-4 py-2 bg-blue-900/30 text-blue-200 border border-blue-500/50 rounded-lg hover:bg-blue-900/50 transition-colors text-sm w-full sm:w-auto"
                    >
                      {showMembersForProduct === product.id ? "Hide Members" : "View Members"}
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(product)}
                    className="px-4 py-2 bg-dark-green-800/50 text-custom-text border border-cyber-green/30 rounded-lg hover:bg-dark-green-800 hover:border-cyber-green transition-colors text-sm w-full sm:w-auto"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="px-4 py-2 bg-red-900/30 text-red-200 border border-red-500/50 rounded-lg hover:bg-red-900/50 transition-colors text-sm w-full sm:w-auto"
                  >
                    Delete
                  </button>
                </div>
                {product.product_type === "e-learning" && product.course_id && showMembersForProduct === product.id && (
                  <div className="mt-4 pt-4 border-t border-cyber-green/30">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lg font-semibold text-custom-text">Course Members</h4>
                      <div className="flex gap-2">
                        {product.course_id && courseMembersMap[product.course_id] && courseMembersMap[product.course_id].length > 0 && (
                          <button
                            onClick={() => {
                              const courseId = product.course_id!;
                              const members = courseMembersMap[courseId];
                              if (!members || members.length === 0) {
                                alert("No members to download");
                                return;
                              }

                              // Collect all unique form field labels from all members
                              const formFieldLabels = new Set<string>();
                              members.forEach((member: any) => {
                                if (member.questionnaire_responses) {
                                  Object.keys(member.questionnaire_responses).forEach((label) => {
                                    formFieldLabels.add(label);
                                  });
                                }
                              });

                              // Create CSV content
                              const headers = [
                                "Name",
                                "Email",
                                "Enrolled Date",
                                ...Array.from(formFieldLabels).sort(),
                              ];
                              
                              const rows = members.map((member: any) => {
                                const baseRow = [
                                  member.name || "N/A",
                                  member.email || "N/A",
                                  new Date(member.enrolled_at).toLocaleDateString(),
                                ];
                                
                                // Add questionnaire responses in the same order as headers
                                Array.from(formFieldLabels).sort().forEach((label) => {
                                  const value = member.questionnaire_responses?.[label];
                                  if (value === null || value === undefined) {
                                    baseRow.push("");
                                  } else if (Array.isArray(value)) {
                                    baseRow.push(value.join("; "));
                                  } else {
                                    baseRow.push(String(value));
                                  }
                                });
                                
                                return baseRow;
                              });

                              // Combine headers and rows
                              const csvContent = [
                                headers.join(","),
                                ...rows.map((row: any[]) => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
                              ].join("\n");

                              // Create download link
                              const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                              const link = document.createElement("a");
                              const url = URL.createObjectURL(blob);
                              link.setAttribute("href", url);
                              link.setAttribute("download", `course-members-${product.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.csv`);
                              link.style.visibility = "hidden";
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            className="text-xs bg-cyber-green text-dark-green-900 px-3 py-1 rounded font-semibold hover:bg-cyber-green-light transition-colors"
                          >
                            Download CSV
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            console.log("Refresh clicked for courseId:", product.course_id);
                            await fetchCourseMembers(product.course_id!);
                          }}
                          className="text-xs text-cyber-green hover:text-cyber-green-light transition-colors"
                        >
                          Refresh
                        </button>
                      </div>
                    </div>
                    {courseMembersMap[product.course_id] && courseMembersMap[product.course_id].length > 0 ? (
                      <div className="bg-dark-green-900/50 border border-cyber-green/30 rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-dark-green-900/50 border-b border-cyber-green/30">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-custom-text">Name</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-custom-text">Email</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-custom-text">Enrolled</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-custom-text">Form Data</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-custom-text">Refund Status</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-custom-text">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {courseMembersMap[product.course_id].map((member: any) => (
                              <tr
                                key={member.id}
                                className="border-b border-cyber-green/10 hover:bg-dark-green-900/30 transition-colors"
                              >
                                <td className="px-4 py-3 text-sm text-custom-text">{member.name}</td>
                                <td className="px-4 py-3 text-sm text-custom-text">{member.email}</td>
                                <td className="px-4 py-3 text-sm text-custom-text/70">
                                  {new Date(member.enrolled_at).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 text-sm text-custom-text/70">
                                  {member.questionnaire_responses ? (
                                    <details className="cursor-pointer">
                                      <summary className="text-cyber-green hover:text-cyber-green-light">View Form Data</summary>
                                      <div className="mt-2 p-2 bg-dark-green-900/50 rounded text-xs">
                                        {Object.entries(member.questionnaire_responses).map(([key, value]: [string, any]) => (
                                          <div key={key} className="mb-1">
                                            <span className="font-semibold">{key}:</span> {String(value)}
                                          </div>
                                        ))}
                                      </div>
                                    </details>
                                  ) : "-"}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  {member.refund_status === "refunded" ? (
                                    <span className="text-green-300 font-semibold">
                                      ✓ Refunded
                                      {member.refund_amount && ` (${member.refund_amount.toFixed(2)})`}
                                    </span>
                                  ) : member.refund_status === "processing" ? (
                                    <span className="text-yellow-300">Processing...</span>
                                  ) : member.refund_status === "failed" ? (
                                    <span className="text-red-300">Failed</span>
                                  ) : member.payment_intent_id ? (
                                    <span className="text-custom-text/60">Paid</span>
                                  ) : (
                                    <span className="text-custom-text/60">Free</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  <div className="flex gap-2 flex-wrap">
                                    {/* Invite Button - Show for all members */}
                                    <button
                                      onClick={async () => {
                                        const email = prompt("Enter the email address of the user to invite:");
                                        if (!email) return;

                                        if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                                          alert("Please enter a valid email address");
                                          return;
                                        }

                                        try {
                                          const response = await fetch("/api/courses/manage-enrollment", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                              action: "invite",
                                              courseId: product.course_id,
                                              userEmail: email.trim(),
                                            }),
                                          });

                                          const data = await response.json();

                                          if (!response.ok) {
                                            alert(`Failed to invite user: ${data.error}`);
                                            return;
                                          }

                                          alert(`Successfully invited ${email} to the course!`);
                                          // Refresh members list
                                          await fetchCourseMembers(product.course_id!);
                                        } catch (err) {
                                          console.error("Error inviting user:", err);
                                          alert("Failed to invite user. Please try again.");
                                        }
                                      }}
                                      className="px-3 py-1 bg-cyber-green/20 text-cyber-green border border-cyber-green/50 rounded hover:bg-cyber-green/30 transition-colors text-xs"
                                      title="Invite a user to this course by email"
                                    >
                                      Invite
                                    </button>

                                    {/* Remove Button - Show for all members */}
                                    <button
                                      onClick={async () => {
                                        if (!confirm(`Are you sure you want to remove ${member.name || member.email} from this course? This action cannot be undone.`)) {
                                          return;
                                        }

                                        try {
                                          const response = await fetch("/api/courses/manage-enrollment", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                              action: "remove",
                                              courseId: product.course_id,
                                              enrollmentId: member.id, // enrollment ID
                                              userId: member.user_id || undefined, // user ID if available
                                              userEmail: member.email,
                                            }),
                                          });

                                          const data = await response.json();

                                          if (!response.ok) {
                                            alert(`Failed to remove user: ${data.error}`);
                                            return;
                                          }

                                          alert(`Successfully removed ${member.name || member.email} from the course.`);
                                          // Refresh members list
                                          await fetchCourseMembers(product.course_id!);
                                        } catch (err) {
                                          console.error("Error removing user:", err);
                                          alert("Failed to remove user. Please try again.");
                                        }
                                      }}
                                      className="px-3 py-1 bg-yellow-900/30 text-yellow-200 border border-yellow-500/50 rounded hover:bg-yellow-900/50 transition-colors text-xs"
                                      title="Remove this user from the course"
                                    >
                                      Remove
                                    </button>

                                    {/* Refund Button - Only for paid enrollments */}
                                    {member.payment_intent_id && member.refund_status !== "refunded" && member.refund_status !== "processing" && (
                                      <button
                                        onClick={async () => {
                                          if (!confirm(`Are you sure you want to refund this enrollment? This action cannot be undone.`)) {
                                            return;
                                          }
                                          
                                          const reason = prompt("Please provide a reason for the refund (optional):");
                                          
                                          try {
                                            const response = await fetch("/api/stripe/refund", {
                                              method: "POST",
                                              headers: { "Content-Type": "application/json" },
                                              body: JSON.stringify({
                                                type: "course",
                                                id: member.id,
                                                reason: reason || undefined,
                                              }),
                                            });

                                            const data = await response.json();

                                            if (!response.ok) {
                                              alert(`Refund failed: ${data.error}`);
                                              return;
                                            }

                                            alert(`Refund processed successfully! Refund ID: ${data.refund.id}`);
                                            // Refresh members list
                                            await fetchCourseMembers(product.course_id!);
                                          } catch (err) {
                                            console.error("Error processing refund:", err);
                                            alert("Failed to process refund. Please try again.");
                                          }
                                        }}
                                        className="px-3 py-1 bg-red-900/30 text-red-200 border border-red-500/50 rounded hover:bg-red-900/50 transition-colors text-xs"
                                        title="Refund this paid enrollment"
                                      >
                                        Refund
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : courseMembersMap[product.course_id] === undefined ? (
                      <div className="text-center py-4">
                        <p className="text-custom-text/60 text-sm">Loading members...</p>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-custom-text/60 text-sm">No members enrolled yet.</p>
                        <p className="text-custom-text/40 text-xs mt-2">
                          Check console for debugging info (courseId: {product.course_id})
                        </p>
                      </div>
                    )}
                  </div>
                )}
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
                    <th className="px-4 py-3 text-left text-sm font-semibold text-custom-text">Form Data</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-custom-text">Purchased</th>
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
                        {interest.questionnaire_responses ? (
                          <details className="cursor-pointer">
                            <summary className="text-cyber-green hover:text-cyber-green-light">View Form Data</summary>
                            <div className="mt-2 p-2 bg-dark-green-900/50 rounded text-xs">
                              {Object.entries(interest.questionnaire_responses).map(([key, value]: [string, any]) => (
                                <div key={key} className="mb-1">
                                  <span className="font-semibold">{key}:</span> {String(value)}
                                </div>
                              ))}
                            </div>
                          </details>
                        ) : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {interest.purchased ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-cyber-green/20 text-cyber-green border border-cyber-green/30">
                            ✓ Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-yellow-900/20 text-yellow-400 border border-yellow-500/30">
                            No
                          </span>
                        )}
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

      {/* View Form Modal */}
      {viewingFormProductId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-green-900 border border-cyber-green/30 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-custom-text">Product Form Preview</h2>
              <button
                onClick={() => {
                  setViewingFormProductId(null);
                  setViewingFormFields([]);
                }}
                className="text-custom-text/60 hover:text-custom-text transition-colors"
              >
                ✕
              </button>
            </div>
            {viewingFormFields.length === 0 ? (
              <p className="text-custom-text/60">No form fields have been set up yet.</p>
            ) : (
              <div className="space-y-4">
                {viewingFormFields.map((field) => (
                  <div key={field.id} className="bg-dark-green-800/30 border border-cyber-green/20 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-custom-text">{field.label}</span>
                          {field.required && <span className="text-red-400 text-xs">*</span>}
                          <span className="text-xs text-custom-text/60 bg-cyber-green/20 px-2 py-1 rounded">
                            {field.field_type}
                          </span>
                        </div>
                        {field.placeholder && (
                          <p className="text-sm text-custom-text/60 mb-2">Placeholder: {field.placeholder}</p>
                        )}
                        {field.options && Array.isArray(field.options) && field.options.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm text-custom-text/60 mb-1">Options:</p>
                            <ul className="list-disc list-inside text-sm text-custom-text/70">
                              {field.options.map((opt: string, idx: number) => (
                                <li key={idx}>{opt}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

