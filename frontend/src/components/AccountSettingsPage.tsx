import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Lock, 
  CreditCard, 
  Save, 
  Crown,
  Check,
  ArrowLeft,
  Zap,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import { useNavigate } from 'react-router-dom';

const AccountSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Profile form state
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });
  
  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Plan info state
  const [planInfo, setPlanInfo] = useState<any>(null);

  useEffect(() => {
    loadPlanInfo();
  }, []);

  const loadPlanInfo = async () => {
    try {
      const response = await authApi.getPlanInfo();
      setPlanInfo(response.data);
    } catch (err) {
      console.log('Failed to load plan info:', err);
    }
  };

  const handleUpgrade = () => {
    // TODO: Integrate with Stripe
    setSuccessMessage('Stripe integration coming soon! 🚀');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleDowngrade = () => {
    // TODO: Implement downgrade logic
    setSuccessMessage('Downgrade feature coming soon!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');
    
    try {
      await authApi.updateProfile(profileData.name);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      setTimeout(() => setError(''), 5000);
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      setTimeout(() => setError(''), 5000);
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccessMessage('');
    
    try {
      await authApi.updatePassword(passwordData.currentPassword, passwordData.newPassword);
      setSuccessMessage('Password updated successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update password');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'billing', label: 'Billing', icon: CreditCard }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
              >
                <ArrowLeft size={20} />
                <span>Back to Dashboard</span>
              </button>
              <div className="w-px h-6 bg-white/20"></div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Zap className="text-white" size={20} />
                </div>
                <h1 className="text-2xl font-bold text-white">Account Settings</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-gray-300">
                <User size={20} />
                <span>{user?.name}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Simple Notifications */}
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4">
          <div className="bg-red-500/90 backdrop-blur-sm text-white px-4 py-3 rounded-lg shadow-lg">
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
      
      {successMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4">
          <div className="bg-green-500/90 backdrop-blur-sm text-white px-4 py-3 rounded-lg shadow-lg">
            <p className="text-sm">{successMessage}</p>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <nav className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <div className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/50'
                          : 'text-gray-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Icon size={20} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">Profile Settings</h2>
                  
                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                          type="text"
                          value={profileData.name}
                          onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter your full name"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter your email"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Save size={20} />
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </form>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">Security Settings</h2>
                  
                  <form onSubmit={handlePasswordUpdate} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                          type="password"
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter current password"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter new password"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Confirm new password"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Save size={20} />
                      {loading ? 'Updating...' : 'Update Password'}
                    </button>
                  </form>
                </div>
              )}

              {/* Billing Tab */}
              {activeTab === 'billing' && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">Billing & Subscription</h2>
                  
                  {/* Current Plan */}
                  <div className="bg-white/5 rounded-xl p-6 mb-6 border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                          {planInfo?.plan === 'PRO' && <Crown className="text-yellow-400" size={24} />}
                          {planInfo?.plan || user?.plan} Plan
                        </h3>
                        <p className="text-gray-400">
                          {planInfo?.plan === 'FREE' 
                            ? 'Free forever with basic features'
                            : 'Full access to all premium features'
                          }
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">
                          {planInfo?.plan === 'FREE' ? '$0' : '$9.99'}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {planInfo?.plan === 'FREE' ? 'forever' : 'per month'}
                        </div>
                      </div>
                    </div>

                    {planInfo && (
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Projects</span>
                          <span className="text-white">
                            {planInfo.currentProjects} / {planInfo.isUnlimited ? '∞' : planInfo.maxProjects}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Sync Frequency</span>
                          <span className="text-white">
                            {planInfo.plan === 'FREE' ? 'Hourly (60 min)' : 'Real-time (5 min)'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Support</span>
                          <span className="text-white">
                            {planInfo.plan === 'FREE' ? 'Community' : 'Priority'}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      {planInfo?.plan === 'FREE' ? (
                        <button
                          onClick={handleUpgrade}
                          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                        >
                          <Crown size={20} />
                          Upgrade to Pro
                        </button>
                      ) : (
                        <div className="flex gap-3">
                          <button
                            onClick={handleDowngrade}
                            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                          >
                            Downgrade to Free
                          </button>
                          <button
                            onClick={() => setSuccessMessage('Billing portal coming soon!')}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Manage Billing
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Feature Comparison */}
                  <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-4">Plan Features</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-300 mb-3">Free Plan</h4>
                        <ul className="space-y-2">
                          <li className="flex items-center gap-2 text-sm text-gray-400">
                            <Check className="text-green-400" size={16} />
                            Up to 2 projects
                          </li>
                          <li className="flex items-center gap-2 text-sm text-gray-400">
                            <Check className="text-green-400" size={16} />
                            Hourly sync (60 minutes)
                          </li>
                          <li className="flex items-center gap-2 text-sm text-gray-400">
                            <Check className="text-green-400" size={16} />
                            Community support
                          </li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                          <Crown className="text-yellow-400" size={16} />
                          Pro Plan
                        </h4>
                        <ul className="space-y-2">
                          <li className="flex items-center gap-2 text-sm text-white">
                            <Check className="text-green-400" size={16} />
                            Unlimited projects
                          </li>
                          <li className="flex items-center gap-2 text-sm text-white">
                            <Check className="text-green-400" size={16} />
                            Real-time sync (5 minutes)
                          </li>
                          <li className="flex items-center gap-2 text-sm text-white">
                            <Check className="text-green-400" size={16} />
                            Priority support
                          </li>
                          <li className="flex items-center gap-2 text-sm text-white">
                            <Check className="text-green-400" size={16} />
                            Advanced features
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Billing History Placeholder */}
                  <div className="bg-white/5 rounded-xl p-6 border border-white/10 mt-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Billing History</h3>
                    <div className="flex items-center gap-3 text-gray-400">
                      <AlertCircle size={20} />
                      <p>Billing history will appear here once you upgrade to Pro.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AccountSettingsPage;