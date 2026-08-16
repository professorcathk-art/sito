"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EditBlogRedirect() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  useEffect(() => {
    if (id) router.replace(`/dashboard/posts/edit/${id}`);
  }, [id, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-400">
      Opening post editor…
    </div>
  );
}
