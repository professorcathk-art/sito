import { ProfileSetupForm } from "@/components/profile-setup-form";
import { DashboardLayout } from "@/components/dashboard-layout";

export default function ProfileSetupPage() {
  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-surface backdrop-blur-sm border border-border-default rounded-2xl shadow-lg p-8">
            <h1 className="text-3xl font-bold text-custom-text mb-2">Set Up Your Profile</h1>
            <p className="text-text-secondary mb-8">
              Create your expert profile to be discovered by others. You can choose to list yourself
              on the marketplace or keep your profile private.
            </p>
            <ProfileSetupForm />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

