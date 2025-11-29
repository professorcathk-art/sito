import { Navigation } from "@/components/navigation";
import { ExpertProfile } from "@/components/expert-profile";

interface ExpertPageProps {
  params: {
    id: string;
  };
}

export default function ExpertPage({ params }: ExpertPageProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="pt-16 pb-12">
        <ExpertProfile expertId={params.id} />
      </div>
    </div>
  );
}

