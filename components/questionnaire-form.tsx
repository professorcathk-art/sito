"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";

interface QuestionnaireField {
  id: string;
  questionnaire_id?: string; // Optional for temporary fields
  field_type: "text" | "email" | "textarea" | "select" | "checkbox" | "radio";
  label: string;
  placeholder: string | null;
  required: boolean;
  options: string[] | null;
  order_index: number;
}

interface QuestionnaireFormProps {
  questionnaireId: string;
  onSubmit: (responses: Record<string, any>) => Promise<void>;
  onCancel?: () => void;
  thankYouMessage?: string | null;
}

export function QuestionnaireForm({ questionnaireId, onSubmit, onCancel, thankYouMessage }: QuestionnaireFormProps) {
  const supabase = createClient();
  const { user } = useAuth();
  const [fields, setFields] = useState<QuestionnaireField[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [userProfile, setUserProfile] = useState<{ name?: string; email?: string } | null>(null);
  const [showThankYou, setShowThankYou] = useState(false);

  useEffect(() => {
    fetchFields();
    if (user) {
      fetchUserProfile();
    }
  }, [questionnaireId, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUserProfile = async () => {
    if (!user) return;
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, email")
        .eq("id", user.id)
        .single();
      
      if (profile) {
        setUserProfile({ name: profile.name || undefined, email: profile.email || undefined });
      } else {
        // Fallback to auth user email
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser?.email) {
          setUserProfile({ email: authUser.email });
        }
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
    }
  };

  const fetchFields = async () => {
    try {
      // Handle temporary questionnaire IDs (when questionnaire creation fails)
      if (questionnaireId.startsWith("temp-")) {
        // Use default fields for temporary questionnaires
        setFields([
          {
            id: "temp-name",
            questionnaire_id: questionnaireId,
            field_type: "text",
            label: "Name",
            placeholder: "Enter your name",
            required: true,
            options: null,
            order_index: 0,
          },
          {
            id: "temp-email",
            questionnaire_id: questionnaireId,
            field_type: "email",
            label: "Email",
            placeholder: "Enter your email",
            required: true,
            options: null,
            order_index: 1,
          },
        ]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("questionnaire_fields")
        .select("*")
        .eq("questionnaire_id", questionnaireId)
        .order("order_index", { ascending: true });

      if (error) {
        console.error("Error fetching questionnaire fields:", error);
        throw error;
      }
      
      console.log(`📋 QuestionnaireForm: Fetched ${data?.length || 0} fields for questionnaire ${questionnaireId}`);
      console.log("Fields:", data?.map((f: any) => ({ id: f.id, label: f.label, type: f.field_type })));
      
      // Parse options from JSONB if needed
      const parsedFields = (data || []).map((field: any) => {
        // Handle options - Supabase returns JSONB as parsed object/array, but ensure it's an array
        if (field.options) {
          if (typeof field.options === 'string') {
            try {
              field.options = JSON.parse(field.options);
            } catch (e) {
              // If parsing fails, try splitting by comma
              field.options = field.options.split(',').map((opt: string) => opt.trim());
            }
          } else if (!Array.isArray(field.options)) {
            // If it's an object, convert to array
            field.options = Object.values(field.options);
          }
        }
        return field;
      });
      
      setFields(parsedFields);
      
      // Initialize responses with prefilled user data
      const initialResponses: Record<string, any> = {};
      parsedFields.forEach((field) => {
        if (field.field_type === "checkbox") {
          initialResponses[field.id] = [];
        } else {
          // Prefill name and email fields if available
          const labelLower = field.label.toLowerCase();
          if (labelLower.includes("name") && userProfile?.name) {
            initialResponses[field.id] = userProfile.name;
          } else if (labelLower.includes("email") && userProfile?.email) {
            initialResponses[field.id] = userProfile.email;
          } else {
            initialResponses[field.id] = "";
          }
        }
      });
      setResponses(initialResponses);
    } catch (err) {
      console.error("Error fetching questionnaire fields:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (fieldId: string, value: any) => {
    setResponses((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleCheckboxChange = (fieldId: string, option: string, checked: boolean) => {
    setResponses((prev) => {
      const current = prev[fieldId] || [];
      if (checked) {
        return { ...prev, [fieldId]: [...current, option] };
      } else {
        return { ...prev, [fieldId]: current.filter((v: string) => v !== option) };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    for (const field of fields) {
      if (field.required) {
        const value = responses[field.id];
        if (!value || (Array.isArray(value) && value.length === 0)) {
          alert(`Please fill in the required field: ${field.label}`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      await onSubmit(responses);
      // Show thank you message if available
      if (thankYouMessage) {
        setShowThankYou(true);
      }
    } catch (err) {
      console.error("Error submitting questionnaire:", err);
      alert("Failed to submit questionnaire. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-surface rounded w-3/4"></div>
        <div className="h-10 bg-surface rounded"></div>
      </div>
    );
  }

  if (loading) {
    return <div className="text-text-secondary">Loading form...</div>;
  }

  if (fields.length === 0 && !loading) {
    return (
      <div className="text-text-secondary">
        <p className="mb-4">The registration form is not yet set up. Please contact the expert.</p>
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-border-default text-custom-text rounded-md hover:bg-surface"
          >
            Cancel
          </button>
        )}
      </div>
    );
  }

  // Show thank you message if form was submitted successfully
  if (showThankYou && thankYouMessage) {
    return (
      <div className="space-y-6">
        <div 
          className="prose prose-invert max-w-none text-custom-text"
          dangerouslySetInnerHTML={{ __html: thankYouMessage }}
        />
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-cyber-green text-white font-semibold rounded-md hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-xl font-bold text-custom-text mb-4">Please fill out this form</h3>
      
      {fields.map((field) => (
        <div key={field.id}>
          <label className="block text-sm font-medium text-custom-text mb-2">
            {field.label}
            {field.required && <span className="text-red-400 ml-1">*</span>}
          </label>

          {field.field_type === "text" && (
            <input
              type="text"
              value={responses[field.id] || ""}
              onChange={(e) => handleChange(field.id, e.target.value)}
              placeholder={field.placeholder || ""}
              required={field.required}
              className="w-full px-4 py-2 bg-custom-bg border border-border-default rounded-md text-custom-text placeholder-custom-text/50 focus:outline-none focus:border-white/20"
            />
          )}

          {field.field_type === "email" && (
            <input
              type="email"
              value={responses[field.id] || ""}
              onChange={(e) => handleChange(field.id, e.target.value)}
              placeholder={field.placeholder || ""}
              required={field.required}
              className="w-full px-4 py-2 bg-custom-bg border border-border-default rounded-md text-custom-text placeholder-custom-text/50 focus:outline-none focus:border-white/20"
            />
          )}

          {field.field_type === "textarea" && (
            <textarea
              value={responses[field.id] || ""}
              onChange={(e) => handleChange(field.id, e.target.value)}
              placeholder={field.placeholder || ""}
              required={field.required}
              rows={4}
              className="w-full px-4 py-2 bg-custom-bg border border-border-default rounded-md text-custom-text placeholder-custom-text/50 focus:outline-none focus:border-white/20"
            />
          )}

          {field.field_type === "select" && field.options && (
            <select
              value={responses[field.id] || ""}
              onChange={(e) => handleChange(field.id, e.target.value)}
              required={field.required}
              className="w-full px-4 py-2 bg-custom-bg border border-border-default rounded-md text-custom-text focus:outline-none focus:border-white/20"
            >
              <option value="">Select an option...</option>
              {field.options.map((option, idx) => (
                <option key={idx} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}

          {field.field_type === "radio" && field.options && (
            <div className="space-y-2">
              {field.options.map((option, idx) => (
                <label key={idx} className="flex items-center gap-2 text-custom-text">
                  <input
                    type="radio"
                    name={field.id}
                    value={option}
                    checked={responses[field.id] === option}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    required={field.required}
                    className="w-4 h-4 text-cyber-green focus:ring-white/20"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          )}

          {field.field_type === "checkbox" && field.options && (
            <div className="space-y-2">
              {field.options.map((option, idx) => (
                <label key={idx} className="flex items-center gap-2 text-custom-text">
                  <input
                    type="checkbox"
                    checked={(responses[field.id] || []).includes(option)}
                    onChange={(e) => handleCheckboxChange(field.id, option, e.target.checked)}
                    className="w-4 h-4 text-cyber-green focus:ring-white/20 rounded"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      ))}

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-3 bg-cyber-green text-white font-semibold rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-border-default text-custom-text font-semibold rounded-md hover:bg-surface transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

