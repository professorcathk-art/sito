import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-custom-bg">
      <Navigation />
      <div className="pt-16 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 rounded-2xl shadow-lg p-8 sm:p-12 mb-8">
            <h1 className="text-4xl font-bold text-cyber-green mb-6 text-glow">Terms of Use</h1>
            <div className="prose prose-lg max-w-none text-custom-text/90 space-y-6">
              <p className="text-sm text-custom-text/70 mb-6">
                <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-HK', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>

              <section>
                <h2 className="text-2xl font-bold text-custom-text mt-8 mb-4">1. Acceptance of Terms</h2>
                <p>
                  By accessing and using Sito ("the Platform"), operated by Professor Cat Limited, a company 
                  incorporated in Hong Kong, you accept and agree to be bound by these Terms of Use. If you do not 
                  agree to these terms, please do not use our services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-custom-text mt-8 mb-4">2. Description of Service</h2>
                <p>
                  Sito is a platform that connects industry experts with individuals seeking mentorship, career 
                  guidance, and professional advice. We facilitate connections, messaging, and the listing of 
                  products and services by experts.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-custom-text mt-8 mb-4">3. User Accounts</h2>
                <h3 className="text-xl font-semibold text-custom-text mt-4 mb-2">3.1 Registration</h3>
                <p>To use certain features of the Platform, you must:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Create an account with accurate and complete information</li>
                  <li>Maintain and update your account information</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Be at least 18 years old</li>
                </ul>

                <h3 className="text-xl font-semibold text-custom-text mt-4 mb-2">3.2 Account Responsibility</h3>
                <p>
                  You are responsible for all activities that occur under your account. You must immediately notify 
                  us of any unauthorized use of your account.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-custom-text mt-8 mb-4">4. Expert Profiles and Listings</h2>
                <h3 className="text-xl font-semibold text-custom-text mt-4 mb-2">4.1 Expert Responsibilities</h3>
                <p>Experts who list their services on the Platform agree to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Provide accurate and truthful information about their expertise and qualifications</li>
                  <li>Deliver services as described in their listings</li>
                  <li>Respond to inquiries in a timely manner</li>
                  <li>Maintain professional conduct in all interactions</li>
                </ul>

                <h3 className="text-xl font-semibold text-custom-text mt-4 mb-2">4.2 Product Listings</h3>
                <p>
                  Experts may list products and services with descriptions, pricing, and other relevant information. 
                  All listings must be accurate and comply with applicable laws and regulations in Hong Kong.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-custom-text mt-8 mb-4">5. User Conduct</h2>
                <p>You agree not to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Use the Platform for any illegal or unauthorized purpose</li>
                  <li>Violate any laws in your jurisdiction or Hong Kong</li>
                  <li>Infringe upon the intellectual property rights of others</li>
                  <li>Transmit any harmful code, viruses, or malware</li>
                  <li>Harass, abuse, or harm other users</li>
                  <li>Impersonate any person or entity</li>
                  <li>Collect or store personal data about other users without permission</li>
                  <li>Use automated systems to access the Platform without authorization</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-custom-text mt-8 mb-4">6. Intellectual Property</h2>
                <p>
                  All content on the Platform, including text, graphics, logos, and software, is the property of 
                  Professor Cat Limited or its licensors and is protected by Hong Kong and international copyright laws.
                </p>
                <p className="mt-4">
                  You retain ownership of content you post on the Platform but grant us a license to use, display, 
                  and distribute such content in connection with the Platform.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-custom-text mt-8 mb-4">7. Payments and Transactions</h2>
                <p>
                  Transactions between experts and users are conducted directly between the parties. Sito facilitates 
                  connections but is not a party to any transaction. We are not responsible for:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>The quality or delivery of services</li>
                  <li>Payment disputes between users and experts</li>
                  <li>Refunds or cancellations</li>
                </ul>
                <p className="mt-4">
                  All payments are processed through third-party payment providers. You agree to comply with their 
                  terms and conditions.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-custom-text mt-8 mb-4">8. Disclaimers</h2>
                <h3 className="text-xl font-semibold text-custom-text mt-4 mb-2">8.1 Service Availability</h3>
                <p>
                  The Platform is provided "as is" and "as available" without warranties of any kind, either express 
                  or implied. We do not guarantee that the Platform will be uninterrupted, secure, or error-free.
                </p>

                <h3 className="text-xl font-semibold text-custom-text mt-4 mb-2">8.2 Expert Qualifications</h3>
                <p>
                  While we may verify certain information, we do not guarantee the qualifications, expertise, or 
                  credentials of experts listed on the Platform. Users are responsible for verifying expert qualifications 
                  before engaging their services.
                </p>

                <h3 className="text-xl font-semibold text-custom-text mt-4 mb-2">8.3 Limitation of Liability</h3>
                <p>
                  To the maximum extent permitted by Hong Kong law, Professor Cat Limited shall not be liable for any 
                  indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-custom-text mt-8 mb-4">9. Indemnification</h2>
                <p>
                  You agree to indemnify and hold harmless Professor Cat Limited, its officers, directors, employees, 
                  and agents from any claims, damages, losses, liabilities, and expenses arising from your use of the 
                  Platform or violation of these Terms.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-custom-text mt-8 mb-4">10. Termination</h2>
                <p>
                  We reserve the right to suspend or terminate your account at any time, with or without cause or notice, 
                  for any reason including violation of these Terms. You may terminate your account at any time by 
                  contacting us.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-custom-text mt-8 mb-4">11. Governing Law</h2>
                <p>
                  These Terms of Use shall be governed by and construed in accordance with the laws of Hong Kong. 
                  Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts 
                  of Hong Kong.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-custom-text mt-8 mb-4">12. Changes to Terms</h2>
                <p>
                  We reserve the right to modify these Terms at any time. We will notify users of material changes by 
                  posting the updated Terms on the Platform. Your continued use of the Platform after changes become 
                  effective constitutes acceptance of the new Terms.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-custom-text mt-8 mb-4">13. Contact Information</h2>
                <p>
                  If you have any questions about these Terms of Use, please contact us:
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

