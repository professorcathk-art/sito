import { Navigation } from "@/components/navigation";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="pt-16 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-lg p-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">About Sito</h1>
            <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
              <p>
                Sito (師徒) represents the timeless relationship between master and student, mentor
                and mentee. Our platform bridges the gap between industry experts and those seeking
                guidance, knowledge, and professional growth.
              </p>
              <p>
                We believe that everyone deserves access to expert guidance, regardless of their
                location or background. Sito creates a global network where industry leaders can
                share their expertise and help others navigate their career paths.
              </p>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Our Mission</h2>
              <p>
                To democratize access to industry expertise by connecting professionals worldwide,
                fostering meaningful mentorship relationships, and empowering individuals to achieve
                their career goals.
              </p>
              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">How It Works</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>Experts create profiles showcasing their expertise and experience</li>
                <li>Users browse the directory to find mentors in their field</li>
                <li>Direct messaging enables seamless communication</li>
                <li>Verified experts ensure quality and authenticity</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

