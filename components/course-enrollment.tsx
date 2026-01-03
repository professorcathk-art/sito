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

  useEffect(() => {
    if (user && currentUserId) {
      checkEnrollmentStatus();
    } else {
      setLoading(false);
    }
  }, [user, currentUserId, courseId]);

  const checkEnrollmentStatus = async () => {
    if (!user || !currentUserId) return;

    try {
      // Check if enrolled
      const { data: enrollment } = await supabase
        .from("course_enrollments")
        .select("id")
        .eq("course_id", courseId)
        .eq("user_id", currentUserId)
        .single();

      setIsEnrolled(!!enrollment);

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
      
      // First, check if questionnaire exists
      const { data: questionnaire, error: qError } = await supabase
        .from("questionnaires")
        .select("id")
        .eq("expert_id", expertId)
        .eq("type", "course_interest")
        .eq("is_active", true)
        .maybeSingle();

      // PGRST116 is "no rows returned" which is fine
      if (qError && qError.code !== "PGRST116") {
        console.error("Error checking for questionnaire:", qError);
      }

      if (questionnaire?.id) {
        questionnaireId = questionnaire.id;
        console.log("Found questionnaire:", questionnaireId);
      } else {
        // No questionnaire exists - create a default one with Name and Email fields
        console.log("No questionnaire found, creating default one for expert:", expertId);
        try {
          const { data: newQuestionnaire, error: createError } = await supabase
            .from("questionnaires")
            .insert({
              expert_id: expertId,
              type: "course_interest",
              title: "Course Interest Form",
              is_active: true,
            })
            .select()
            .single();

          if (createError) {
            // If duplicate key error, fetch existing one (might be inactive)
            if (createError.code === "23505") {
              const { data: existing } = await supabase
                .from("questionnaires")
                .select("id")
                .eq("expert_id", expertId)
                .eq("type", "course_interest")
                .maybeSingle();
              if (existing?.id) {
                // Activate it if it was inactive
                await supabase
                  .from("questionnaires")
                  .update({ is_active: true })
                  .eq("id", existing.id);
                questionnaireId = existing.id;
              }
            } else {
              console.error("Error creating default questionnaire:", createError);
              // Continue without questionnaire - allow registration anyway
            }
          } else {
            questionnaireId = newQuestionnaire?.id || null;
            
            // Create default Name and Email fields
            if (questionnaireId) {
              const { error: fieldsError } = await supabase
                .from("questionnaire_fields")
                .insert([
                  {
                    questionnaire_id: questionnaireId,
                    field_type: "text",
                    label: "Name",
                    placeholder: "Enter your name",
                    required: true,
                    order_index: 0,
                  },
                  {
                    questionnaire_id: questionnaireId,
                    field_type: "email",
                    label: "Email",
                    placeholder: "Enter your email",
                    required: true,
                    order_index: 1,
                  },
                ]);

              if (fieldsError) {
                console.error("Error creating default fields:", fieldsError);
              }
            }
          }
        } catch (createErr) {
          console.error("Error creating default questionnaire:", createErr);
          // Continue without questionnaire - allow registration anyway
        }
      }

      if (questionnaireId) {
        setQuestionnaireId(questionnaireId);
        setQuestionnaireType("interest");
        setShowQuestionnaire(true);
        return;
      } else {
        // No questionnaire available - allow registration without form
        console.log("No questionnaire available, registering interest directly");
        await registerInterest();
        return;
      }
    } catch (err) {
      // Error checking for questionnaire - allow registration anyway
      console.error("Error checking for questionnaire:", err);
      await registerInterest();
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

    // Check for questionnaire - use 'course_interest' to match DB constraint
    try {
      const { data: questionnaire, error: qError } = await supabase
        .from("questionnaires")
        .select("id")
        .eq("expert_id", expertId)
        .eq("type", "course_interest")
        .eq("is_active", true)
        .maybeSingle();
      
      // PGRST116 is "no rows returned" which is fine
      if (qError && qError.code !== "PGRST116") {
        console.error("Error checking for questionnaire:", qError);
      }

      if (questionnaire) {
        setQuestionnaireId(questionnaire.id);
        setQuestionnaireType("enroll");
        setShowQuestionnaire(true);
        return;
      }
    } catch (err) {
      // No questionnaire found, continue
    }

    // No questionnaire, enroll directly
    await enroll();
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
        // Paid course - redirect to Stripe checkout
        // TODO: Implement Stripe checkout
        alert("Stripe payment integration coming soon!");
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
      const { data: response, error } = await supabase
        .from("questionnaire_responses")
        .insert({
          questionnaire_id: questionnaireId,
          user_id: currentUserId,
          responses: responses, // Note: column is 'responses' not 'response_data' based on migration
        })
        .select()
        .single();

      if (error) {
        console.error("Error inserting questionnaire response:", error);
        throw error;
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

  if (showQuestionnaire && questionnaireId) {
    return (
      <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6">
        <h3 className="text-xl font-bold text-custom-text mb-4">
          {questionnaireType === "interest" ? "Register Interest" : "Enroll in Course"}
        </h3>
        <QuestionnaireForm
          questionnaireId={questionnaireId}
          onSubmit={handleQuestionnaireSubmit}
          onCancel={() => setShowQuestionnaire(false)}
        />
      </div>
    );
  }

  return (
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
  );
}

