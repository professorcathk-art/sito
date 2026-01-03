"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
}

export default function FeaturedCoursesPage() {
  const supabase = createClient();
  const [courses, setCourses] = useState<Course[]>([]);
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
            expert_id
          `)
          .eq("product_type", "course")
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

    fetchCourses();
  }, [supabase, searchQuery, selectedCategory]);

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

  return (
    <div className="min-h-screen bg-custom-bg flex flex-col">
      <Navigation />
      <div className="pt-24 pb-20 flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-custom-text mb-2">Featured Courses</h1>
            <p className="text-base sm:text-xl text-custom-text/80 mb-6">
              Discover courses from industry experts
            </p>

            {/* Search */}
            <div className="bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 p-4 sm:p-6 rounded-xl mb-6">
              <label className="block text-sm font-medium text-custom-text mb-2">Search Courses</label>
              <input
                type="text"
                placeholder="Search by course name, description, expert, or category..."
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
              <p className="text-custom-text/80 animate-pulse">Loading courses...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-custom-text/80 text-lg">
                {searchQuery || selectedCategory ? "No courses found matching your criteria." : "No courses available yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Trending Courses Section */}
              {trendingCourses.length > 0 && (
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
                                      {course.is_free ? "Free" : `$${course.price}`}
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
                  <div className="relative">
                    <div className="overflow-x-auto scrollbar-hide pb-4">
                      <div className="flex gap-4" style={{ width: 'max-content' }}>
                        {categoryCourses.map((course) => (
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
                                      {course.is_free ? "Free" : `$${course.price}`}
                                    </span>
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
              ))}
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <Footer />
    </div>
  );
}
