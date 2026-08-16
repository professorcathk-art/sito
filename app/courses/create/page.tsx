"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy create flow → Creator Studio products overview */
export default function CreateCourseRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/products");
  }, [router]);
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-400">
      Redirecting to Creator Studio…
    </div>
  );
}
