import { Suspense } from "react";
import { OnboardingFlow } from "@/components/onboarding-flow";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-custom-bg">
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center text-text-secondary">
            Loading…
          </div>
        }
      >
        <OnboardingFlow />
      </Suspense>
    </div>
  );
}
