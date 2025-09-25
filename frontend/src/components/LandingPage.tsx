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
              Now with advanced workflow automation
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-8 tracking-tight leading-tight">
              Bridge Your Workflow
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent block mt-2">
                With Asana
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-500 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
              Seamlessly connect your favorite tools with Asana to create powerful, 
              automated workflows that save time and boost productivity.
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

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
              Everything you need to
              <span className="text-blue-600 block">supercharge productivity</span>
            </h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto font-light">
              Connect, automate, and optimize your workflow with powerful integrations
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Lightning Fast</h3>
              <p className="text-gray-500 leading-relaxed">
                Set up integrations in minutes, not hours. Our streamlined process gets you connected instantly.
              </p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Team Focused</h3>
              <p className="text-gray-500 leading-relaxed">
                Built for teams of all sizes. Collaborate seamlessly with shared workflows and permissions.
              </p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Data Driven</h3>
              <p className="text-gray-500 leading-relaxed">
                Get insights into your workflow performance with detailed analytics and reporting.
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
              Loved by teams worldwide
            </h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto font-light">
              Join thousands of teams who have transformed their productivity
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, index) => (
                    <Star key={index} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  "AsanaBridge transformed how our team works. The seamless integration with our existing tools saved us hours every week."
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mr-4"></div>
                  <div>
                    <div className="font-semibold text-gray-900">Sarah Johnson</div>
                    <div className="text-sm text-gray-500">Product Manager, TechCorp</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-blue-600 to-purple-700">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            Ready to transform your workflow?
          </h2>
          <p className="text-xl text-blue-100 mb-12 max-w-2xl mx-auto font-light">
            Join thousands of teams who have already revolutionized their productivity with AsanaBridge.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/auth"
              className="bg-white hover:bg-gray-50 text-gray-900 px-8 py-4 rounded-full text-lg font-medium inline-flex items-center transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <button className="border-2 border-white/30 hover:border-white/50 bg-transparent hover:bg-white/10 text-white px-8 py-4 rounded-full text-lg font-medium transition-all duration-200">
              Contact Sales
            </button>
          </div>
          <p className="text-sm text-blue-200 mt-6">No credit card required • Setup in under 5 minutes</p>
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