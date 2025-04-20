import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Wallii',
  description: 'Read our privacy policy to understand how we handle your data and protect your privacy.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-900 rounded-lg p-6">
            <h1 className="text-3xl font-bold text-white mb-6">Privacy Policy</h1>
            
            <div className="space-y-6 text-gray-300">
              <section>
                <h2 className="text-2xl font-semibold text-white mb-3">Introduction</h2>
                <p>
                  At Wallii, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect 
                  your information when you use our website and services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-3">Information We Collect</h2>
                <p>We collect the following types of information:</p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>Public leaderboard data from official Hearthstone Battlegrounds sources</li>
                  <li>Browser and device information for analytics purposes</li>
                  <li>User preferences stored in local storage</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-3">How We Use Your Information</h2>
                <p>We use the collected information to:</p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>Provide and improve our leaderboard tracking services</li>
                  <li>Analyze website usage and performance</li>
                  <li>Remember your preferences for a better user experience</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-3">Data Storage</h2>
                <p>
                  We store user preferences locally in your browser using localStorage. This data is not sent to our servers 
                  and remains on your device.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-3">Third-Party Services</h2>
                <p>
                  We use third-party services for analytics and advertising. These services may collect information about 
                  your use of our website. Please review their privacy policies for more information.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-3">Cookies</h2>
                <p>
                  We use cookies and similar technologies to enhance your experience and collect analytics data. You can 
                  control cookie settings through your browser preferences.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-3">Changes to This Policy</h2>
                <p>
                  We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new 
                  Privacy Policy on this page.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-3">Contact Us</h2>
                <p>
                  If you have any questions about this Privacy Policy, please contact us through our social media channels 
                  or via email.
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 