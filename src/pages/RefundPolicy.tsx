import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const RefundPolicy = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('refund');

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'privacy') {
      navigate('/privacy-policy');
    } else if (tab === 'terms') {
      navigate('/terms-of-service');
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

        {/* Refund Policy Content */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-display font-bold mb-6 text-gray-900 text-center">
            Refund Policy
          </h2>

          {/* Introduction */}
          <div className="mb-12">
            <p className="text-lg text-gray-700 leading-relaxed">
              At Diya AI, we strive to provide outstanding value and transparent services to all our users. Please read our refund policy carefully before making any purchase or transaction.
            </p>
          </div>

          {/* All Transactions Are Final */}
          <div id="all-transactions-final" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">All Transactions Are Final</h2>
          <div className="space-y-4">
            <p className="text-gray-700">
              All purchases and payments made on our platform are <strong>final and non-refundable</strong>.
            </p>
            <p className="text-gray-700">
              We encourage you to review your choices and understand our offerings before completing your transaction.
            </p>
          </div>
        </div>

          {/* Exceptions with Promo Code */}
          <div id="exceptions-promo" className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Exceptions with Promo Code</h2>
          <div className="space-y-4">
            <p className="text-gray-700">
              Refunds will be considered <strong>only for users who possess a specific promotional code</strong> that explicitly grants eligibility for a refund.
            </p>
            <p className="text-gray-700">
              If you have a promo code that allows a refund, please contact our support team with your code details to initiate the process.
            </p>
            <p className="text-gray-700">
              Without this special promotional code, <strong>no refunds will be issued under any circumstances</strong>.
            </p>
          </div>
        </div>

          {/* Contact Information */}
          <div id="contact" className="mt-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Contact Information</h2>
          <p className="text-lg text-gray-700 mb-4 text-center">
            If you have questions about your purchase or believe you are eligible for a refund with a valid promo code, please contact us at{" "}
            <a href="mailto:info@meetdiya.com" className="text-blue-600 hover:text-blue-800 font-medium">
              info@meetdiya.com
            </a>{" "}
            within 7 days of your transaction.
          </p>
          <p className="text-lg text-gray-700 text-center">
            Thank you for choosing Diya AI. Your understanding and cooperation help us serve you better.
          </p>
        </div>
        </div>
      </div>
    </div>
  );
};

export default RefundPolicy;
