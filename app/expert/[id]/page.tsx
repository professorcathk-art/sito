import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { ExpertProfile } from "@/components/expert-profile";

interface ExpertPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ExpertPage({ params }: ExpertPageProps) {
  const { id } = await params;
  return (
    <div className="min-h-screen bg-custom-bg flex flex-col">
      <Navigation />
      <div className="pt-16 pb-12 flex-1">
        <ExpertProfile expertId={id} />
      </div>
      <Footer />
    </div>
  );
}

