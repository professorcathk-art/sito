import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-cyber-green/20 bg-dark-green-800/20 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-6 sm:mb-8">
          {/* Brand */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-2">
            <Link href="/" className="text-xl sm:text-2xl font-bold text-cyber-green mb-3 sm:mb-4 inline-block text-glow">
              Sito
            </Link>
            <p className="text-custom-text/70 mb-4 max-w-md text-sm sm:text-base">
              Connecting industry experts with those seeking guidance, knowledge, and professional growth.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-custom-text font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/directory" className="text-custom-text/70 hover:text-cyber-green transition-colors text-sm sm:text-base">
                  Directory
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-custom-text/70 hover:text-cyber-green transition-colors text-sm sm:text-base">
                  About
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-custom-text/70 hover:text-cyber-green transition-colors text-sm sm:text-base">
                  Become an Expert
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-custom-text font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-custom-text/70 hover:text-cyber-green transition-colors text-sm sm:text-base">
                  Contact Us
                </Link>
              </li>
              <li>
                <a href="mailto:professor.cat.hk@gmail.com" className="text-custom-text/70 hover:text-cyber-green transition-colors text-sm sm:text-base">
                  Email Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-cyber-green/20 pt-6 sm:pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-custom-text/60 text-xs sm:text-sm text-center sm:text-left">
            © {new Date().getFullYear()} Sito. All rights reserved.
          </p>
          <div className="flex gap-4 sm:gap-6">
            <Link
              href="/privacy"
              className="text-custom-text/60 hover:text-cyber-green transition-colors text-xs sm:text-sm"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-custom-text/60 hover:text-cyber-green transition-colors text-xs sm:text-sm"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

