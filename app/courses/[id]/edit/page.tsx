"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";

/** Legacy course editor → e-Learning hub (product id) */
export default function EditCourseRedirectPage() {
  const params = useParams();
  const courseId = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();
  const [message, setMessage] = useState("Opening course builder…");

  useEffect(() => {
    async function go() {
      if (!user || !courseId) return;
      const { data: product } = await supabase
        .from("products")
        .select("id")
        .eq("expert_id", user.id)
        .eq("course_id", courseId)
        .eq("product_type", "e-learning")
        .maybeSingle();

      if (product?.id) {
        router.replace(`/dashboard/elearning/${product.id}?tab=lessons`);
        return;
      }

      // Create linking product for orphan legacy course
      const { data: course } = await supabase
        .from("courses")
        .select("id, title, description, price, expert_id")
        .eq("id", courseId)
        .single();

      if (!course || course.expert_id !== user.id) {
        setMessage("Course not found.");
        router.replace("/dashboard/elearning");
        return;
      }

      const { data: created, error } = await supabase
        .from("products")
        .insert({
          expert_id: user.id,
          name: course.title || "Untitled course",
          description: course.description || "",
          price: course.price ?? 0,
          pricing_type: "one_time",
          product_type: "e-learning",
          e_learning_subtype: "online-course",
          course_id: course.id,
        })
        .select("id")
        .single();

      if (error || !created) {
        setMessage("Could not open course builder.");
        router.replace("/dashboard/elearning");
        return;
      }
      router.replace(`/dashboard/elearning/${created.id}?tab=lessons`);
    }
    go();
  }, [user, courseId, router, supabase]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-400">
      {message}
    </div>
  );
}
