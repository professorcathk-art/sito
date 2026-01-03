"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";
import { RichTextEditor } from "@/components/rich-text-editor";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  pricing_type: "one-off" | "hourly";
  product_type?: "service" | "course" | "appointment";
  course_id?: string;
  appointment_slot_id?: string;
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
  created_at: string;
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
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    pricing_type: "one-off" as "one-off" | "hourly",
    product_type: "appointment" as "course" | "appointment",
    course_id: "",
    category: "",
  });
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
  const [editingField, setEditingField] = useState<any | null>(null);
  const [fieldForm, setFieldForm] = useState({
    field_type: "text" as "text" | "email" | "textarea" | "select" | "checkbox" | "radio",
    label: "",
    placeholder: "",
    required: false,
    options: "",
  });

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchCourses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
      const { data, error } = await supabase
        .from("product_interests")
        .select(`
          id,
          product_id,
          user_id,
          user_email,
          country_code,
          phone_number,
          created_at,
          products!inner(name, expert_id)
        `)
        .in("product_id", productIds)
        .eq("products.expert_id", user.id);

      if (error) {
        console.error("Error fetching interests:", error);
        // If no interests found, that's okay
        if (error.code !== "PGRST116") {
          throw error;
        }
        setInterests([]);
        return;
      }

      console.log("Interests fetched:", data?.length || 0);

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

      const interestsData = (data || []).map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.products?.name || "Unknown Product",
        user_id: item.user_id,
        user_email: item.user_email,
        user_name: userNameMap[item.user_id] || "Unknown User",
        country_code: item.country_code || undefined,
        phone_number: item.phone_number || undefined,
        created_at: item.created_at,
      }));

      setInterests(interestsData);
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

    if (!formData.name || !formData.description) {
      setError("Please fill in name and description");
      return;
    }

    if (formData.product_type === "course" && !formData.category) {
      setError("Please select a category for your course");
      return;
    }

    try {
      if (formData.product_type === "course") {
        // For course: auto-create course and product
        const coursePrice = formData.price ? parseFloat(formData.price) || 0 : 0;
        const { data: newCourse, error: courseError } = await supabase
          .from("courses")
          .insert({
            expert_id: user.id,
            title: formData.name,
            description: formData.description,
            is_free: coursePrice === 0,
            price: coursePrice,
            category: formData.category || "",
            published: false,
          })
          .select()
          .single();

        if (courseError) throw courseError;

        // Create product linked to course - sync price
        const { data: newProduct, error: productError } = await supabase.from("products").insert({
          expert_id: user.id,
          name: formData.name,
          description: formData.description,
          product_type: "course",
          course_id: newCourse.id,
          price: coursePrice,
          pricing_type: "one-off",
        }).select().single();

        if (productError) throw productError;

        // Set current product and course, show questionnaire form inline
        setCurrentProductId(newProduct.id);
        setCurrentCourseId(newCourse.id);
        setShowAddForm(false);
        setShowQuestionnaireForm(true);
        setQuestionnaireType("course_enrollment");
        setQuestionnaireFields([]);
        setFieldForm({
          field_type: "text",
          label: "",
          placeholder: "",
          required: false,
          options: "",
        });
        setFormData({
          name: "",
          description: "",
          price: "",
          pricing_type: "one-off",
          product_type: "appointment",
          course_id: "",
          category: "",
        });
        return;
      } else if (formData.product_type === "appointment") {
        // For appointment: create product first, then show appointment form inline
        const { data: newProduct, error: productError } = await supabase.from("products").insert({
          expert_id: user.id,
          name: formData.name,
          description: formData.description,
          product_type: "appointment",
          price: 0,
          pricing_type: "hourly",
        }).select().single();

        if (productError) throw productError;

        // Set current product and show appointment form
        setCurrentProductId(newProduct.id);
        setShowAppointmentForm(true);
        setShowAddForm(false);
        setQuestionnaireType("appointment");
        setFormData({
          name: "",
          description: "",
          price: "",
          pricing_type: "one-off",
          product_type: "appointment",
          course_id: "",
          category: "",
        });
        return;
      }

      if (editingProduct) {
        // Update existing product - DO NOT CREATE NEW COURSE
        const productData: any = {
          name: formData.name,
          description: formData.description,
          product_type: formData.product_type,
        };

        // Add price if provided
        if (formData.price) {
          productData.price = parseFloat(formData.price) || 0;
        }

        // If updating a course product, also update the course price, description, and category
        if (formData.product_type === "course" && editingProduct.course_id) {
          const courseUpdateData: any = {};
          
          if (formData.price) {
            courseUpdateData.price = parseFloat(formData.price) || 0;
          }
          
          // Update course description if provided
          if (formData.description) {
            courseUpdateData.description = formData.description;
          }
          
          // Update course category if provided
          if (formData.category) {
            courseUpdateData.category = formData.category;
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

        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingProduct.id)
          .eq("expert_id", user.id);

        if (error) throw error;
        
        alert("Product updated successfully!");
      }

      setFormData({
        name: "",
        description: "",
        price: "",
        pricing_type: "one-off",
        product_type: "appointment",
        course_id: "",
        category: "",
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
    
    // If it's a course product, fetch the course category
    if (product.product_type === "course" && product.course_id) {
      try {
        const { data: courseData } = await supabase
          .from("courses")
          .select("category")
          .eq("id", product.course_id)
          .single();
        if (courseData) {
          category = courseData.category || "";
        }
      } catch (err) {
        console.error("Error fetching course category:", err);
      }
    }
    
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      pricing_type: product.pricing_type,
      product_type: (product.product_type === "service" ? "appointment" : product.product_type) || "appointment",
      course_id: product.course_id || "",
      category: category,
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

  const downloadInterestsCSV = () => {
    if (interests.length === 0) {
      alert("No interests to download");
      return;
    }

    const headers = ["Product Name", "User Name", "User Email", "Phone Number", "Registered Date"];
    const rows = interests.map((interest) => [
      interest.product_name,
      interest.user_name,
      interest.user_email,
      interest.country_code && interest.phone_number 
        ? `${interest.country_code} ${interest.phone_number}` 
        : interest.phone_number || "",
      new Date(interest.created_at).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
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
                product_type: "appointment",
                course_id: "",
                category: "",
              });
            }}
            className="bg-cyber-green text-custom-text px-4 py-2 rounded-lg font-semibold hover:bg-cyber-green-light transition-colors shadow-[0_0_15px_rgba(0,255,136,0.3)]"
          >
            + Add Product
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-cyber-green/30">
        <button
          onClick={() => setActiveTab("products")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "products"
              ? "text-cyber-green border-b-2 border-cyber-green"
              : "text-custom-text/70 hover:text-custom-text"
          }`}
        >
          My Products ({products.length})
        </button>
        <button
          onClick={() => setActiveTab("interests")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "interests"
              ? "text-cyber-green border-b-2 border-cyber-green"
              : "text-custom-text/70 hover:text-custom-text"
          }`}
        >
          Registered Interests ({interests.length})
        </button>
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
                Product Name *
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
                  const newType = e.target.value as "course" | "appointment";
                  setFormData({
                    ...formData,
                    product_type: newType,
                    course_id: "",
                    price: "",
                  });
                }}
                className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg focus:ring-2 focus:ring-cyber-green focus:border-cyber-green text-custom-text"
                required
              >
                <option value="appointment">1-on-1 Session</option>
                <option value="course">Course</option>
              </select>
              <p className="text-xs text-custom-text/60 mt-1">
                {formData.product_type === "course" && "Create a course with lessons. You can add lessons now or skip and add them later."}
                {formData.product_type === "appointment" && "Create a 1-on-1 session service. After adding description, you'll set up appointment slots and pricing."}
              </p>
            </div>

            {formData.product_type === "course" && (
              <div>
                <label className="block text-sm font-medium text-custom-text mb-2">
                  Category *
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg focus:ring-2 focus:ring-cyber-green focus:border-cyber-green text-custom-text"
                  placeholder="e.g., AI Courses, Business, Design, Marketing"
                  required
                />
                <p className="text-xs text-custom-text/60 mt-1">Choose a category to help users discover your course</p>
              </div>
            )}

            {(formData.product_type === "appointment" || editingProduct) && (
              <div>
                <label className="block text-sm font-medium text-custom-text mb-2">
                  Price (USD) {formData.product_type === "appointment" ? "(per hour)" : ""}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg focus:ring-2 focus:ring-cyber-green focus:border-cyber-green text-custom-text"
                  placeholder="0.00"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-custom-text mb-2">Description *</label>
              <RichTextEditor
                content={formData.description}
                onChange={(newContent) => setFormData({ ...formData, description: newContent })}
                placeholder="Describe your product or service..."
              />
            </div>
            <div className="flex gap-4">
              <button
                type="submit"
                className="bg-cyber-green text-custom-text px-6 py-2 rounded-lg font-semibold hover:bg-cyber-green-light transition-colors shadow-[0_0_15px_rgba(0,255,136,0.3)]"
              >
                {editingProduct ? "Update Product" : formData.product_type === "course" ? "Next: Create Form" : "Next: Set Up Sessions"}
              </button>
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
                    course_id: "",
                    category: "",
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
              if (error) throw error;

              alert(`Successfully created ${slots.length} appointment slots!`);
              // Show questionnaire form after slots are created
              setShowAppointmentForm(false);
              setShowQuestionnaireForm(true);
              setQuestionnaireType("appointment");
              setQuestionnaireFields([]);
              setFieldForm({
                field_type: "text",
                label: "",
                placeholder: "",
                required: false,
                options: "",
              });
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
      {showQuestionnaireForm && currentProductId && questionnaireType && (
        <div className="bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 rounded-xl p-6 mb-6">
          <h3 className="text-xl font-bold text-custom-text mb-4">
            {questionnaireType === "course_enrollment" ? "Create Course Enrollment Form" : "Create Appointment Booking Form"}
          </h3>
          <p className="text-sm text-custom-text/70 mb-6">
            Add custom questions for users to fill out before {questionnaireType === "course_enrollment" ? "enrolling" : "booking"}.
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
                  // Add new field
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

                setFieldForm({
                  field_type: "text",
                  label: "",
                  placeholder: "",
                  required: false,
                  options: "",
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
                  <option value="textarea">Textarea</option>
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
                    });
                  }}
                  className="px-6 py-3 border border-cyber-green/30 text-custom-text rounded-lg hover:bg-dark-green-800/50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
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
                + Add Field
              </button>
            )}
            <button
              type="button"
              onClick={async () => {
                // Save and close questionnaire form
                setShowQuestionnaireForm(false);
                setCurrentProductId(null);
                setCurrentCourseId(null);
                setQuestionnaireType(null);
                setCurrentQuestionnaireId(null);
                setQuestionnaireFields([]);
                fetchProducts();
                alert("Questionnaire saved successfully! Your product is ready.");
              }}
              className="px-6 py-3 border border-cyber-green/30 text-custom-text rounded-lg hover:bg-dark-green-800/50 transition-colors"
            >
              {questionnaireFields.length === 0 ? "Skip & Finish" : "Save & Finish"}
            </button>
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
                {courseLessons.length === 0 ? "Skip & Publish Course" : "Publish Course"}
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
                className="bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 rounded-xl p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-custom-text mb-2">{product.name}</h3>
                    <div 
                      className="product-preview text-custom-text/80 mb-3"
                      dangerouslySetInnerHTML={{ __html: product.description }}
                    />
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-cyber-green font-semibold">
                        USD ${product.price} {product.pricing_type === "hourly" ? "/ hour" : ""}
                      </span>
                      <span className="text-custom-text/60">
                        {product.pricing_type === "hourly" ? "Hourly Rate" : "One-off Price"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(product)}
                      className="px-4 py-2 bg-dark-green-800/50 text-custom-text border border-cyber-green/30 rounded-lg hover:bg-dark-green-800 hover:border-cyber-green transition-colors text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="px-4 py-2 bg-red-900/30 text-red-200 border border-red-500/50 rounded-lg hover:bg-red-900/50 transition-colors text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
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
    </div>
  );
}

