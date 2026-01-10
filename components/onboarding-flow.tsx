"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
}

interface Country {
  id: string;
  name: string;
  code: string;
}

type OnboardingStep = 
  | "intention" 
  | "learner-details" 
  | "expert-details" 
  | "profile-completion";

export function OnboardingFlow() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();
  const [step, setStep] = useState<OnboardingStep>("intention");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);

  // Form data
  const [intention, setIntention] = useState<"learn" | "teach" | null>(null);
  
  // Learner fields
  const [learningInterests, setLearningInterests] = useState<string[]>([]);
  const [learningCategoryId, setLearningCategoryId] = useState("");
  const [learningLocation, setLearningLocation] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<"beginner" | "intermediate" | "advanced" | "">("");
  const [age, setAge] = useState("");
  
  // Expert fields
  const [expertiseCategoryId, setExpertiseCategoryId] = useState("");
  const [expertiseLevel, setExpertiseLevel] = useState<"beginner" | "intermediate" | "advanced" | "expert" | "">("");
  const [expertBio, setExpertBio] = useState("");
  const [teachingInterests, setTeachingInterests] = useState<string[]>([]);
  
  // Profile completion fields
  const [displayName, setDisplayName] = useState("");
  const [tagline, setTagline] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    // Check if user already completed onboarding
    checkOnboardingStatus();
    fetchCategoriesAndCountries();
    fetchUserProfile();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkOnboardingStatus = async () => {
    if (!user) return;
    
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .single();
      
      if (profile?.onboarding_completed) {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Error checking onboarding status:", err);
    }
  };

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, email")
        .eq("id", user.id)
        .single();
      
      if (profile?.name) {
        setDisplayName(profile.name);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  const fetchCategoriesAndCountries = async () => {
    try {
      const [categoriesRes, countriesRes] = await Promise.all([
        supabase.from("categories").select("id, name").order("name"),
        supabase.from("countries").select("id, name, code").order("name"),
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (countriesRes.data) setCountries(countriesRes.data);
    } catch (err) {
      console.error("Error fetching categories/countries:", err);
    }
  };

  const handleIntentionSelect = (selected: "learn" | "teach") => {
    setIntention(selected);
    if (selected === "learn") {
      setStep("learner-details");
    } else {
      setStep("expert-details");
    }
  };

  const handleLearnerSubmit = async () => {
    if (!user) return;
    
    setLoading(true);
    setError("");

    try {
      // Get default country_id if not already set in profile
      let defaultCountryId = null;
      try {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("country_id")
          .eq("id", user.id)
          .maybeSingle();
        
        // If profile exists and has country_id, use it
        if (existingProfile?.country_id) {
          defaultCountryId = existingProfile.country_id;
        } else {
          // Try to get default country
          const { data: defaultCountry } = await supabase
            .from("countries")
            .select("id")
            .or("name.eq.Remote,code.eq.HK")
            .limit(1)
            .maybeSingle();
          
          defaultCountryId = defaultCountry?.id || null;
        }
      } catch (err) {
        console.warn("Could not fetch country_id:", err);
        // Continue - will use existing country_id if profile exists
      }

      const updateData: any = {
        id: user.id,
        user_intention: "learn",
        learning_category_id: learningCategoryId || null,
        learning_location: learningLocation || null,
        experience_level: experienceLevel || null,
        age: age ? parseInt(age) : null,
      };

      // Include country_id if we have it (required by NOT NULL constraint)
      if (defaultCountryId) {
        updateData.country_id = defaultCountryId;
      }

      if (learningInterests.length > 0) {
        updateData.learning_interests = learningInterests;
      }

      // Use upsert to handle case where profile might not exist
      const { error } = await supabase
        .from("profiles")
        .upsert(updateData, { onConflict: "id" });

      if (error) throw error;

      setStep("profile-completion");
    } catch (err: any) {
      setError(err.message || "Failed to save learner details");
    } finally {
      setLoading(false);
    }
  };

  const handleExpertSubmit = async () => {
    if (!user) return;
    
    // Validate required fields for expert profile
    if (!expertiseCategoryId) {
      setError("Please select your area of expertise");
      return;
    }
    
    if (!expertBio || expertBio.trim().length < 10) {
      setError("Please provide a bio (at least 10 characters)");
      return;
    }
    
    setLoading(true);
    setError("");

    try {
      // Get default country_id if not already set in profile
      let defaultCountryId = null;
      try {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("country_id")
          .eq("id", user.id)
          .maybeSingle();
        
        // If profile exists and has country_id, use it
        if (existingProfile?.country_id) {
          defaultCountryId = existingProfile.country_id;
        } else {
          // Try to get default country
          const { data: defaultCountry } = await supabase
            .from("countries")
            .select("id")
            .or("name.eq.Remote,code.eq.HK")
            .limit(1)
            .maybeSingle();
          
          defaultCountryId = defaultCountry?.id || null;
        }
      } catch (err) {
        console.warn("Could not fetch country_id:", err);
        // Continue - will use existing country_id if profile exists
      }

      const updateData: any = {
        id: user.id,
        user_intention: "teach",
        category_id: expertiseCategoryId,
        expertise_level: expertiseLevel || null,
        bio: expertBio,
      };

      // Include country_id if we have it (required by NOT NULL constraint)
      if (defaultCountryId) {
        updateData.country_id = defaultCountryId;
      }

      if (teachingInterests.length > 0) {
        updateData.teaching_interests = teachingInterests;
      }

      // Use upsert to handle case where profile might not exist
      const { error } = await supabase
        .from("profiles")
        .upsert(updateData, { onConflict: "id" });

      if (error) throw error;

      setStep("profile-completion");
    } catch (err: any) {
      setError(err.message || "Failed to save expert details");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileCompletion = async () => {
    if (!user) return;
    
    if (!displayName.trim()) {
      setError("Display name is required");
      return;
    }

    if (tagline && tagline.length > 100) {
      setError("Tagline must not exceed 100 characters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Get country_id from existing profile or fetch default
      let countryId = null;
      try {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("country_id")
          .eq("id", user.id)
          .maybeSingle();
        
        if (existingProfile?.country_id) {
          countryId = existingProfile.country_id;
        } else {
          // Try to get default country if profile doesn't have it
          const { data: defaultCountry } = await supabase
            .from("countries")
            .select("id")
            .or("name.eq.Remote,code.eq.HK")
            .limit(1)
            .maybeSingle();
          
          countryId = defaultCountry?.id || null;
        }
      } catch (err) {
        console.warn("Could not fetch country_id:", err);
      }

      const updateData: any = {
        id: user.id,
        name: displayName,
        tagline: tagline || null,
        location: location || null,
        onboarding_completed: true,
      };

      // Include country_id if we have it (required by NOT NULL constraint)
      if (countryId) {
        updateData.country_id = countryId;
      }

      // Use upsert to handle case where profile might not exist
      const { error } = await supabase
        .from("profiles")
        .upsert(updateData, { onConflict: "id" });

      if (error) throw error;

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to complete profile");
    } finally {
      setLoading(false);
    }
  };

  const addLearningInterest = () => {
    const input = document.getElementById("learning-interest-input") as HTMLInputElement;
    if (input && input.value.trim() && !learningInterests.includes(input.value.trim())) {
      setLearningInterests([...learningInterests, input.value.trim()]);
      input.value = "";
    }
  };

  const removeLearningInterest = (interest: string) => {
    setLearningInterests(learningInterests.filter(i => i !== interest));
  };

  const addTeachingInterest = () => {
    const input = document.getElementById("teaching-interest-input") as HTMLInputElement;
    if (input && input.value.trim() && !teachingInterests.includes(input.value.trim())) {
      setTeachingInterests([...teachingInterests, input.value.trim()]);
      input.value = "";
    }
  };

  const removeTeachingInterest = (interest: string) => {
    setTeachingInterests(teachingInterests.filter(i => i !== interest));
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-custom-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-custom-text mb-4">Please sign in to continue</p>
          <Link href="/login" className="text-cyber-green hover:text-cyber-green-light">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-custom-bg flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-cyber-green inline-block mb-2">
            Sito
          </Link>
          <h1 className="text-3xl font-bold text-custom-text mb-2">Welcome to Sito!</h1>
          <p className="text-custom-text/80">Let&apos;s get you started</p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === "intention" ? "bg-cyber-green text-dark-green-900" : 
              step === "learner-details" || step === "expert-details" || step === "profile-completion" 
                ? "bg-cyber-green/50 text-custom-text" : "bg-dark-green-800/50 text-custom-text/50"
            }`}>
              1
            </div>
            <div className={`h-1 w-16 ${
              step === "learner-details" || step === "expert-details" || step === "profile-completion"
                ? "bg-cyber-green" : "bg-dark-green-800/50"
            }`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === "learner-details" || step === "expert-details" ? "bg-cyber-green text-dark-green-900" :
              step === "profile-completion" ? "bg-cyber-green/50 text-custom-text" : "bg-dark-green-800/50 text-custom-text/50"
            }`}>
              2
            </div>
            <div className={`h-1 w-16 ${
              step === "profile-completion" ? "bg-cyber-green" : "bg-dark-green-800/50"
            }`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === "profile-completion" ? "bg-cyber-green text-dark-green-900" : "bg-dark-green-800/50 text-custom-text/50"
            }`}>
              3
            </div>
          </div>
        </div>

        <div className="bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 p-8 rounded-2xl shadow-lg">
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 text-red-200 rounded-lg">
              {error}
            </div>
          )}

          {/* Step 1: Intention */}
          {step === "intention" && (
            <div>
              <h2 className="text-2xl font-bold text-custom-text mb-4">What brings you to Sito?</h2>
              <p className="text-custom-text/80 mb-6">
                We&apos;d love to understand your goals so we can personalize your experience
              </p>
              <div className="space-y-4">
                <button
                  onClick={() => handleIntentionSelect("learn")}
                  className="w-full p-6 bg-dark-green-900/50 border-2 border-cyber-green/30 rounded-lg hover:border-cyber-green hover:bg-dark-green-900/70 transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">🎓</div>
                    <div>
                      <h3 className="text-xl font-semibold text-custom-text mb-1">Learn from Experts</h3>
                      <p className="text-custom-text/70">
                        I want to learn new skills, gain knowledge, and connect with industry experts
                      </p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => handleIntentionSelect("teach")}
                  className="w-full p-6 bg-dark-green-900/50 border-2 border-cyber-green/30 rounded-lg hover:border-cyber-green hover:bg-dark-green-900/70 transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">💡</div>
                    <div>
                      <h3 className="text-xl font-semibold text-custom-text mb-1">Share Knowledge & Experience</h3>
                      <p className="text-custom-text/70">
                        I want to teach, mentor, and share my expertise with others
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2a: Learner Details */}
          {step === "learner-details" && (
            <div>
              <h2 className="text-2xl font-bold text-custom-text mb-4">Tell us about your learning goals</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-custom-text mb-2">
                    What do you want to learn? (Add multiple interests)
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      id="learning-interest-input"
                      type="text"
                      className="flex-1 px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                      placeholder="e.g., Web Development, Trading, Design..."
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addLearningInterest())}
                    />
                    <button
                      type="button"
                      onClick={addLearningInterest}
                      className="px-4 py-2 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light"
                    >
                      Add
                    </button>
                  </div>
                  {learningInterests.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {learningInterests.map((interest, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-cyber-green/20 text-cyber-green rounded-full text-sm flex items-center gap-2"
                        >
                          {interest}
                          <button
                            type="button"
                            onClick={() => removeLearningInterest(interest)}
                            className="hover:text-red-400"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-custom-text mb-2">
                    Category of Learning
                  </label>
                  <select
                    value={learningCategoryId}
                    onChange={(e) => setLearningCategoryId(e.target.value)}
                    className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                  >
                    <option value="">Select a category...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-custom-text mb-2">
                    Location
                  </label>
                  <select
                    value={learningLocation}
                    onChange={(e) => setLearningLocation(e.target.value)}
                    className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                  >
                    <option value="">Select a location...</option>
                    {countries.map((country) => (
                      <option key={country.id} value={country.name}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-custom-text mb-2">
                    Level of Experience
                  </label>
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value as any)}
                    className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                  >
                    <option value="">Select your level...</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-custom-text mb-2">
                    Age (Optional)
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    min="13"
                    max="120"
                    className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                    placeholder="e.g., 25"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setStep("intention")}
                    className="px-6 py-3 border border-cyber-green/30 text-custom-text rounded-lg hover:bg-dark-green-800/50"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleLearnerSubmit}
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light disabled:opacity-50"
                  >
                    {loading ? "Saving..." : "Continue"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2b: Expert Details */}
          {step === "expert-details" && (
            <div>
              <h2 className="text-2xl font-bold text-custom-text mb-4">Tell us about your expertise</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-custom-text mb-2">
                    Area of Expertise
                  </label>
                  <select
                    value={expertiseCategoryId}
                    onChange={(e) => setExpertiseCategoryId(e.target.value)}
                    className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                  >
                    <option value="">Select your area of expertise...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-custom-text mb-2">
                    Level of Expertise
                  </label>
                  <select
                    value={expertiseLevel}
                    onChange={(e) => setExpertiseLevel(e.target.value as any)}
                    className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                  >
                    <option value="">Select your level...</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-custom-text mb-2">
                    Bio
                  </label>
                  <textarea
                    value={expertBio}
                    onChange={(e) => setExpertBio(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                    placeholder="Tell us about yourself, your background, and what makes you an expert..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-custom-text mb-2">
                    What do you want to teach? (Add multiple topics)
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      id="teaching-interest-input"
                      type="text"
                      className="flex-1 px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                      placeholder="e.g., React Development, Investment Strategies..."
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTeachingInterest())}
                    />
                    <button
                      type="button"
                      onClick={addTeachingInterest}
                      className="px-4 py-2 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light"
                    >
                      Add
                    </button>
                  </div>
                  {teachingInterests.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {teachingInterests.map((interest, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-cyber-green/20 text-cyber-green rounded-full text-sm flex items-center gap-2"
                        >
                          {interest}
                          <button
                            type="button"
                            onClick={() => removeTeachingInterest(interest)}
                            className="hover:text-red-400"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setStep("intention")}
                    className="px-6 py-3 border border-cyber-green/30 text-custom-text rounded-lg hover:bg-dark-green-800/50"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleExpertSubmit}
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light disabled:opacity-50"
                  >
                    {loading ? "Saving..." : "Continue"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Profile Completion */}
          {step === "profile-completion" && (
            <div>
              <h2 className="text-2xl font-bold text-custom-text mb-4">Complete Your Profile</h2>
              <p className="text-custom-text/80 mb-6">
                Add a few final details to personalize your profile
              </p>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-custom-text mb-2">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-custom-text mb-2">
                    Tagline (Optional) <span className="text-xs text-custom-text/60">({tagline.length}/100 characters)</span>
                  </label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => {
                      // Prevent typing beyond 100 characters
                      if (e.target.value.length <= 100) {
                        setTagline(e.target.value);
                      }
                    }}
                    maxLength={100}
                    className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                    placeholder="A short tagline about yourself"
                  />
                  {tagline.length >= 90 && tagline.length < 100 && (
                    <p className="mt-1 text-xs text-yellow-400">Approaching character limit</p>
                  )}
                  {tagline.length === 100 && (
                    <p className="mt-1 text-xs text-red-400">Character limit reached (100 characters)</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-custom-text mb-2">
                    Location (Optional)
                  </label>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg text-custom-text"
                  >
                    <option value="">Select a location...</option>
                    {countries.map((country) => (
                      <option key={country.id} value={country.name}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (intention === "learn") {
                        setStep("learner-details");
                      } else {
                        setStep("expert-details");
                      }
                    }}
                    className="px-6 py-3 border border-cyber-green/30 text-custom-text rounded-lg hover:bg-dark-green-800/50"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleProfileCompletion}
                    disabled={loading || !displayName.trim() || (tagline ? tagline.length > 100 : false)}
                    className="flex-1 px-6 py-3 bg-cyber-green text-dark-green-900 font-semibold rounded-lg hover:bg-cyber-green-light disabled:opacity-50"
                  >
                    {loading ? "Completing..." : "Complete Setup"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
