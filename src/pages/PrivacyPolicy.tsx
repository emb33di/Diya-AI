import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('privacy');

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'terms') {
      navigate('/terms-of-service');
    } else if (tab === 'refund') {
      navigate('/refund-policy');
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4EDE2' }}>
      <div className="container mx-auto px-6 py-16">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-display font-bold mb-4 text-gray-900">
            Diya AI Legal Policies
          </h1>
          <p className="text-sm text-gray-600 mt-4">
            Last updated date: 28 September 2025
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
            <div className="flex">
              <button
                onClick={() => handleTabClick('privacy')}
                className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                  activeTab === 'privacy'
                    ? 'text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                style={{
                  backgroundColor: activeTab === 'privacy' ? '#D07D00' : undefined
                }}
              >
                Privacy Policy
              </button>
              <button
                onClick={() => handleTabClick('terms')}
                className={`flex-1 px-6 py-4 text-center font-medium transition-colors border-l border-r border-gray-300 ${
                  activeTab === 'terms'
                    ? 'text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                style={{
                  backgroundColor: activeTab === 'terms' ? '#D07D00' : undefined
                }}
              >
                Terms of Service
              </button>
              <button
                onClick={() => handleTabClick('refund')}
                className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                  activeTab === 'refund'
                    ? 'text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                style={{
                  backgroundColor: activeTab === 'refund' ? '#D07D00' : undefined
                }}
              >
                Refund Policy
              </button>
            </div>
          </div>
        </div>

        {/* Privacy Policy Content */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-display font-bold mb-6 text-gray-900 text-center">
            Privacy Policy
          </h2>

          {/* Introduction */}
          <div className="mb-12">
            <p className="text-lg text-gray-700 leading-relaxed">
              This Privacy Policy describes how Diya AI LLC ("Diya AI," "we", "us" or "our") processes the personal information we collect through our website, https://www.meetdiya.com, and any associated services (collectively, the "Service").
            </p>
          </div>

          {/* Index */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Index</h2>
            <ul className="space-y-2 text-gray-700">
              <li>• Personal Information We Collect</li>
              <li>• How We Use Your Personal Information</li>
              <li>• How We Share Your Personal Information</li>
              <li>• We Do Not Sell Your Personal Information</li>
              <li>• Your Choices and Rights</li>
              <li>• Security</li>
              <li>• International Data Transfers</li>
              <li>• Children</li>
              <li>• Changes to this Privacy Policy</li>
              <li>• How to Contact Us</li>
            </ul>
          </div>

          {/* Personal Information We Collect */}
          <div id="personal-information" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Personal Information We Collect</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Information you provide to us.</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-800">Contact Data</h4>
                  <p className="text-gray-700">such as your first and last name, email address, and phone number.</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">Account Data</h4>
                  <p className="text-gray-700">such as your username and password, profile information (e.g., mailing address, high school), and your interests and preferences.</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">Education Data</h4>
                  <p className="text-gray-700">such as your academic records (GPA, class rank), standardized test scores (SAT/ACT), extracurricular activities, and college application essays or other documents you upload.</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">Communications Data</h4>
                  <p className="text-gray-700">based on our exchanges with you, including when you contact us for support, use our chat features, or respond to our surveys.</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">Payment Data</h4>
                  <p className="text-gray-700">such as your payment card information and billing address, which are needed to complete your subscription transactions.</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">Other Data</h4>
                  <p className="text-gray-700">not specifically listed here, which we will use as described in this Privacy Policy or as otherwise disclosed at the time of collection.</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Automatic data collection.</h3>
              <p className="text-gray-700 mb-3">We and our service providers may automatically log information about you, your device, and your interaction with the Service.</p>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-800">Device Data</h4>
                  <p className="text-gray-700">such as your device's operating system, browser type, IP address, unique identifiers, and general location information (e.g., city, state).</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">Online Activity Data</h4>
                  <p className="text-gray-700">such as pages you viewed, how long you spent on a page, the website you visited before browsing to our Service, and your interaction with our emails (e.g., opens and clicks).</p>
                </div>
              </div>
              <p className="text-gray-700 mt-3">This automatic collection is facilitated by technologies like cookies, web beacons, and local storage.</p>
            </div>
          </div>
        </div>

          {/* How We Use Your Personal Information */}
          <div id="how-we-use" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">How We Use Your Personal Information</h2>
          <p className="text-gray-700 mb-4">We use your personal information for the following purposes:</p>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-800">Service Delivery and Operations.</h4>
              <p className="text-gray-700">To provide, operate, maintain, and personalize your experience with the Service. This includes creating your account, processing your subscription, and communicating with you for administrative and support purposes.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-800">Research and Development.</h4>
              <p className="text-gray-700">To analyze and improve the Service and our business. As part of these activities, we may create aggregated, de-identified, and/or anonymized data from the personal information we collect. We make personal information into de-identified data by removing information that makes it personally identifiable to you. We use this anonymized data to train our AI models, conduct analysis, and promote our business.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-800">Direct Marketing.</h4>
              <p className="text-gray-700">To send you communications about our services, features, and promotions that may be of interest to you. You may opt-out of our marketing communications at any time as described in the "Your Choices and Rights" section.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-800">Compliance and Protection.</h4>
              <p className="text-gray-700">To comply with applicable laws and legal processes, protect our rights and property, and prevent fraudulent or illegal activity.</p>
            </div>
          </div>
        </div>

          {/* How We Share Your Personal Information */}
          <div id="how-we-share" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">How We Share Your Personal Information</h2>
          <p className="text-gray-700 mb-4">We may share your personal information with the following parties:</p>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-800">Service Providers.</h4>
              <p className="text-gray-700">Third-party companies that provide services on our behalf, such as cloud hosting (e.g., Vercel), database management (e.g., Supabase), AI modeling, analytics (e.g., Mixpanel), and customer support.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-800">Payment Processors.</h4>
              <p className="text-gray-700">Our payment processors, such as Stripe, collect and process your payment data directly to facilitate transactions. Their use of your data is governed by their own privacy policies.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-800">Professional Advisors.</h4>
              <p className="text-gray-700">Lawyers, auditors, bankers, and insurers, where necessary in the course of the professional services they render to us.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-800">Authorities and Others.</h4>
              <p className="text-gray-700">Law enforcement and government authorities as we believe in good faith to be necessary to comply with a legal obligation.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-800">Business Transferees.</h4>
              <p className="text-gray-700">An acquirer, successor, or assignee as part of any merger, acquisition, sale of assets, or similar transaction.</p>
            </div>
          </div>
        </div>

          {/* We Do Not Sell Your Personal Information */}
          <div id="no-sell" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">We Do Not Sell Your Personal Information</h2>
          <p className="text-gray-700 mb-4">Our business model is to provide a valuable service directly to you, our user, through a transparent subscription.</p>
          <p className="text-gray-700">We do not and will not sell, rent, or trade your personal information to third parties like universities, data brokers, or marketing companies. The trust of our students and their families is our most important asset.</p>
        </div>

          {/* Your Choices and Rights */}
          <div id="choices-rights" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Choices and Rights</h2>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-800">Access or Update Your Information.</h4>
              <p className="text-gray-700">You may review and update your account information by logging into your account settings.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-800">Opt-out of Marketing Communications.</h4>
              <p className="text-gray-700">You may opt-out of marketing-related emails by following the "unsubscribe" instructions at the bottom of the email. You will continue to receive service-related, non-marketing emails.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-800">Declining to Provide Information.</h4>
              <p className="text-gray-700">We need to collect certain personal information to provide the Service. If you do not provide the information we identify as required, we may not be able to provide the Service to you.</p>
            </div>
          </div>
        </div>

          {/* Security */}
          <div id="security" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Security</h2>
          <p className="text-gray-700">We employ technical and organizational safeguards designed to protect the personal information we collect. However, no security system is impenetrable, and we cannot guarantee the security of your personal information.</p>
        </div>

          {/* International Data Transfer */}
          <div id="international-transfer" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">International Data Transfer</h2>
          <p className="text-gray-700">We are headquartered in the United States and may use service providers that operate in other countries. Your personal information may be transferred to the United States or other locations where privacy laws may not be as protective as those in your state, province, or country.</p>
        </div>

          {/* Children */}
          <div id="children" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Children</h2>
          <p className="text-gray-700">The Service is not intended for use by anyone under 13 years of age. We do not knowingly collect personal information from children under 13. If we learn that we have collected personal information from a child under 13 without the consent of the child's parent or guardian as required by law, we will delete it.</p>
        </div>

          {/* Changes to this Privacy Policy */}
          <div id="changes" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Changes to this Privacy Policy</h2>
          <p className="text-gray-700">We reserve the right to modify this Privacy Policy at any time. If we make material changes, we will notify you by updating the date of this policy and posting it on the Service.</p>
        </div>

          {/* Contact Information */}
          <div id="contact" className="mt-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">How to Contact Us</h2>
          <p className="text-lg text-gray-700 mb-4 text-center">
            If you have questions about this Privacy Policy or our privacy practices, please contact us at{" "}
            <a href="mailto:info@meetdiya.com" className="text-blue-600 hover:text-blue-800 font-medium">
              info@meetdiya.com
            </a>
          </p>
        </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
