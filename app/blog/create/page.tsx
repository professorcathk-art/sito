"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CreateBlogRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/posts/new");
  }, [router]);
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-400">
      Opening post editor…
    </div>
  );
}
