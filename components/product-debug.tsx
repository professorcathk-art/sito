"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface ProductDebugProps {
  courseId: string;
}

export function ProductDebug({ courseId }: ProductDebugProps) {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  
  useEffect(() => {
    async function fetchProduct() {
      const supabase = createClient();
      
      // Try with product_type filter
      let { data: product, error } = await supabase
        .from("products")
        .select("id, e_learning_subtype, category, enrollment_on_request, webinar_date_time, product_type, course_id")
        .eq("course_id", courseId)
        .eq("product_type", "e-learning")
        .maybeSingle();
      
      console.log("Client-side product query (with filter):", { product, error, courseId });
      
      // Try without product_type filter
      if (!product && !error) {
        const { data: productAlt, error: errorAlt } = await supabase
          .from("products")
          .select("id, e_learning_subtype, category, enrollment_on_request, webinar_date_time, product_type, course_id")
          .eq("course_id", courseId)
          .maybeSingle();
        
        console.log("Client-side product query (without filter):", { product: productAlt, error: errorAlt, courseId });
        
        if (productAlt) {
          product = productAlt;
          error = errorAlt;
        }
      }
      
      // Get all products for this course_id
      const { data: allProducts } = await supabase
        .from("products")
        .select("id, product_type, course_id, enrollment_on_request, name")
        .eq("course_id", courseId);
      
      console.log("All products for course_id", courseId, ":", allProducts);
      
      setDebugInfo({
        product,
        error,
        allProducts,
        courseId
      });
    }
    
    fetchProduct();
  }, [courseId]);
  
  if (!debugInfo) {
    return null;
  }
  
  return (
    <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg text-xs">
      <p className="font-bold text-yellow-400 mb-2">Debug Info:</p>
      <pre className="text-yellow-300 overflow-auto">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  );
}
