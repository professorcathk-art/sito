"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { QuestionnaireForm } from "@/components/questionnaire-form";

interface CourseEnrollmentProps {
  courseId: string;
  expertId: string;
  coursePrice: number;
  isFree: boolean;
  currentUserId?: string;
  enrollmentOnRequest?: boolean;
  returnUrl?: string; // URL to redirect back to after enrollment/registration
  /** When used in storefront: button background color from design */
  customBrandColor?: string;
  /** When used in storefront: button text color from design */
  customButtonTextColor?: string;
  themePreset?: string;
  /** When in multi-product context: product id for single-modal control */
  productId?: string;
  /** Parent-controlled: which product's questionnaire is open (only that one shows) */
  openQuestionnaireProductId?: string | null;
  /** Called when user requests to open questionnaire - parent should set openQuestionnaireProductId */
  onRequestOpenQuestionnaire?: (productId: string) => void;
  /** Called when questionnaire modal closes */
  onCloseQuestionnaire?: () => void;
  /** Product name to show above form in modal */
  productName?: string;
  /** Product description (HTML) to show above form in modal */
  productDescription?: string;
}

function isLightColor(hex: string): boolean {
  const c = hex.replace(/^#/, "");
  if (c.length !== 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}

export function CourseEnrollment({
  courseId,
  expertId,
  coursePrice,
  isFree,
  currentUserId,
  enrollmentOnRequest = false,
  returnUrl,
  customBrandColor,
  customButtonTextColor,
  themePreset,
  productId,
  openQuestionnaireProductId,
  onRequestOpenQuestionnaire,
  onCloseQuestionnaire,
  productName,
  productDescription,
}: CourseEnrollmentProps) {
  // Ensure boolean value
  const isEnrollmentOnRequest = enrollmentOnRequest === true;
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [hasRegisteredInterest, setHasRegisteredInterest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [questionnaireId, setQuestionnaireId] = useState<string | null>(null);
  const [questionnaireType, setQuestionnaireType] = useState<"enroll" | "interest" | null>(null);
  const [processing, setProcessing] = useState(false);
  const [productPaymentMethod, setProductPaymentMethod] = useState<"stripe" | "offline" | null>(null);
  const [productContactEmail, setProductContactEmail] = useState<string | null>(null);
  const [showOfflinePaymentInfo, setShowOfflinePaymentInfo] = useState(false);
  const [thankYouMessage, setThankYouMessage] = useState<string | null>(null);

  const fetchProductPaymentInfo = async () => {
    try {
      const { data: product } = await supabase
        .from("products")
        .select("payment_method, contact_email")
        .eq("course_id", courseId)
        .maybeSingle();
      
      if (product) {
        setProductPaymentMethod(product.payment_method || "stripe");
        setProductContactEmail(product.contact_email);
      }
    } catch (err) {
      console.error("Error fetching product payment info:", err);
    }
  };

  useEffect(() => {
    if (user && currentUserId) {
      checkEnrollmentStatus();
      fetchProductPaymentInfo();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentUserId, courseId]);

  const checkEnrollmentStatus = async () => {
    if (!user || !currentUserId) return;

    try {
      // Get user email for email-based enrollment check
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", currentUserId)
        .maybeSingle();
      
      const userEmail = profile?.email;
      const { data: authUser } = await supabase.auth.getUser();
      const finalUserEmail = userEmail || authUser?.user?.email;

      // Check if enrolled by user_id
      const { data: enrollmentById } = await supabase
        .from("course_enrollments")
        .select("id")
        .eq("course_id", courseId)
        .eq("user_id", currentUserId)
        .maybeSingle();

      // Check if enrolled by email (for offline payment enrollments)
      let enrollmentByEmail = null;
      if (finalUserEmail) {
        const { data } = await supabase
          .from("course_enrollments")
          .select("id")
          .eq("course_id", courseId)
          .eq("user_email", finalUserEmail)
          .maybeSingle();
        enrollmentByEmail = data;
      }

      setIsEnrolled(!!enrollmentById || !!enrollmentByEmail);

      // Check if registered interest - need to get product_id from course_id
      const { data: product } = await supabase
        .from("products")
        .select("id")
        .eq("course_id", courseId)
        .single();
      
      if (product) {
        const { data: interest } = await supabase
          .from("product_interests")
          .select("id")
          .eq("product_id", product.id)
          .eq("user_id", currentUserId)
          .single();
        setHasRegisteredInterest(!!interest);
      }
    } catch (err) {
      console.error("Error checking enrollment status:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterInterest = async () => {
    // Same flow for guests - show form first (no login redirect)
    // Check for questionnaire
    try {
      let questionnaireId: string | null = null;
      
      // First, get the product_id for this course
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("id")
        .eq("course_id", courseId)
        .maybeSingle();

      if (productError && productError.code !== "PGRST116") {
        console.error("Error fetching product:", productError);
      }

      if (!product?.id) {
        alert("Product not found for this course. Please contact the expert.");
        return;
      }

      // Single-modal: claim modal for this product before async (prevents stacking)
      if (onRequestOpenQuestionnaire) {
        onRequestOpenQuestionnaire(product.id);
      }

      // Check if questionnaire exists for this product (linked by product_id)
      const { data: questionnaire, error: qError } = await supabase
        .from("questionnaires")
        .select("id, is_active, thank_you_message")
        .eq("product_id", product.id)
        .eq("is_active", true)  // Only get active questionnaires
        .maybeSingle();

      // Log the error for debugging
      if (qError) {
        console.error("Error checking for questionnaire:", qError);
        console.error("Error code:", qError.code);
        console.error("Error message:", qError.message);
        console.error("Product ID:", product.id);
      }

      if (questionnaire?.id) {
        questionnaireId = questionnaire.id;
        console.log("Found questionnaire:", questionnaireId, "is_active:", questionnaire.is_active);
        
        // If questionnaire is inactive, try to activate it (but this might fail due to RLS)
        if (!questionnaire.is_active) {
          console.warn("Questionnaire is inactive, attempting to activate...");
          // Note: This will fail if user is not the expert, but that's okay
          await supabase
            .from("questionnaires")
            .update({ is_active: true })
            .eq("id", questionnaire.id);
        }
      } else {
        // No questionnaire exists - DO NOT CREATE (only experts can create questionnaires)
        // Instead, show error message to user
        console.log("No questionnaire found for expert:", expertId);
        alert("Registration form is not yet set up by the expert. Please contact them directly or try again later.");
        return;
      }

      if (questionnaireId) {
        // Fetch ALL fields (not just check if they exist)
        const { data: allFields, error: fieldsCheckError } = await supabase
          .from("questionnaire_fields")
          .select("*")
          .eq("questionnaire_id", questionnaireId)
          .order("order_index", { ascending: true });

        if (fieldsCheckError) {
          console.error("Error fetching fields:", fieldsCheckError);
        }

        console.log(`📋 Found ${allFields?.length || 0} fields for questionnaire ${questionnaireId}`);

        if (allFields && allFields.length > 0) {
          // Fields exist, show the form with ALL fields
          console.log("Fields:", allFields.map(f => f.label));
          setQuestionnaireId(questionnaireId);
          setQuestionnaireType("interest");
          // Get thank you message from questionnaire
          const { data: qData } = await supabase
            .from("questionnaires")
            .select("thank_you_message")
            .eq("id", questionnaireId)
            .maybeSingle();
          setThankYouMessage(qData?.thank_you_message || null);
          setShowQuestionnaire(true);
          return;
        } else {
          // No fields exist - DO NOT CREATE (only experts can create fields)
          console.log("No fields found for questionnaire");
          alert("The expert has not set up a registration form for this course. Please contact them directly.");
          setProcessing(false);
          return;
        }
      }
    } catch (err) {
      // Error checking for questionnaire - DO NOT CREATE (only experts can create)
      console.error("Error checking for questionnaire:", err);
      alert("Failed to load registration form. Please try again later.");
      setProcessing(false);
      return;
    }
  };

  const registerInterest = async (questionnaireResponse?: any) => {
    if (!user || !currentUserId) return;

    setProcessing(true);
    try {
      // Get user email from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", currentUserId)
        .maybeSingle();

      // Fallback to auth user email if profile email not found
      let userEmail = profile?.email;
      if (!userEmail) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        userEmail = authUser?.email;
      }

      if (!userEmail) {
        throw new Error("User email not found");
      }

      // Get product ID for this course - use maybeSingle to handle no results
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("id")
        .eq("course_id", courseId)
        .maybeSingle();

      if (productError && productError.code !== "PGRST116") {
        console.error("Error fetching product:", productError);
        throw new Error(`Failed to find product: ${productError.message}`);
      }

      if (!product) {
        throw new Error("Product not found for this course. Please contact the expert.");
      }

      const interestData: any = {
        product_id: product.id,
        user_id: currentUserId,
        user_email: userEmail,
      };

      if (questionnaireResponse && questionnaireResponse.id) {
        interestData.questionnaire_response_id = questionnaireResponse.id;
      }

      const { error } = await supabase
        .from("product_interests")
        .insert(interestData);

      if (error) {
        console.error("Error inserting interest:", error);
        if (error.code === "23505") {
          throw new Error("You have already registered interest in this course.");
        }
        throw new Error(`Failed to register interest: ${error.message || "Please try again."}`);
      }

      // Notify expert
      try {
        await fetch("/api/notify-product-interest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: product.id,
            expertId,
            userId: currentUserId,
            userEmail: userEmail,
          }),
        });
      } catch (err) {
        console.error("Error sending notification:", err);
      }

      alert("Interest registered successfully! The expert will be notified.");
      setHasRegisteredInterest(true);
      // Redirect back to returnUrl if provided (e.g., expert profile page)
      if (returnUrl && typeof window !== 'undefined') {
        router.push(returnUrl);
      }
    } catch (err: any) {
      console.error("Error registering interest:", err);
      alert(err.message || "Failed to register interest. Please try again.");
    } finally {
      setProcessing(false);
      setShowQuestionnaire(false);
      onCloseQuestionnaire?.();
    }
  };

  const handleEnroll = async () => {
    if (isEnrolled && user) {
      router.push("/courses/manage");
      return;
    }

    // Check if user has already registered interest with questionnaire data (logged-in only)
    if (user && currentUserId) {
      try {
        const { data: product } = await supabase
          .from("products")
          .select("id")
          .eq("course_id", courseId)
          .maybeSingle();
        
        if (product) {
          const { data: existingInterest } = await supabase
            .from("product_interests")
            .select("questionnaire_response_id")
            .eq("product_id", product.id)
            .eq("user_id", currentUserId)
            .maybeSingle();
          
          if (existingInterest?.questionnaire_response_id) {
            // User already filled form when registering interest - skip form and enroll directly
            console.log("Reusing questionnaire from interest registration");
            await enroll(); // This will use the existing questionnaire_response_id
            return;
          }
        }
      } catch (err) {
        console.error("Error checking existing interest:", err);
        // Continue to show questionnaire form
      }
    }

    // Check for questionnaire - query by product_id (linked to product, not expert)
    try {
      // First, get the product_id for this course
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("id")
        .eq("course_id", courseId)
        .maybeSingle();

      if (productError && productError.code !== "PGRST116") {
        console.error("Error fetching product:", productError);
      }

      if (!product) {
        alert("Product not found for this course. Please contact the expert.");
        setProcessing(false);
        return;
      }

      // Single-modal: claim modal for this product before async (prevents stacking)
      if (productId && onRequestOpenQuestionnaire) {
        onRequestOpenQuestionnaire(productId);
      }

      // Check if questionnaire exists for this product (linked by product_id)
      const { data: questionnaire, error: qError } = await supabase
        .from("questionnaires")
        .select("id, is_active, thank_you_message")
        .eq("product_id", product.id)
        .eq("is_active", true)  // Only get active questionnaires
        .maybeSingle();
      
      // Log the error for debugging
      if (qError) {
        console.error("Error checking for questionnaire:", qError);
        console.error("Error code:", qError.code);
        console.error("Error message:", qError.message);
        console.error("Product ID:", product.id);
      }

      if (questionnaire?.id) {
        // If questionnaire is inactive, try to activate it (but this might fail due to RLS)
        if (!questionnaire.is_active) {
          console.warn("Questionnaire is inactive, attempting to activate...");
          // Note: This will fail if user is not the expert, but that's okay
          await supabase
            .from("questionnaires")
            .update({ is_active: true })
            .eq("id", questionnaire.id);
        }

        // Fetch ALL fields (not just check if they exist)
        const { data: allFields, error: fieldsCheckError } = await supabase
          .from("questionnaire_fields")
          .select("*")
          .eq("questionnaire_id", questionnaire.id)
          .order("order_index", { ascending: true });

        if (fieldsCheckError) {
          console.error("Error fetching fields:", fieldsCheckError);
        }

        console.log(`📋 Found ${allFields?.length || 0} fields for questionnaire ${questionnaire.id}`);

        if (allFields && allFields.length > 0) {
          // Fields exist, show the form with ALL fields
          console.log("Fields:", allFields.map(f => f.label));
          setQuestionnaireId(questionnaire.id);
          setQuestionnaireType("enroll");
          setThankYouMessage(questionnaire.thank_you_message || null);
          setShowQuestionnaire(true);
          return;
        } else {
          // No fields exist - DO NOT CREATE (only experts can create fields)
          console.log("No fields found for questionnaire");
          alert("The expert has not set up a registration form for this course. Please contact them directly.");
          setProcessing(false);
          return;
        }
      } else {
        // No questionnaire exists - DO NOT CREATE (only experts can create questionnaires)
        console.log("No questionnaire found for product:", product.id);
        alert("Registration form is not yet set up by the expert. Please contact them directly or try again later.");
        setProcessing(false);
        return;
      }
    } catch (err) {
      console.error("Error checking questionnaire:", err);
      alert("Failed to load registration form. Please try again later.");
      setProcessing(false);
      return;
    }
  };

  const enroll = async (questionnaireResponse?: any, guestFormResponses?: Record<string, unknown>) => {
    const isGuest = !user || !currentUserId;
    if (isGuest && isFree) {
      const guestEmail = guestFormResponses ? extractEmailFromResponses(guestFormResponses) : null;
      if (!guestEmail) {
        alert("Please provide your email to get free access.");
        return;
      }
      try {
        const res = await fetch("/api/enroll-by-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId,
            email: guestEmail,
            questionnaireResponseId: questionnaireResponse?.id || null,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to save");
        }
        router.push(`/access-purchase?email=${encodeURIComponent(guestEmail)}&type=course`);
      } catch (err: any) {
        alert(err.message || "Failed to proceed. Please try again.");
      }
      return;
    }
    if (!isGuest && (!user || !currentUserId)) return;

    setProcessing(true);
    try {
      let questionnaireResponseId = questionnaireResponse?.id;
      
      if (!questionnaireResponseId && !isGuest) {
        // Try to get questionnaire_response_id from existing interest
        const { data: product } = await supabase
          .from("products")
          .select("id")
          .eq("course_id", courseId)
          .maybeSingle();
        
        if (product) {
          const { data: existingInterest } = await supabase
            .from("product_interests")
            .select("questionnaire_response_id")
            .eq("product_id", product.id)
            .eq("user_id", currentUserId)
            .maybeSingle();
          
          if (existingInterest?.questionnaire_response_id) {
            questionnaireResponseId = existingInterest.questionnaire_response_id;
            console.log("Reusing questionnaire from interest:", questionnaireResponseId);
          }
        }
      }
      
      if (isFree) {
        // Free course - enroll directly (guest handled above)
        const enrollmentData: any = {
          course_id: courseId,
          user_id: currentUserId,
        };

        if (questionnaireResponseId) {
          enrollmentData.questionnaire_response_id = questionnaireResponseId;
        }

        const { error } = await supabase
          .from("course_enrollments")
          .insert(enrollmentData);

        if (error) throw error;

        alert("Successfully enrolled in course!");
        setIsEnrolled(true);
        if (returnUrl) {
          router.push(returnUrl);
        } else {
          router.push("/courses/manage");
        }
      } else {
        // Paid course - get product payment info
        // Get product info and expert's Stripe Connect account for Stripe checkout
        const { data: product } = await supabase
          .from("products")
          .select(`
            id, 
            stripe_product_id, 
            stripe_price_id, 
            expert_id,
            payment_method,
            contact_email
          `)
          .eq("course_id", courseId)
          .maybeSingle();

        if (!product) {
          alert("Product not found for this course. Please contact the expert.");
          setProcessing(false);
          return;
        }

        // Check payment method
        const paymentMethod = product.payment_method || "stripe";
        
        if (paymentMethod === "offline" && product.contact_email) {
          // Show offline payment information
          setProductPaymentMethod("offline");
          setProductContactEmail(product.contact_email);
          setShowOfflinePaymentInfo(true);
          setProcessing(false);
          return;
        }

        // Stripe payment - check if Stripe IDs exist
        if (product?.stripe_product_id && product?.stripe_price_id) {
          const { data: expertProfile } = await supabase
            .from("profiles")
            .select("stripe_connect_account_id")
            .eq("id", expertId)
            .maybeSingle();
          
          const connectedAccountId = expertProfile?.stripe_connect_account_id;
          
          if (!connectedAccountId) {
            alert("Expert has not set up payment processing. Please contact them directly.");
            setProcessing(false);
            return;
          }

          if (!questionnaireResponseId && !isGuest) {
            const { data: existingInterest } = await supabase
              .from("product_interests")
              .select("questionnaire_response_id")
              .eq("product_id", product.id)
              .eq("user_id", currentUserId)
              .maybeSingle();
            
            if (existingInterest?.questionnaire_response_id) {
              questionnaireResponseId = existingInterest.questionnaire_response_id;
            }
          }

          const customerEmail = isGuest && guestFormResponses
            ? (extractEmailFromResponses(guestFormResponses) || undefined)
            : undefined;
          
          try {
            const response = await fetch("/api/stripe/checkout/create-session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                priceId: product.stripe_price_id,
                connectedAccountId: connectedAccountId,
                courseId: courseId,
                questionnaireResponseId: questionnaireResponseId || null,
                customerEmail: customerEmail || undefined,
              }),
            });

            const data = await response.json();
            if (!response.ok) {
              if (data.code === "STRIPE_SETUP_INCOMPLETE") {
                const ok = window.confirm("Payment will be settled with the expert after they confirm. Continue with enrollment?");
                if (!ok) {
                  setProcessing(false);
                  return;
                }
                if (isGuest) {
                  const res = await fetch("/api/pending-enrollment/create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      courseId,
                      email: extractEmailFromResponses(guestFormResponses || {}),
                      questionnaireResponseId: questionnaireResponseId || null,
                    }),
                  });
                  if (!res.ok) throw new Error("Failed to save");
                  router.push(`/access-purchase?email=${encodeURIComponent(extractEmailFromResponses(guestFormResponses || {}) || "")}&type=course`);
                } else {
                  const { error: enrollErr } = await supabase.from("course_enrollments").insert({
                    course_id: courseId,
                    user_id: currentUserId,
                    payment_intent_id: null,
                    questionnaire_response_id: questionnaireResponseId || null,
                  });
                  if (enrollErr) throw enrollErr;
                  alert("Enrollment requested! The expert will confirm and arrange payment with you.");
                  setIsEnrolled(true);
                  router.push("/courses/manage");
                }
                setProcessing(false);
                return;
              }
              throw new Error(data.error || "Failed to create checkout session");
            }

            if (data.url) {
              window.location.href = data.url;
            } else {
              throw new Error("No checkout URL returned");
            }
          } catch (err: any) {
            console.error("Error creating checkout session:", err);
            alert(`Failed to start payment: ${err.message || "Please try again."}`);
            setProcessing(false);
          }
        } else {
          // Product doesn't have Stripe IDs - check if it's supposed to be offline payment
          if (paymentMethod === "offline" && product.contact_email) {
            setProductPaymentMethod("offline");
            setProductContactEmail(product.contact_email);
            setShowOfflinePaymentInfo(true);
            setProcessing(false);
          } else {
            alert("Payment method not configured. Please contact the expert.");
            setProcessing(false);
          }
        }
      }
    } catch (err: any) {
      console.error("Error enrolling:", err);
      alert("Failed to enroll. Please try again.");
    } finally {
      setProcessing(false);
      setShowQuestionnaire(false);
      onCloseQuestionnaire?.();
    }
  };

  const extractEmailFromResponses = (r: Record<string, unknown>): string | null => {
    for (const val of Object.values(r)) {
      if (typeof val === "string" && val.includes("@") && val.includes(".")) return val;
    }
    return null;
  };

  const handleQuestionnaireSubmit = async (responses: any) => {
    if (!questionnaireId || !questionnaireType) {
      console.error("Missing questionnaireId or questionnaireType");
      return;
    }

    if (!responses || Object.keys(responses).length === 0) {
      alert("Please fill out all required fields before submitting.");
      return;
    }

    try {
      let response: any = null;
      const isGuest = !user || !currentUserId;

      // Only save questionnaire response if we have a valid questionnaire ID (not temp)
      if (!questionnaireId.startsWith("temp-")) {
        if (isGuest) {
          const guestEmail = extractEmailFromResponses(responses);
          if (!guestEmail) {
            alert("Please provide your email address.");
            return;
          }
          const res = await fetch("/api/questionnaire/guest-response", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ questionnaireId, responses, guestEmail }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to save response");
          response = { id: data.id };
        } else {
          const { data: responseData, error: responseError } = await supabase
            .from("questionnaire_responses")
            .insert({
              questionnaire_id: questionnaireId,
              user_id: currentUserId,
              responses: responses,
            })
            .select()
            .single();

          if (responseError) {
            console.error("Error inserting questionnaire response:", responseError);
          } else {
            response = responseData;
          }
        }
      } else {
        console.error("Cannot create questionnaire - only experts can create them");
        alert("Registration form is not yet set up by the expert. Please contact them directly.");
        return;
      }

      if (questionnaireType === "interest") {
        if (isGuest) {
          alert("Please create an account to register your interest. You can sign up after completing your purchase.");
          return;
        }
        await registerInterest(response);
      } else {
        await enroll(response, isGuest ? responses : undefined);
      }
    } catch (err: any) {
      console.error("Error submitting questionnaire:", err);
      alert(`Failed to submit questionnaire: ${err.message || "Please try again."}`);
    }
  };

  if (loading) {
    return <div className="text-text-secondary">Loading...</div>;
  }

  if (isEnrolled) {
    const useDarkText = customBrandColor && (isLightColor(customBrandColor) || themePreset === "minimal-light");
    const btnStyle = customBrandColor
      ? { backgroundColor: customBrandColor, color: customButtonTextColor || (useDarkText ? "#111827" : "#FFFFFF") }
      : undefined;
    return (
      <div className="flex gap-4">
        <button
          onClick={() => router.push("/courses/manage")}
          className={`px-6 py-3 font-semibold rounded-md transition-colors hover:opacity-90 ${!btnStyle ? (useDarkText ? "bg-white/90 hover:bg-white text-slate-900 border border-slate-300" : "bg-indigo-600 hover:bg-indigo-500 text-white") : ""}`}
          style={btnStyle}
        >
          Go to Classroom
        </button>
      </div>
    );
  }

  // Only show modal if we're the active one (when parent controls) or always (single-product)
  const effectiveShow =
    showQuestionnaire &&
    questionnaireId &&
    (!openQuestionnaireProductId || openQuestionnaireProductId === productId);

  const handleCloseModal = () => {
    setShowQuestionnaire(false);
    onCloseQuestionnaire?.();
  };

  // Show questionnaire form as modal overlay - use portal + high z-index so it's above product tiles
  if (effectiveShow && questionnaireId) {
    const modalContent = (
      <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[9999] p-4">
        <div className="bg-dark-green-800/95 border border-border-default rounded-md p-6 md:p-8 w-full max-w-2xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="text-2xl font-bold text-custom-text">
              {questionnaireType === "interest" ? "Register Interest" : "Get it now"}
            </h3>
            <button
              onClick={handleCloseModal}
              className="text-text-secondary hover:text-custom-text transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="overflow-y-auto flex-1 min-h-0 space-y-4">
            {(productName || productDescription) && (
              <div className="pb-4 border-b border-border-default shrink-0">
                {productName && <h4 className="text-lg font-semibold text-custom-text mb-2">{productName}</h4>}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-cyber-green font-semibold">
                    {isFree ? "Free" : `$${coursePrice}`}
                  </span>
                </div>
                {productDescription && (
                  <div
                    className="text-text-secondary text-sm product-preview max-h-48 overflow-y-auto overflow-x-hidden pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-600"
                    dangerouslySetInnerHTML={{ __html: productDescription }}
                  />
                )}
              </div>
            )}
            <QuestionnaireForm
              questionnaireId={questionnaireId}
              onSubmit={handleQuestionnaireSubmit}
              onCancel={() => {
                handleCloseModal();
                setThankYouMessage(null);
              }}
              thankYouMessage={thankYouMessage}
            />
          </div>
        </div>
      </div>
    );
    const modal = typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
    return (
      <>
        {modal}
        {/* Keep the buttons visible but disabled */}
        <div className="flex gap-4 opacity-50 pointer-events-none">
          {!hasRegisteredInterest && (
            <button
              disabled
              className="px-6 py-3 border border-border-default text-custom-text rounded-md"
            >
              Register Interest
            </button>
          )}
          <button
            disabled
            className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md"
          >
            {isFree ? "Get it now (Free)" : `Get it now ($${coursePrice})`}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Offline Payment Info Modal */}
      {showOfflinePaymentInfo && productContactEmail && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-green-800/95 border border-border-default rounded-md p-6 md:p-8 w-full max-w-md">
            <h3 className="text-2xl font-bold text-custom-text mb-4">Offline Payment</h3>
            <p className="text-text-secondary mb-4">
              This course uses offline payment. Please contact the expert directly to complete your enrollment.
            </p>
            <div className="bg-custom-bg border border-border-default rounded-md p-4 mb-4">
              <p className="text-sm text-text-secondary mb-2">Contact Email:</p>
              <p className="text-lg font-semibold text-cyber-green">{productContactEmail}</p>
            </div>
            <p className="text-sm text-text-secondary mb-4">
              After completing the payment with the expert, they will add you to the course and you&apos;ll be able to access it in your Classroom.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowOfflinePaymentInfo(false);
                  setProcessing(false);
                }}
                className="flex-1 px-6 py-3 border border-border-default text-custom-text rounded-md hover:bg-surface transition-colors"
              >
                Close
              </button>
              <a
                href={`mailto:${productContactEmail}?subject=Course Enrollment - ${courseId}`}
                className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-md transition-colors text-center"
              >
                Send Email
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        {/* Enrollment on Request: Show Register Interest button only */}
        {isEnrollmentOnRequest ? (
          !hasRegisteredInterest && (
            <button
              onClick={handleRegisterInterest}
              disabled={processing}
              className="px-6 py-3 border border-border-default text-custom-text rounded-md hover:bg-surface transition-colors disabled:opacity-50"
            >
              {processing ? "Processing..." : "Register Interest"}
            </button>
          )
        ) : (
          <>
            {/* Not on request: Show Register Interest for paid courses */}
            {!hasRegisteredInterest && !isFree && (
              <button
                onClick={handleRegisterInterest}
                disabled={processing}
                className="px-6 py-3 border border-border-default text-custom-text rounded-md hover:bg-surface transition-colors disabled:opacity-50"
              >
                {processing ? "Processing..." : "Register Interest"}
              </button>
            )}
            {/* Show Get it now button */}
            <button
              onClick={handleEnroll}
              disabled={processing}
              className="px-6 py-3 font-semibold rounded-md transition-colors hover:opacity-90 disabled:opacity-50"
              style={
                customBrandColor
                  ? { backgroundColor: customBrandColor, color: customButtonTextColor || "#FFFFFF" }
                  : { backgroundColor: "#4f46e5", color: "#fff" }
              }
            >
              {processing ? "Processing..." : isFree ? "Get it now (Free)" : `Get it now ($${coursePrice})`}
            </button>
          </>
        )}
      </div>
    </>
  );
}

