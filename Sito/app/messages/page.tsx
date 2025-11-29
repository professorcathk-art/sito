import { Suspense } from "react";
import { Navigation } from "@/components/navigation";
import { MessagesContent } from "@/components/messages-content";

function MessagesLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-1/4 mb-8"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white rounded-2xl shadow-lg p-4 h-96"></div>
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-8 h-96"></div>
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="pt-16 pb-12">
        <Suspense fallback={<MessagesLoading />}>
          <MessagesContent />
        </Suspense>
      </div>
    </div>
  );
}

