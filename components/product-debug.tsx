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
      
      // Get all products for this course_id first (to find the product)
      const { data: allProducts } = await supabase
        .from("products")
        .select("id, product_type, course_id, enrollment_on_request, name, e_learning_subtype, webinar_date_time")
        .eq("course_id", courseId);
      
      console.log("All products for course_id", courseId, ":", allProducts);
      
      // Find the e-learning product
      const eLearningProduct = allProducts?.find(p => p.product_type === "e-learning") || allProducts?.[0];
      
      // Try with product_type filter (without category - it's in courses table)
      let { data: product, error } = await supabase
        .from("products")
        .select("id, e_learning_subtype, enrollment_on_request, webinar_date_time, product_type, course_id")
        .eq("course_id", courseId)
        .eq("product_type", "e-learning")
        .maybeSingle();
      
      console.log("Client-side product query (with filter):", { product, error, courseId });
      
      // If not found, use the product from allProducts
      if (!product && eLearningProduct) {
        product = eLearningProduct as any;
        error = null;
        console.log("Using product from allProducts:", product);
      }
      
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
