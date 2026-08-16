"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { ExpertRoute } from "@/components/expert-route";
import { PostCanvasEditor } from "@/components/posts/post-canvas-editor";

export default function NewPostPage() {
  return (
    <DashboardLayout>
      <ExpertRoute>
        <PostCanvasEditor />
      </ExpertRoute>
    </DashboardLayout>
  );
}
