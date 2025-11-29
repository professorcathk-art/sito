import { Navigation } from "@/components/navigation";
import { ProfileSetupForm } from "@/components/profile-setup-form";
import { ProtectedRoute } from "@/components/protected-route";

export default function ProfileSetupPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="pt-16 pb-12">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Set Up Your Profile</h1>
              <p className="text-gray-600 mb-8">
                Create your expert profile to be discovered by others. You can choose to list yourself
                on the marketplace or keep your profile private.
              </p>
              <ProfileSetupForm />
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

