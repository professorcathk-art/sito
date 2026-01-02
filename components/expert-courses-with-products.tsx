"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Course {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  price: number;
  is_free: boolean;
  published: boolean;
}

interface Product {
  id: string;
  course_id?: string;
}

interface ExpertCoursesWithProductsProps {
  expertId: string;
  products: Product[];
  supabase: ReturnType<typeof createClient>;
}

export function ExpertCoursesWithProducts({ expertId, products, supabase }: ExpertCoursesWithProductsProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCourses() {
      try {
        // Get course IDs from products
        const courseIds = products
          .map(p => p.course_id)
          .filter((id): id is string => !!id);

        if (courseIds.length === 0) {
          setCourses([]);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("courses")
          .select("*")
          .in("id", courseIds)
          .eq("published", true)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setCourses(data || []);
      } catch (err) {
        console.error("Error fetching courses:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchCourses();
  }, [products, supabase]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-48 bg-dark-green-800/50 rounded-lg mb-4"></div>
            <div className="h-6 bg-dark-green-800/50 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-dark-green-800/50 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-custom-text/70">No courses available yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {courses.map((course) => (
        <Link
          key={course.id}
          href={`/courses/${course.id}`}
          className="group bg-dark-green-800/30 border border-cyber-green/30 rounded-lg overflow-hidden hover:border-cyber-green transition-colors"
        >
          {course.cover_image_url && (
            <div className="relative w-full h-48 overflow-hidden">
              <img
                src={course.cover_image_url}
                alt={course.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          )}
          <div className="p-6">
            <h3 className="text-xl font-bold text-custom-text mb-2 group-hover:text-cyber-green transition-colors line-clamp-2">
              {course.title}
            </h3>
            {course.description && (
              <p className="text-custom-text/70 mb-4 line-clamp-3">{course.description}</p>
            )}
            <div className="flex items-center justify-between">
              <span className="text-cyber-green font-semibold">
                {course.is_free ? "Free" : `$${course.price}`}
              </span>
              <span className="text-custom-text/60 text-sm">View Course →</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

