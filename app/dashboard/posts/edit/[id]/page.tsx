"use client";

import { useParams } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ExpertRoute } from "@/components/expert-route";
import { PostCanvasEditor } from "@/components/posts/post-canvas-editor";

export default function EditPostPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <DashboardLayout>
      <ExpertRoute>
        <PostCanvasEditor postId={id} />
      </ExpertRoute>
    </DashboardLayout>
  );
}
