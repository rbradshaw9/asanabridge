import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Users, BarChart3, Star } from 'lucide-react';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mr-3"></div>
              <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">AsanaBridge</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Link
                to="/auth"
                className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200"
              >
                Sign In
              </Link>
              <Link
                to="/auth"
                className="bg-black hover:bg-gray-800 text-white px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-8">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
              Real-time bidirectional sync between Asana & OmniFocus
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-8 tracking-tight leading-tight">
              Sync Asana Tasks
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent block mt-2">
                With OmniFocus
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-500 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
              The only solution that keeps your Asana projects and OmniFocus tasks perfectly synchronized. 
              Work in the tool you love while staying connected to your team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/auth"
                className="bg-black hover:bg-gray-800 text-white px-8 py-4 rounded-full text-lg font-medium inline-flex items-center transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <button className="border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-8 py-4 rounded-full text-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md">
                Watch Demo
              </button>
            </div>
            <p className="text-sm text-gray-400 mt-6">Free 14-day trial • No credit card required</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
              How AsanaBridge Works
            </h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto font-light">
              Three simple steps to perfect sync between Asana and OmniFocus
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12 items-center">
            {/* Step 1 */}
            <div className="text-center">
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4">
                  <span className="text-white text-2xl font-bold">A</span>
                </div>
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                  <div className="w-4 h-4 bg-white border-4 border-pink-500 rounded-full"></div>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Connect Your Asana</h3>
              <p className="text-gray-500 leading-relaxed">
                Authenticate with your Asana account and select which projects to sync with OmniFocus.
              </p>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex justify-center">
              <ArrowRight className="h-8 w-8 text-gray-300" />
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4">
                  <span className="text-white text-2xl font-bold">OF</span>
                </div>
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                  <div className="w-4 h-4 bg-white border-4 border-blue-500 rounded-full"></div>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Install macOS Agent</h3>
              <p className="text-gray-500 leading-relaxed">
                Download and run our lightweight native macOS agent that connects to your OmniFocus.
              </p>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex justify-center">
              <ArrowRight className="h-8 w-8 text-gray-300" />
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                  <div className="w-4 h-4 bg-white border-4 border-green-500 rounded-full"></div>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Enjoy Perfect Sync</h3>
              <p className="text-gray-500 leading-relaxed">
                Your tasks sync automatically in real-time. Work in either app and stay perfectly synchronized.
              </p>
            </div>
          </div>

          {/* Sync Flow Visualization */}
          <div className="mt-20 bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-white text-xl font-bold">A</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Asana Projects</h4>
                <p className="text-sm text-gray-500">Team collaboration</p>
              </div>
              
              <div className="flex-1 mx-8">
                <div className="relative">
                  <div className="flex items-center justify-center">
                    <div className="flex-1 h-px bg-gradient-to-r from-pink-500 to-blue-500"></div>
                    <div className="mx-4 w-12 h-12 bg-gradient-to-r from-pink-500 to-blue-500 rounded-full flex items-center justify-center">
                      <Zap className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-blue-500 to-pink-500"></div>
                  </div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-8">
                    <div className="bg-gray-900 text-white px-3 py-1 rounded-full text-xs font-medium">
                      Real-time sync
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-white text-xl font-bold">OF</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">OmniFocus</h4>
                <p className="text-sm text-gray-500">Personal productivity</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
              The perfect sync between
              <span className="text-blue-600 block">team collaboration & personal productivity</span>
            </h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto font-light">
              Finally, a seamless bridge between Asana's team power and OmniFocus's personal focus
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Real-Time Sync</h3>
              <p className="text-gray-500 leading-relaxed">
                Changes in Asana appear instantly in OmniFocus and vice versa. Work in your preferred tool while staying connected to your team.
              </p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Bidirectional Bridge</h3>
              <p className="text-gray-500 leading-relaxed">
                Complete tasks in OmniFocus and see them update in Asana. Add team tasks in Asana and they appear in your personal system.
              </p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">macOS Native</h3>
              <p className="text-gray-500 leading-relaxed">
                Lightweight native macOS agent runs quietly in the background. Works with both OmniFocus 3 and 4.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
              Finally, the sync solution we needed
            </h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto font-light">
              Real feedback from teams using AsanaBridge to bridge Asana and OmniFocus
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, index) => (
                  <Star key={index} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                "I can finally use OmniFocus for personal productivity while staying synced with my team's Asana projects. Game changer!"
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mr-4 flex items-center justify-center text-white font-bold">
                  MK
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Michael Kim</div>
                  <div className="text-sm text-gray-500">Engineering Manager</div>
                </div>
              </div>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, index) => (
                  <Star key={index} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                "No more manually copying tasks between systems. AsanaBridge keeps everything in sync automatically. Love the native macOS app!"
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mr-4 flex items-center justify-center text-white font-bold">
                  AT
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Alex Thompson</div>
                  <div className="text-sm text-gray-500">Freelance Designer</div>
                </div>
              </div>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, index) => (
                  <Star key={index} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                "Perfect for teams who love Asana but have OmniFocus power users. The bidirectional sync works flawlessly."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full mr-4 flex items-center justify-center text-white font-bold">
                  LC
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Lisa Chen</div>
                  <div className="text-sm text-gray-500">Startup Founder</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-blue-600 to-purple-700">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            Ready to sync Asana with OmniFocus?
          </h2>
          <p className="text-xl text-blue-100 mb-12 max-w-2xl mx-auto font-light">
            Stop manually copying tasks between apps. Get the seamless sync solution that OmniFocus and Asana users have been waiting for.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/auth"
              className="bg-white hover:bg-gray-50 text-gray-900 px-8 py-4 rounded-full text-lg font-medium inline-flex items-center transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              to="/auth"
              className="border-2 border-white/30 hover:border-white/50 bg-transparent hover:bg-white/10 text-white px-8 py-4 rounded-full text-lg font-medium transition-all duration-200"
            >
              View Demo
            </Link>
          </div>
          <p className="text-sm text-blue-200 mt-6">14-day free trial • Works with OmniFocus 3 & 4 • macOS 11+</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mr-3"></div>
              <span className="text-xl font-semibold text-gray-900">AsanaBridge</span>
            </div>
            <div className="flex items-center space-x-8 text-sm text-gray-500">
              <a href="#" className="hover:text-gray-900 transition-colors">Privacy</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Terms</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Support</a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-100 text-center text-sm text-gray-400">
            © 2025 AsanaBridge. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;