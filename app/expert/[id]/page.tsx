import { Navigation } from "@/components/navigation";
import { ExpertProfile } from "@/components/expert-profile";

interface ExpertPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ExpertPage({ params }: ExpertPageProps) {
  const { id } = await params;
  return (
    <div className="min-h-screen bg-custom-bg">
      <Navigation />
      <div className="pt-16 pb-12">
        <ExpertProfile expertId={id} />
      </div>
    </div>
  );
}

