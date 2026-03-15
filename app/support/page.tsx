import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-custom-bg">
      <Navigation />
      <div className="pt-16 pb-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-surface backdrop-blur-sm border border-border-default rounded-2xl shadow-lg p-8 sm:p-12">
            <h1 className="text-3xl font-bold text-cyber-green mb-4">Support</h1>
            <p className="text-custom-text mb-6">
              Need help? Reach out to our team and we&apos;ll get back to you as soon as possible.
            </p>
            <a
              href="mailto:chris.lau@professor-cat.com"
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyber-green text-slate-900 font-semibold rounded-md hover:bg-gray-200 transition-colors"
            >
              <span>✉️</span>
              <span>Email us at chris.lau@professor-cat.com</span>
            </a>
            <p className="text-text-secondary text-sm mt-4">
              Click the button above to open your email client and send a message to our support team.
            </p>
            <div className="mt-8 pt-8 border-t border-border-default">
              <Link
                href="/"
                className="text-cyber-green hover:text-cyber-green/80 transition-colors text-sm font-medium"
              >
                ← Back to home
              </Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
