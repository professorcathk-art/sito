import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-custom-bg">
      <Navigation />
      <div className="pt-16 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 rounded-2xl shadow-lg p-8 sm:p-12 mb-8">
            <h1 className="text-4xl font-bold text-cyber-green mb-6 text-glow">Privacy Policy</h1>
            <div className="prose prose-lg max-w-none text-custom-text/90 space-y-6">
              <p className="text-sm text-custom-text/70 mb-6">
                <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-HK', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>

              <section>
                <h2 className="text-2xl font-bold text-custom-text mt-8 mb-4">1. Introduction</h2>
                <p>
                  Sito (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is operated by Professor Cat Limited, a company incorporated in Hong Kong. 
                  We are committed to protecting your privacy and ensuring the security of your personal information. 
                  This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you 
                  use our website and services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-custom-text mt-8 mb-4">2. Information We Collect</h2>
                <h3 className="text-xl font-semibold text-custom-text mt-4 mb-2">2.1 Personal Information</h3>
                <p>We may collect the following types of personal information:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Name and contact information (email address, phone number)</li>
                  <li>Profile information (professional title, bio, location, category)</li>
                  <li>Account credentials (email and password)</li>
                  <li>Profile pictures and avatars</li>
                  <li>Website and social media links</li>
                  <li>Payment information (processed securely through third-party providers)</li>
                </ul>

                <h3 className="text-xl font-semibold text-custom-text mt-4 mb-2">2.2 Usage Information</h3>
                <p>We automatically collect information about how you use our services, including:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Browser type and version</li>
                  <li>Device information</li>
                  <li>IP address</li>
                  <li>Pages visited and time spent on pages</li>
                  <li>Search queries</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-custom-text mt-8 mb-4">3. How We Use Your Information</h2>
                <p>We use your personal information for the following purposes:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>To provide and maintain our services</li>
                  <li>To create and manage your account</li>
                  <li>To facilitate connections between experts and users</li>
                  <li>To process transactions and send notifications</li>
                  <li>To communicate with you about your account and our services</li>
                  <li>To improve our services and user experience</li>
                  <li>To comply with legal obligations</li>
                  <li>To protect our rights and prevent fraud</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-custom-text mt-8 mb-4">4. Disclosure of Your Information</h2>
                <p>We may share your information in the following circumstances:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Public Profiles:</strong> Information you choose to make public on your profile will be visible to other users</li>
                  <li><strong>Service Providers:</strong> We may share information with third-party service providers who assist us in operating our platform</li>
                  <li><strong>Legal Requirements:</strong> We may disclose information if required by law or to protect our rights</li>
                  <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-custom-text mt-8 mb-4">5. Data Security</h2>
                <p>
                  We implement appropriate technical and organizational measures to protect your personal information 
                  against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission 
                  over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-custom-text mt-8 mb-4">6. Your Rights</h2>
                <p>Under Hong Kong&apos;s Personal Data (Privacy) Ordinance, you have the right to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Access your personal data</li>
                  <li>Correct inaccurate personal data</li>
                  <li>Request deletion of your personal data</li>
                  <li>Object to processing of your personal data</li>
                  <li>Data portability</li>
                </ul>
                <p className="mt-4">
                  To exercise these rights, please contact us at{" "}
                  <a href="mailto:professor.cat.hk@gmail.com" className="text-cyber-green hover:underline">
                    professor.cat.hk@gmail.com
                  </a>
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-custom-text mt-8 mb-4">7. Cookies and Tracking Technologies</h2>
                <p>
                  We use cookies and similar tracking technologies to track activity on our website and store certain 
                  information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-custom-text mt-8 mb-4">8. Third-Party Links</h2>
                <p>
                  Our website may contain links to third-party websites. We are not responsible for the privacy practices 
                  of these external sites. We encourage you to review the privacy policies of any third-party sites you visit.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-custom-text mt-8 mb-4">9. Children&apos;s Privacy</h2>
                <p>
                  Our services are not intended for individuals under the age of 18. We do not knowingly collect personal 
                  information from children. If you believe we have collected information from a child, please contact us immediately.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-custom-text mt-8 mb-4">10. Changes to This Privacy Policy</h2>
                <p>
                  We may update this Privacy Policy from time to time. We will notify you of any changes by posting the 
                  new Privacy Policy on this page and updating the &quot;Last Updated&quot; date. You are advised to review this 
                  Privacy Policy periodically for any changes.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-custom-text mt-8 mb-4">11. Contact Us</h2>
                <p>
                  If you have any questions about this Privacy Policy, please contact us:
                </p>
                <div className="mt-4 space-y-2">
                  <p>
                    <strong>Professor Cat Limited</strong>
                  </p>
                  <p>
                    Email:{" "}
                    <a href="mailto:professor.cat.hk@gmail.com" className="text-cyber-green hover:underline">
                      professor.cat.hk@gmail.com
                    </a>
                  </p>
                  <p>Hong Kong</p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

