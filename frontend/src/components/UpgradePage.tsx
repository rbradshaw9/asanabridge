import React from 'react';
import { Check, X, Crown, Zap, Heart, Shield } from 'lucide-react';

const UpgradePage: React.FC = () => {
  const handleUpgrade = () => {
    // TODO: Integrate with Stripe
    alert('Stripe integration coming soon!');
  };

  const features = {
    free: [
      'Up to 2 projects',
      'Hourly sync (60 minutes)',
      'Basic support',
      'Standard sync features'
    ],
    pro: [
      'Unlimited projects',
      'Real-time sync (5 minutes)',
      'Priority support',
      'Advanced sync features',
      'Custom sync intervals',
      'Dashboard analytics'
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Crown className="text-yellow-400" size={32} />
            <h1 className="text-4xl sm:text-5xl font-bold text-white">
              Upgrade to Pro
            </h1>
          </div>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Unlock unlimited projects, real-time sync, and premium features to supercharge your productivity.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Free Plan */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 relative">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Free Plan</h3>
              <div className="text-4xl font-bold text-white mb-1">$0</div>
              <p className="text-gray-400">Forever free</p>
            </div>

            <ul className="space-y-4 mb-8">
              {features.free.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <Check className="text-green-400 flex-shrink-0" size={20} />
                  <span className="text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>

            <button 
              disabled
              className="w-full py-3 px-6 bg-gray-600 text-gray-400 rounded-lg font-semibold cursor-not-allowed"
            >
              Current Plan
            </button>
          </div>

          {/* Pro Plan */}
          <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-md rounded-2xl p-8 border-2 border-blue-500/50 relative">
            {/* Popular Badge */}
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                <Zap size={16} />
                Most Popular
              </div>
            </div>

            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Pro Plan</h3>
              <div className="text-4xl font-bold text-white mb-1">$9.99</div>
              <p className="text-gray-400">per month</p>
            </div>

            <ul className="space-y-4 mb-8">
              {features.pro.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <Check className="text-green-400 flex-shrink-0" size={20} />
                  <span className="text-white font-medium">{feature}</span>
                </li>
              ))}
            </ul>

            <button 
              onClick={handleUpgrade}
              className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              Upgrade Now
            </button>
          </div>
        </div>

        {/* Feature Comparison */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 mb-12">
          <h3 className="text-2xl font-bold text-white text-center mb-8">Feature Comparison</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-4 px-4 text-white font-semibold">Features</th>
                  <th className="text-center py-4 px-4 text-white font-semibold">Free</th>
                  <th className="text-center py-4 px-4 text-white font-semibold">Pro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                <tr>
                  <td className="py-4 px-4 text-gray-300">Projects</td>
                  <td className="py-4 px-4 text-center text-gray-300">2</td>
                  <td className="py-4 px-4 text-center text-white font-semibold">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-gray-300">Sync Frequency</td>
                  <td className="py-4 px-4 text-center text-gray-300">Hourly</td>
                  <td className="py-4 px-4 text-center text-white font-semibold">Real-time (5min)</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-gray-300">Support</td>
                  <td className="py-4 px-4 text-center">
                    <X className="text-red-400 mx-auto" size={20} />
                  </td>
                  <td className="py-4 px-4 text-center">
                    <Check className="text-green-400 mx-auto" size={20} />
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-gray-300">Advanced Features</td>
                  <td className="py-4 px-4 text-center">
                    <X className="text-red-400 mx-auto" size={20} />
                  </td>
                  <td className="py-4 px-4 text-center">
                    <Check className="text-green-400 mx-auto" size={20} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Testimonials/Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="text-blue-400" size={32} />
            </div>
            <h4 className="text-xl font-semibold text-white mb-2">Lightning Fast</h4>
            <p className="text-gray-400">Real-time sync keeps your tasks up-to-date across all platforms instantly.</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="text-purple-400" size={32} />
            </div>
            <h4 className="text-xl font-semibold text-white mb-2">Unlimited Scale</h4>
            <p className="text-gray-400">Sync as many projects as you need without any restrictions.</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="text-green-400" size={32} />
            </div>
            <h4 className="text-xl font-semibold text-white mb-2">Priority Support</h4>
            <p className="text-gray-400">Get fast, dedicated support when you need it most.</p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <button 
            onClick={handleUpgrade}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            <Crown size={24} />
            Start Your Pro Journey
          </button>
          <p className="text-gray-400 text-sm mt-4">
            30-day money-back guarantee • Cancel anytime • Secure payment with Stripe
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpgradePage;