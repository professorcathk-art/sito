"use client";

import { useState, useEffect } from "react";
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
}

export function CourseEnrollment({
  courseId,
  expertId,
  coursePrice,
  isFree,
  currentUserId,
}: CourseEnrollmentProps) {
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
    if (!user || !currentUserId) {
      router.push(`/login?redirect=/courses/${courseId}`);
      return;
    }

    // Check for questionnaire - create default if doesn't exist
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

      // Check if questionnaire exists for this product (linked by product_id)
      const { data: questionnaire, error: qError } = await supabase
        .from("questionnaires")
        .select("id, is_active")
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
    } catch (err: any) {
      console.error("Error registering interest:", err);
      alert(err.message || "Failed to register interest. Please try again.");
    } finally {
      setProcessing(false);
      setShowQuestionnaire(false);
    }
  };

  const handleEnroll = async () => {
    if (!user || !currentUserId) {
      router.push(`/login?redirect=/courses/${courseId}`);
      return;
    }

    if (isEnrolled) {
      router.push("/courses/manage");
      return;
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

      // Check if questionnaire exists for this product (linked by product_id)
      const { data: questionnaire, error: qError } = await supabase
        .from("questionnaires")
        .select("id, is_active")
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

  const enroll = async (questionnaireResponse?: any) => {
    if (!user || !currentUserId) return;

    setProcessing(true);
    try {
      if (isFree) {
        // Free course - enroll directly
        const enrollmentData: any = {
          course_id: courseId,
          user_id: currentUserId,
        };

        if (questionnaireResponse) {
          enrollmentData.questionnaire_response_id = questionnaireResponse.id;
        }

        const { error } = await supabase
          .from("course_enrollments")
          .insert(enrollmentData);

        if (error) throw error;

        alert("Successfully enrolled in course!");
        setIsEnrolled(true);
        router.push("/courses/manage");
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
          // Get connected account ID from expert's profile separately
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

          // Redirect to Stripe checkout
          try {
            const response = await fetch("/api/stripe/checkout/create-session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                priceId: product.stripe_price_id,
                connectedAccountId: connectedAccountId,
                courseId: courseId,
                questionnaireResponseId: questionnaireResponse?.id || null,
              }),
            });

            if (!response.ok) {
              const data = await response.json();
              throw new Error(data.error || "Failed to create checkout session");
            }

            const data = await response.json();
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
    }
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
      
      // Only save questionnaire response if we have a valid questionnaire ID (not temp)
      if (!questionnaireId.startsWith("temp-")) {
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
          // Continue anyway - we can register interest without response ID
        } else {
          response = responseData;
        }
      } else {
        // For temp questionnaires, cannot create - only experts can create questionnaires
        console.error("Cannot create questionnaire - only experts can create them");
        alert("Registration form is not yet set up by the expert. Please contact them directly.");
        return;
      }


      if (questionnaireType === "interest") {
        await registerInterest(response);
      } else {
        await enroll(response);
      }
    } catch (err: any) {
      console.error("Error submitting questionnaire:", err);
      alert(`Failed to submit questionnaire: ${err.message || "Please try again."}`);
    }
  };

  if (loading) {
    return <div className="text-custom-text/60">Loading...</div>;
  }

  if (isEnrolled) {
    return (
      <div className="flex gap-4">
        <button
          onClick={() => router.push("/courses/manage")}
          className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
        >
          Go to Classroom
        </button>
      </div>
    );
  }

  // Show questionnaire form as modal overlay
  if (showQuestionnaire && questionnaireId) {
    return (
      <>
        {/* Modal Overlay */}
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-green-800/95 border border-cyber-green/50 rounded-lg p-6 md:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-custom-text">
                {questionnaireType === "interest" ? "Register Interest" : "Enroll in Course"}
              </h3>
              <button
                onClick={() => setShowQuestionnaire(false)}
                className="text-custom-text/70 hover:text-custom-text transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <QuestionnaireForm
              questionnaireId={questionnaireId}
              onSubmit={handleQuestionnaireSubmit}
              onCancel={() => setShowQuestionnaire(false)}
            />
          </div>
        </div>
        {/* Keep the buttons visible but disabled */}
        <div className="flex gap-4 opacity-50 pointer-events-none">
          {!hasRegisteredInterest && (
            <button
              disabled
              className="px-6 py-3 border border-cyber-green/30 text-custom-text rounded-lg"
            >
              Register Interest
            </button>
          )}
          <button
            disabled
            className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg"
          >
            {isFree ? "Enroll (Free)" : `Enroll ($${coursePrice})`}
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
          <div className="bg-dark-green-800/95 border border-cyber-green/50 rounded-lg p-6 md:p-8 w-full max-w-md">
            <h3 className="text-2xl font-bold text-custom-text mb-4">Offline Payment</h3>
            <p className="text-custom-text/80 mb-4">
              This course uses offline payment. Please contact the expert directly to complete your enrollment.
            </p>
            <div className="bg-dark-green-900/50 border border-cyber-green/30 rounded-lg p-4 mb-4">
              <p className="text-sm text-custom-text/60 mb-2">Contact Email:</p>
              <p className="text-lg font-semibold text-cyber-green">{productContactEmail}</p>
            </div>
            <p className="text-sm text-custom-text/60 mb-4">
              After completing the payment with the expert, they will add you to the course and you&apos;ll be able to access it in your Classroom.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowOfflinePaymentInfo(false);
                  setProcessing(false);
                }}
                className="flex-1 px-6 py-3 border border-cyber-green/30 text-custom-text rounded-lg hover:bg-dark-green-800/50 transition-colors"
              >
                Close
              </button>
              <a
                href={`mailto:${productContactEmail}?subject=Course Enrollment - ${courseId}`}
                className="flex-1 px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors text-center"
              >
                Send Email
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        {!hasRegisteredInterest && (
          <button
            onClick={handleRegisterInterest}
            disabled={processing}
            className="px-6 py-3 border border-cyber-green/30 text-custom-text rounded-lg hover:bg-dark-green-800/50 transition-colors disabled:opacity-50"
          >
            {processing ? "Processing..." : "Register Interest"}
          </button>
        )}
        <button
          onClick={handleEnroll}
          disabled={processing}
          className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors disabled:opacity-50"
        >
          {processing ? "Processing..." : isFree ? "Enroll (Free)" : `Enroll ($${coursePrice})`}
        </button>
      </div>
    </>
  );
}

