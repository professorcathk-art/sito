import { Suspense } from "react";
import { MessagesContent } from "@/components/messages-content";
import { DashboardLayout } from "@/components/dashboard-layout";

function MessagesLoading() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="animate-pulse">
        <div className="h-10 bg-surface rounded w-1/4 mb-8"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-surface border border-border-default rounded-2xl p-4 h-96"></div>
          <div className="lg:col-span-2 bg-surface border border-border-default rounded-2xl p-8 h-96"></div>
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<MessagesLoading />}>
          <MessagesContent />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}

