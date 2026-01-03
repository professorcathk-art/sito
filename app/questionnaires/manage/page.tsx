"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ProtectedRoute } from "@/components/protected-route";

interface Questionnaire {
  id: string;
  type: "appointment" | "course_interest";
  title: string;
  is_active: boolean;
}

interface QuestionnaireField {
  id: string;
  field_type: "text" | "email" | "textarea" | "select" | "checkbox" | "radio";
  label: string;
  placeholder: string | null;
  required: boolean;
  options: string[] | null;
  order_index: number;
}

export default function ManageQuestionnairesPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<Questionnaire | null>(null);
  const [fields, setFields] = useState<QuestionnaireField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [editingField, setEditingField] = useState<QuestionnaireField | null>(null);
  const [fieldForm, setFieldForm] = useState({
    field_type: "text" as QuestionnaireField["field_type"],
    label: "",
    placeholder: "",
    required: false,
    options: "",
  });

  useEffect(() => {
    if (user) {
      fetchQuestionnaires();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchQuestionnaires = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("questionnaires")
        .select("*")
        .eq("expert_id", user.id)
        .order("type", { ascending: true });

      if (error) throw error;
      setQuestionnaires(data || []);
    } catch (err) {
      console.error("Error fetching questionnaires:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFields = async (questionnaireId: string) => {
    try {
      const { data, error } = await supabase
        .from("questionnaire_fields")
        .select("*")
        .eq("questionnaire_id", questionnaireId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      setFields(data || []);
    } catch (err) {
      console.error("Error fetching fields:", err);
    }
  };

  const handleSelectQuestionnaire = async (questionnaire: Questionnaire) => {
    setSelectedQuestionnaire(questionnaire);
    await fetchFields(questionnaire.id);
  };

  const handleCreateQuestionnaire = async (type: "appointment" | "course_interest") => {
    if (!user) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("questionnaires")
        .insert({
          expert_id: user.id,
          type,
          title: type === "appointment" ? "Appointment Questionnaire" : "Course Interest Questionnaire",
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      await fetchQuestionnaires();
      if (data) {
        await handleSelectQuestionnaire(data);
      }
    } catch (err: any) {
      console.error("Error creating questionnaire:", err);
      if (err.code === "23505") {
        alert("You already have a questionnaire for this type. Please edit the existing one.");
      } else {
        alert("Failed to create questionnaire.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (questionnaire: Questionnaire) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("questionnaires")
        .update({ is_active: !questionnaire.is_active })
        .eq("id", questionnaire.id)
        .eq("expert_id", user.id);

      if (error) throw error;
      await fetchQuestionnaires();
      if (selectedQuestionnaire?.id === questionnaire.id) {
        setSelectedQuestionnaire({ ...questionnaire, is_active: !questionnaire.is_active });
      }
    } catch (err) {
      console.error("Error toggling questionnaire:", err);
      alert("Failed to update questionnaire.");
    }
  };

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuestionnaire || !user) return;

    try {
      const options = fieldForm.field_type === "select" || fieldForm.field_type === "radio" || fieldForm.field_type === "checkbox"
        ? fieldForm.options.split(",").map(o => o.trim()).filter(Boolean)
        : null;

      const newField: Omit<QuestionnaireField, "id"> = {
        questionnaire_id: selectedQuestionnaire.id,
        field_type: fieldForm.field_type,
        label: fieldForm.label,
        placeholder: fieldForm.placeholder || null,
        required: fieldForm.required,
        options: options ? JSON.stringify(options) : null,
        order_index: fields.length,
      };

      const { error } = await supabase.from("questionnaire_fields").insert(newField);

      if (error) throw error;
      alert("Field added successfully!");
      setFieldForm({
        field_type: "text",
        label: "",
        placeholder: "",
        required: false,
        options: "",
      });
      setShowFieldForm(false);
      await fetchFields(selectedQuestionnaire.id);
    } catch (err) {
      console.error("Error adding field:", err);
      alert("Failed to add field.");
    }
  };

  const handleEditField = (field: QuestionnaireField) => {
    setEditingField(field);
    setFieldForm({
      field_type: field.field_type,
      label: field.label,
      placeholder: field.placeholder || "",
      required: field.required,
      options: field.options ? (Array.isArray(field.options) ? field.options.join(", ") : JSON.parse(field.options as any).join(", ")) : "",
    });
    setShowFieldForm(true);
  };

  const handleUpdateField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuestionnaire || !editingField || !user) return;

    try {
      const options = fieldForm.field_type === "select" || fieldForm.field_type === "radio" || fieldForm.field_type === "checkbox"
        ? fieldForm.options.split(",").map(o => o.trim()).filter(Boolean)
        : null;

      const { error } = await supabase
        .from("questionnaire_fields")
        .update({
          field_type: fieldForm.field_type,
          label: fieldForm.label,
          placeholder: fieldForm.placeholder || null,
          required: fieldForm.required,
          options: options ? JSON.stringify(options) : null,
        })
        .eq("id", editingField.id)
        .eq("questionnaire_id", selectedQuestionnaire.id);

      if (error) throw error;
      alert("Field updated successfully!");
      setFieldForm({
        field_type: "text",
        label: "",
        placeholder: "",
        required: false,
        options: "",
      });
      setEditingField(null);
      setShowFieldForm(false);
      await fetchFields(selectedQuestionnaire.id);
    } catch (err) {
      console.error("Error updating field:", err);
      alert("Failed to update field.");
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!confirm("Are you sure you want to delete this field?")) return;
    if (!selectedQuestionnaire || !user) return;

    try {
      const { error } = await supabase
        .from("questionnaire_fields")
        .delete()
        .eq("id", fieldId)
        .eq("questionnaire_id", selectedQuestionnaire.id);

      if (error) throw error;
      alert("Field deleted successfully!");
      await fetchFields(selectedQuestionnaire.id);
    } catch (err) {
      console.error("Error deleting field:", err);
      alert("Failed to delete field.");
    }
  };

  const handleReorderFields = async (fieldId: string, direction: "up" | "down") => {
    if (!selectedQuestionnaire) return;
    const fieldIndex = fields.findIndex(f => f.id === fieldId);
    if (fieldIndex === -1) return;
    
    const newIndex = direction === "up" ? fieldIndex - 1 : fieldIndex + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;

    try {
      const field1 = fields[fieldIndex];
      const field2 = fields[newIndex];
      
      await supabase
        .from("questionnaire_fields")
        .update({ order_index: field2.order_index })
        .eq("id", field1.id);
      
      await supabase
        .from("questionnaire_fields")
        .update({ order_index: field1.order_index })
        .eq("id", field2.id);

      await fetchFields(selectedQuestionnaire.id);
    } catch (err) {
      console.error("Error reordering fields:", err);
      alert("Failed to reorder fields.");
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="px-4 sm:px-6 lg:px-8 py-8 text-custom-text">Loading questionnaires...</div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          {!selectedQuestionnaire ? (
            <>
              <h1 className="text-4xl font-bold text-custom-text mb-8">Manage Questionnaires</h1>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6">
                  <h2 className="text-xl font-bold text-custom-text mb-2">Appointment Questionnaire</h2>
                  <p className="text-custom-text/70 mb-4 text-sm">
                    Set up a form for users to fill out before booking appointments with you.
                  </p>
                  {questionnaires.find(q => q.type === "appointment") ? (
                    <button
                      onClick={() => handleSelectQuestionnaire(questionnaires.find(q => q.type === "appointment")!)}
                      className="px-4 py-2 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
                    >
                      Edit Questionnaire
                    </button>
                  ) : (
                    <button
                      onClick={() => handleCreateQuestionnaire("appointment")}
                      disabled={saving}
                      className="px-4 py-2 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors disabled:opacity-50"
                    >
                      {saving ? "Creating..." : "Create Questionnaire"}
                    </button>
                  )}
                </div>

                <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6">
                  <h2 className="text-xl font-bold text-custom-text mb-2">Course Interest Questionnaire</h2>
                  <p className="text-custom-text/70 mb-4 text-sm">
                    Set up a form for users to fill out when registering interest in your courses.
                  </p>
                  {questionnaires.find(q => q.type === "course_interest") ? (
                    <button
                      onClick={() => handleSelectQuestionnaire(questionnaires.find(q => q.type === "course_interest")!)}
                      className="px-4 py-2 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors"
                    >
                      Edit Questionnaire
                    </button>
                  ) : (
                    <button
                      onClick={() => handleCreateQuestionnaire("course_interest")}
                      disabled={saving}
                      className="px-4 py-2 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light transition-colors disabled:opacity-50"
                    >
                      {saving ? "Creating..." : "Create Questionnaire"}
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-8">
              <button
                onClick={() => {
                  setSelectedQuestionnaire(null);
                  setFields([]);
                  setShowFieldForm(false);
                  setEditingField(null);
                }}
                className="text-cyber-green hover:text-cyber-green-light mb-4"
              >
                ← Back to Questionnaires
              </button>

              <div className="bg-dark-green-800/30 border border-cyber-green/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-custom-text mb-2">
                      {selectedQuestionnaire.type === "appointment" ? "Appointment" : "Course Interest"} Questionnaire
                    </h2>
                    <p className="text-custom-text/70">{selectedQuestionnaire.title}</p>
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedQuestionnaire.is_active}
                      onChange={() => handleToggleActive(selectedQuestionnaire)}
                      className="w-4 h-4 text-cyber-green focus:ring-cyber-green rounded"
                    />
                    <span className="text-sm text-custom-text">Active</span>
                  </label>
                </div>

                <div className="space-y-4 mb-6">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="bg-dark-green-900/50 border border-cyber-green/30 rounded-lg p-4 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-cyber-green">{index + 1}.</span>
                          <span className="font-semibold text-custom-text">{field.label}</span>
                          <span className="text-xs text-custom-text/60">({field.field_type})</span>
                          {field.required && <span className="text-xs text-red-400">Required</span>}
                        </div>
                        {field.placeholder && (
                          <p className="text-sm text-custom-text/70">Placeholder: {field.placeholder}</p>
                        )}
                        {field.options && (
                          <p className="text-sm text-custom-text/70">
                            Options: {Array.isArray(field.options) ? field.options.join(", ") : JSON.parse(field.options as any).join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReorderFields(field.id, "up")}
                          disabled={index === 0}
                          className="px-2 py-1 bg-dark-green-800/50 text-custom-text rounded hover:bg-dark-green-800 disabled:opacity-50 text-sm"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => handleReorderFields(field.id, "down")}
                          disabled={index === fields.length - 1}
                          className="px-2 py-1 bg-dark-green-800/50 text-custom-text rounded hover:bg-dark-green-800 disabled:opacity-50 text-sm"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => handleEditField(field)}
                          className="px-3 py-1 bg-blue-900/50 text-blue-300 rounded-lg hover:bg-blue-900/70 transition-colors text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteField(field.id)}
                          className="px-3 py-1 bg-red-900/50 text-red-300 rounded-lg hover:bg-red-900/70 transition-colors text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {showFieldForm ? (
                  <div className="bg-dark-green-900/50 border border-cyber-green/30 rounded-lg p-6">
                    <h3 className="text-xl font-bold text-custom-text mb-4">
                      {editingField ? "Edit Field" : "Add New Field"}
                    </h3>
                    <form onSubmit={editingField ? handleUpdateField : handleAddField} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-custom-text mb-2">Field Type</label>
                        <select
                          value={fieldForm.field_type}
                          onChange={(e) => setFieldForm({ ...fieldForm, field_type: e.target.value as QuestionnaireField["field_type"] })}
                          className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                          required
                        >
                          <option value="text">Text</option>
                          <option value="email">Email</option>
                          <option value="textarea">Textarea</option>
                          <option value="select">Select Dropdown</option>
                          <option value="radio">Radio Buttons</option>
                          <option value="checkbox">Checkboxes</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-custom-text mb-2">Label</label>
                        <input
                          type="text"
                          value={fieldForm.label}
                          onChange={(e) => setFieldForm({ ...fieldForm, label: e.target.value })}
                          className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-custom-text mb-2">Placeholder (Optional)</label>
                        <input
                          type="text"
                          value={fieldForm.placeholder}
                          onChange={(e) => setFieldForm({ ...fieldForm, placeholder: e.target.value })}
                          className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                        />
                      </div>
                      {(fieldForm.field_type === "select" || fieldForm.field_type === "radio" || fieldForm.field_type === "checkbox") && (
                        <div>
                          <label className="block text-sm font-medium text-custom-text mb-2">
                            Options (comma-separated)
                          </label>
                          <input
                            type="text"
                            value={fieldForm.options}
                            onChange={(e) => setFieldForm({ ...fieldForm, options: e.target.value })}
                            placeholder="Option 1, Option 2, Option 3"
                            className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                            required
                          />
                        </div>
                      )}
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="required"
                          checked={fieldForm.required}
                          onChange={(e) => setFieldForm({ ...fieldForm, required: e.target.checked })}
                          className="w-4 h-4 text-cyber-green focus:ring-cyber-green rounded"
                        />
                        <label htmlFor="required" className="ml-2 block text-sm text-custom-text">
                          Required Field
                        </label>
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
                            });
                          }}
                          className="px-6 py-3 border border-cyber-green/30 text-custom-text font-semibold rounded-lg hover:bg-dark-green-800/50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowFieldForm(true)}
                    className="w-full px-6 py-4 bg-dark-green-800/50 border-2 border-dashed border-cyber-green/30 text-custom-text font-semibold rounded-lg hover:bg-dark-green-800/70 hover:border-cyber-green transition-colors"
                  >
                    + Add Field
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

