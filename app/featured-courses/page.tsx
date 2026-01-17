"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import Link from "next/link";
import Image from "next/image";

interface Course {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  price: number;
  is_free: boolean;
  category: string | null;
  expert_id: string;
  expert_name: string;
  expert_avatar_url?: string;
  course_id: string; // product course_id
  e_learning_subtype?: "online-course" | "ebook" | "ai-prompt" | "live-webinar" | "other" | null;
}

export default function FeaturedCoursesPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCourses() {
      setLoading(true);
      try {
        // Fetch only course products
        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select(`
            id,
            name,
            description,
            price,
            course_id,
            expert_id,
            e_learning_subtype
          `)
          .eq("product_type", "e-learning")
          .order("created_at", { ascending: false });

        if (productsError) {
          console.error("Products query error:", productsError);
          throw productsError;
        }

        if (!productsData || productsData.length === 0) {
          setCourses([]);
          setLoading(false);
          return;
        }

        // Get course IDs and expert IDs
        const courseIds = productsData.map((p: any) => p.course_id).filter(Boolean);
        const expertIds = Array.from(new Set(productsData.map((p: any) => p.expert_id)));

        // Fetch course details - filter out deleted courses
        const { data: coursesData, error: coursesError } = await supabase
          .from("courses")
          .select("id, title, description, cover_image_url, category")
          .in("id", courseIds)
          .eq("published", true)
          .not("id", "is", null);

        if (coursesError) {
          console.error("Courses query error:", coursesError);
          throw coursesError;
        }

        // Fetch expert profiles
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, name, avatar_url")
          .in("id", expertIds)
          .eq("listed_on_marketplace", true);

        if (profilesError) {
          console.error("Profiles query error:", profilesError);
          throw profilesError;
        }

        // Filter out products with deleted courses
        const validCourseIds = coursesData?.map((c: any) => c.id) || [];
        const validProductsData = productsData.filter((p: any) => validCourseIds.includes(p.course_id));
        
        // Combine data
        const combinedCourses = validProductsData
          .map((product: any) => {
            const course = coursesData?.find((c: any) => c.id === product.course_id);
            const profile = profilesData?.find((p: any) => p.id === product.expert_id);
            
            if (!course || !profile) return null;

            return {
              id: course.id,
              title: course.title,
              description: course.description,
              cover_image_url: course.cover_image_url,
              price: product.price, // Use price from products table (golden source)
              is_free: product.price === 0,
              category: course.category,
              expert_id: product.expert_id,
              expert_name: profile.name || "Expert",
              expert_avatar_url: profile.avatar_url || undefined,
              course_id: product.course_id,
              e_learning_subtype: product.e_learning_subtype || null,
            };
          })
          .filter((item) => item !== null) as Course[];

        // Apply search filter
        let filtered = combinedCourses;
        if (searchQuery) {
          filtered = combinedCourses.filter(
            (course) =>
              course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              course.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              course.expert_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              course.category?.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }

        // Apply category filter
        if (selectedCategory) {
          filtered = filtered.filter((course) => course.category === selectedCategory);
        }

        setCourses(filtered);
      } catch (error) {
        console.error("Error fetching courses:", error);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    }

    async function fetchEnrolledCourses() {
      if (!user) {
        setEnrolledCourses([]);
        return;
      }
      try {
        // Fetch enrolled courses
        const { data: enrollments, error: enrollmentError } = await supabase
          .from("course_enrollments")
          .select(`
            course_id,
            courses!inner(
              id,
              title,
              description,
              cover_image_url,
              category,
              expert_id
            )
          `)
          .eq("user_id", user.id);

        if (enrollmentError) throw enrollmentError;

        if (!enrollments || enrollments.length === 0) {
          setEnrolledCourses([]);
          return;
        }

        // Get course IDs and expert IDs
        const courseIds = enrollments.map((e: any) => e.courses.id).filter(Boolean);
        const expertIds = Array.from(new Set(enrollments.map((e: any) => e.courses.expert_id)));

        // Fetch products for these courses to get price
        const { data: productsData } = await supabase
          .from("products")
          .select("id, price, course_id")
          .in("course_id", courseIds)
          .eq("product_type", "e-learning");

        // Fetch expert profiles
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, name, avatar_url")
          .in("id", expertIds);

        // Combine data
        const formattedEnrolled = enrollments
          .map((e: any) => {
            const course = e.courses;
            const product = productsData?.find((p: any) => p.course_id === course.id);
            const profile = profilesData?.find((p: any) => p.id === course.expert_id);

            if (!course) return null;

            return {
              id: course.id,
              title: course.title,
              description: course.description,
              cover_image_url: course.cover_image_url,
              price: product?.price || 0,
              is_free: (product?.price || 0) === 0,
              category: course.category,
              expert_id: course.expert_id,
              expert_name: profile?.name || "Expert",
              expert_avatar_url: profile?.avatar_url,
              course_id: course.id,
            };
          })
          .filter((item) => item !== null) as Course[];

        setEnrolledCourses(formattedEnrolled);
      } catch (err) {
        console.error("Error fetching enrolled courses:", err);
        setEnrolledCourses([]);
      }
    }

    fetchCourses();
    fetchEnrolledCourses();
  }, [supabase, searchQuery, selectedCategory, user]);

  // Get unique categories (excluding null and "Uncategorized")
  const categories = Array.from(new Set(courses.map((c) => c.category).filter((cat): cat is string => cat !== null && cat !== "Uncategorized"))) as string[];
  const trendingCourses = courses.slice(0, 10); // First 10 courses as trending

  // Group courses by category (excluding Uncategorized)
  const coursesByCategory: { [key: string]: Course[] } = {};
  courses.forEach((course) => {
    const cat = course.category;
    if (!cat || cat === "Uncategorized") return; // Skip Uncategorized
    if (!coursesByCategory[cat]) {
      coursesByCategory[cat] = [];
    }
    coursesByCategory[cat].push(course);
  });

  const getSubtypePlaceholder = (subtype: string | null | undefined) => {
    const baseGradient = "bg-gradient-to-br";
    switch (subtype) {
      case "online-course":
        return {
          gradient: `${baseGradient} from-dark-green-800/90 to-dark-green-900/90`,
          icon: "📹",
          label: "Online Course"
        };
      case "ebook":
        return {
          gradient: `${baseGradient} from-dark-green-800/90 to-dark-green-900/90`,
          icon: "📚",
          label: "Ebook"
        };
      case "ai-prompt":
        return {
          gradient: `${baseGradient} from-dark-green-800/90 to-dark-green-900/90`,
          icon: "🤖",
          label: "AI Prompt"
        };
      case "other":
        return {
          gradient: `${baseGradient} from-dark-green-800/90 to-dark-green-900/90`,
          icon: "📦",
          label: "Other"
        };
      default:
        return {
          gradient: `${baseGradient} from-dark-green-800/90 to-dark-green-900/90`,
          icon: "📖",
          label: "E-Learning"
        };
    }
  };

  return (
    <div className="min-h-screen bg-custom-bg flex flex-col">
      <Navigation />
      <div className="pt-24 pb-20 flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-custom-text mb-2">Secret Recipe</h1>
            <p className="text-base sm:text-xl text-custom-text/80 mb-6">
              Discover e-learning products from industry experts
            </p>

            {/* Search */}
            <div className="bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 p-4 sm:p-6 rounded-xl mb-6">
              <label className="block text-sm font-medium text-custom-text mb-2">Search e-Learning Products</label>
              <input
                type="text"
                placeholder="Search by product name, description, expert, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-dark-green-900/50 border border-cyber-green/30 rounded-lg focus:ring-2 focus:ring-cyber-green focus:border-cyber-green text-custom-text placeholder-custom-text/50 text-sm"
              />
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === null
                      ? "bg-cyber-green text-dark-green-900"
                      : "bg-dark-green-800/30 text-custom-text border border-cyber-green/30 hover:border-cyber-green"
                  }`}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategory === cat
                        ? "bg-cyber-green text-dark-green-900"
                        : "bg-dark-green-800/30 text-custom-text border border-cyber-green/30 hover:border-cyber-green"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-custom-text/80 animate-pulse">Loading e-learning products...</p>
            </div>
          ) : courses.length === 0 && (!user || enrolledCourses.length === 0) ? (
            <div className="text-center py-12">
              <p className="text-custom-text/80 text-lg">
                {searchQuery || selectedCategory ? "No courses found matching your criteria." : "No courses available yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Enrolled Courses Section - Only show if user is logged in */}
              {user && enrolledCourses.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-custom-text mb-4">Your Enrolled Courses</h2>
                  <div className="relative">
                    <div className="overflow-x-auto scrollbar-hide pb-4">
                      <div className="flex gap-4" style={{ width: 'max-content' }}>
                        {enrolledCourses.map((course) => (
                          <Link
                            key={course.id}
                            href={`/courses/${course.id}`}
                            className="group flex-shrink-0 w-48 sm:w-56 md:w-64 transition-transform hover:scale-105"
                          >
                            <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-dark-green-800/30 border border-cyber-green/30 group-hover:border-cyber-green transition-colors">
                              {course.cover_image_url ? (
                                <Image
                                  src={course.cover_image_url}
                                  alt={course.title}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-dark-green-800 to-dark-green-900 p-4">
                                  <span className="text-lg sm:text-xl md:text-2xl text-cyber-green font-bold text-center line-clamp-3">
                                    {course.title}
                                  </span>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="absolute bottom-0 left-0 right-0 p-4">
                                  <h3 className="text-white font-bold text-lg mb-1 line-clamp-2">{course.title}</h3>
                                  <p className="text-white/80 text-sm mb-2">{course.expert_name}</p>
                                  <div className="flex items-center justify-between">
                                    <span className="text-cyber-green font-semibold">
                                      {course.price === 0 || !course.price ? "Free" : `$${course.price.toFixed(2)}`}
                                    </span>
                                    {course.category && (
                                      <span className="text-xs text-white/60 bg-white/20 px-2 py-1 rounded">
                                        {course.category}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Trending Courses Section - Hidden for now */}
              {false && trendingCourses.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-custom-text mb-4">Trending Courses</h2>
                  <div className="relative">
                    <div className="overflow-x-auto scrollbar-hide pb-4">
                      <div className="flex gap-4" style={{ width: 'max-content' }}>
                        {trendingCourses.map((course) => (
                          <Link
                            key={course.id}
                            href={`/courses/${course.id}`}
                            className="group flex-shrink-0 w-48 sm:w-56 md:w-64 transition-transform hover:scale-105"
                          >
                            <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-dark-green-800/30 border border-cyber-green/30 group-hover:border-cyber-green transition-colors">
                              {course.cover_image_url ? (
                                <Image
                                  src={course.cover_image_url}
                                  alt={course.title}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-dark-green-800 to-dark-green-900 p-4">
                                  <span className="text-lg sm:text-xl md:text-2xl text-cyber-green font-bold text-center line-clamp-3">
                                    {course.title}
                                  </span>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="absolute bottom-0 left-0 right-0 p-4">
                                  <h3 className="text-white font-bold text-lg mb-1 line-clamp-2">{course.title}</h3>
                                  <p className="text-white/80 text-sm mb-2">{course.expert_name}</p>
                                  <div className="flex items-center justify-between">
                                    <span className="text-cyber-green font-semibold">
                                      {course.price === 0 || !course.price ? "Free" : `$${course.price.toFixed(2)}`}
                                    </span>
                                    {course.category && (
                                      <span className="text-xs text-white/60 bg-white/20 px-2 py-1 rounded">
                                        {course.category}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Courses by Category */}
              {Object.entries(coursesByCategory).map(([category, categoryCourses]) => (
                <div key={category}>
                  <h2 className="text-2xl font-bold text-custom-text mb-4">{category}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {categoryCourses.map((course) => (
                      <div
                        key={course.id}
                        className="group mb-24 sm:mb-20 lg:mb-16 relative"
                      >
                        <Link
                          href={`/courses/${course.id}`}
                          className="block bg-transparent backdrop-blur-sm border border-cyber-green/20 rounded-xl overflow-hidden hover:bg-cyber-green/5 hover:border-cyber-green/50 hover:shadow-[0_0_20px_rgba(0,255,136,0.2)] transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.01] sm:hover:scale-[1.02] flex flex-col"
                        >
                          {/* Cover Image with 4:5 aspect ratio */}
                          <div className="relative w-full aspect-[4/5] overflow-hidden bg-transparent rounded-t-xl">
                            {course.cover_image_url ? (
                              <Image
                                src={course.cover_image_url}
                                alt={course.title}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              (() => {
                                const placeholder = getSubtypePlaceholder(course.e_learning_subtype);
                                return (
                                  <div className={`w-full h-full flex items-center justify-center ${placeholder.gradient} p-4`}>
                                    <div className="text-center">
                                      <div className="text-5xl sm:text-6xl mb-3 opacity-90">{placeholder.icon}</div>
                                      <div className="text-xs sm:text-sm text-white/90 font-semibold uppercase tracking-wider">
                                        {placeholder.label}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()
                            )}
                            {/* E-learning subtype label */}
                            {course.e_learning_subtype && (
                              <div className="absolute top-2 right-2 z-10">
                                <span className="bg-cyber-green/90 text-dark-green-900 text-xs font-semibold px-2 py-1 rounded-md shadow-lg backdrop-blur-sm">
                                  {course.e_learning_subtype === "online-course" ? "Online Course" :
                                   course.e_learning_subtype === "ebook" ? "Ebook" :
                                   course.e_learning_subtype === "ai-prompt" ? "AI Prompt" :
                                   course.e_learning_subtype === "live-webinar" ? "Live Webinar" :
                                   course.e_learning_subtype === "other" ? "Other" :
                                   course.e_learning_subtype}
                                </span>
                              </div>
                            )}
                          </div>
                          {/* Content below image */}
                          <div className="p-4 sm:p-5 flex flex-col flex-1 bg-transparent">
                            <div className="flex items-center gap-3 mb-2">
                              {course.expert_avatar_url ? (
                                <Image
                                  src={course.expert_avatar_url}
                                  alt={`${course.expert_name}'s avatar`}
                                  width={32}
                                  height={32}
                                  className="rounded-full object-cover w-8 h-8 flex-shrink-0 border-2 border-cyber-green/50"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-dark-green-700 flex items-center justify-center text-custom-text text-xs font-bold flex-shrink-0 border-2 border-cyber-green/50">
                                  {course.expert_name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-custom-text/70 truncate">by {course.expert_name}</p>
                              </div>
                            </div>
                            <h3 className="text-base sm:text-lg font-bold text-cyber-green group-hover:text-glow transition-all mb-3 line-clamp-2">
                              {course.title}
                            </h3>
                            <div className="flex items-center justify-between mt-auto">
                              <span className="text-sm sm:text-base font-bold text-cyber-green">
                                {course.price === 0 || !course.price ? "Free" : `USD $${course.price.toFixed(2)}`}
                              </span>
                              {course.category && (
                                <span className="text-xs text-custom-text/60 bg-dark-green-900/50 px-2 py-1 rounded border border-cyber-green/30">
                                  {course.category}
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                        {/* Description appears below tile on hover */}
                        {course.description && (
                          <div className="mt-2 px-4 sm:px-5 opacity-0 max-h-0 overflow-hidden transition-all duration-300 ease-in-out group-hover:opacity-100 group-hover:max-h-48 absolute top-full left-0 right-0 z-20 bg-custom-bg/95 backdrop-blur-md border border-cyber-green/30 rounded-b-xl shadow-lg">
                            <div 
                              className="text-xs sm:text-sm text-custom-text/70 line-clamp-3 product-preview py-2"
                              dangerouslySetInnerHTML={{ __html: course.description }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
