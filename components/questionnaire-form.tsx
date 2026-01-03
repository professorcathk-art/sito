"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface QuestionnaireField {
  id: string;
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
}

export function QuestionnaireForm({ questionnaireId, onSubmit, onCancel }: QuestionnaireFormProps) {
  const supabase = createClient();
  const [fields, setFields] = useState<QuestionnaireField[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [responses, setResponses] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchFields();
  }, [questionnaireId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchFields = async () => {
    try {
      const { data, error } = await supabase
        .from("questionnaire_fields")
        .select("*")
        .eq("questionnaire_id", questionnaireId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      setFields(data || []);
      
      // Initialize responses
      const initialResponses: Record<string, any> = {};
      (data || []).forEach((field) => {
        if (field.field_type === "checkbox") {
          initialResponses[field.id] = [];
        } else {
          initialResponses[field.id] = "";
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
        <div className="h-4 bg-dark-green-800/50 rounded w-3/4"></div>
        <div className="h-10 bg-dark-green-800/50 rounded"></div>
      </div>
    );
  }

  if (fields.length === 0) {
    return null;
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
              className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text placeholder-custom-text/50 focus:outline-none focus:border-cyber-green"
            />
          )}

          {field.field_type === "email" && (
            <input
              type="email"
              value={responses[field.id] || ""}
              onChange={(e) => handleChange(field.id, e.target.value)}
              placeholder={field.placeholder || ""}
              required={field.required}
              className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text placeholder-custom-text/50 focus:outline-none focus:border-cyber-green"
            />
          )}

          {field.field_type === "textarea" && (
            <textarea
              value={responses[field.id] || ""}
              onChange={(e) => handleChange(field.id, e.target.value)}
              placeholder={field.placeholder || ""}
              required={field.required}
              rows={4}
              className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text placeholder-custom-text/50 focus:outline-none focus:border-cyber-green"
            />
          )}

          {field.field_type === "select" && field.options && (
            <select
              value={responses[field.id] || ""}
              onChange={(e) => handleChange(field.id, e.target.value)}
              required={field.required}
              className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text focus:outline-none focus:border-cyber-green"
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
                    className="w-4 h-4 text-cyber-green focus:ring-cyber-green"
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
                    className="w-4 h-4 text-cyber-green focus:ring-cyber-green rounded"
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
          className="px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-cyber-green/30 text-custom-text font-semibold rounded-lg hover:bg-dark-green-800/50 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

