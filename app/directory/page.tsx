import { Suspense } from "react";
import { Navigation } from "@/components/navigation";
import { ExpertDirectory } from "@/components/expert-directory";

function DirectoryLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="animate-pulse">
        <div className="h-10 bg-custom-bg/50 rounded w-1/3 mb-4"></div>
        <div className="h-6 bg-custom-bg/50 rounded w-1/2 mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-custom-bg/30 border border-cyber-green/30 p-6 rounded-xl">
              <div className="h-6 bg-custom-bg/50 rounded w-2/3 mb-4"></div>
              <div className="h-4 bg-custom-bg/50 rounded w-full mb-2"></div>
              <div className="h-4 bg-custom-bg/50 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DirectoryPage() {
  return (
    <div className="min-h-screen bg-custom-bg relative overflow-hidden flex flex-col">
      <Navigation />
      <div className="pt-16 flex-1">
        <Suspense fallback={<DirectoryLoading />}>
          <ExpertDirectory />
        </Suspense>
      </div>
      <Footer />
    </div>
  );
}

