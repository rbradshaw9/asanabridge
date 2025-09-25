import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import { 
  User, 
  LogOut, 
  Settings, 
  ExternalLink, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Activity,
  Calendar,
  Zap
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [asanaConnected, setAsanaConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [asanaUser, setAsanaUser] = useState<{name: string, email: string} | null>(null);

  // Check Asana connection status on component mount
  useEffect(() => {
    checkAsanaStatus();
  }, []);

  const checkAsanaStatus = async () => {
    try {
      const response = await authApi.getAsanaStatus();
      setAsanaConnected(response.data.connected);
      if (response.data.connected && response.data.user) {
        setAsanaUser({ 
          name: response.data.user.name, 
          email: response.data.user.email 
        });
      }
    } catch (err) {
      console.log('Asana not connected');
      setAsanaConnected(false);
    }
  };

  const handleAsanaConnect = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');
    
    try {
      const response = await authApi.getAsanaAuthUrl();
      
      // Open OAuth in popup window
      const popup = window.open(
        response.data.authUrl,
        'asana-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups and try again.');
      }

      // Poll for popup closure and check connection status
      const checkClosed = setInterval(async () => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setLoading(false);
          
          // Check if connection was successful
          setTimeout(async () => {
            try {
              const statusResponse = await authApi.getAsanaStatus();
              if (statusResponse.data.connected) {
                setAsanaConnected(true);
                if (statusResponse.data.user) {
                  setAsanaUser({ 
                    name: statusResponse.data.user.name, 
                    email: statusResponse.data.user.email 
                  });
                }
                setSuccessMessage('Successfully connected to Asana!');
                setTimeout(() => setSuccessMessage(''), 5000);
              }
            } catch (err) {
              console.log('Connection check failed');
            }
          }, 1000);
        }
      }, 1000);

    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to get Asana authorization URL');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Zap className="text-white" size={20} />
              </div>
              <h1 className="text-2xl font-bold text-white">AsanaBridge</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-gray-300">
                <User size={20} />
                <span>{user?.name}</span>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Welcome back, {user?.name?.split(' ')[0]}!
          </h2>
          <p className="text-gray-300">
            Manage your task synchronization between Asana and OmniFocus
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Account Status</p>
                <p className="text-2xl font-bold text-white">{user?.plan}</p>
              </div>
              <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="text-green-400" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Last Sync</p>
                <p className="text-2xl font-bold text-white">Never</p>
              </div>
              <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <RefreshCw className="text-blue-400" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Syncs</p>
                <p className="text-2xl font-bold text-white">0</p>
              </div>
              <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                <Activity className="text-purple-400" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Integration Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Asana Integration */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                A
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white">Asana</h3>
                <p className="text-gray-400">Project management platform</p>
              </div>
              <div className="flex items-center gap-2">
                {asanaConnected ? (
                  <>
                    <CheckCircle className="text-green-400" size={20} />
                    <span className="text-green-400 text-sm">Connected</span>
                  </>
                ) : (
                  <>
                    <XCircle className="text-red-400" size={20} />
                    <span className="text-red-400 text-sm">Not Connected</span>
                  </>
                )}
              </div>
            </div>
            
            {error && (
              <div className="mb-4 bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-200 text-sm">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="mb-4 bg-green-500/20 border border-green-500/50 rounded-lg p-3 text-green-200 text-sm">
                {successMessage}
              </div>
            )}

            {asanaConnected && asanaUser && (
              <div className="mb-4 bg-blue-500/20 border border-blue-500/50 rounded-lg p-3 text-blue-200 text-sm">
                Connected as: <strong>{asanaUser.name}</strong> ({asanaUser.email})
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleAsanaConnect}
                disabled={loading}
                className="flex-1 bg-pink-600 hover:bg-pink-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <ExternalLink size={16} />
                    {asanaConnected ? 'Reconnect' : 'Connect to Asana'}
                  </>
                )}
              </button>
              {asanaConnected && (
                <button className="px-4 py-2 bg-white/10 text-gray-300 rounded-lg hover:bg-white/20 transition-colors">
                  <Settings size={16} />
                </button>
              )}
            </div>
          </div>

          {/* OmniFocus Integration */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-700 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                OF
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white">OmniFocus</h3>
                <p className="text-gray-400">Personal task management</p>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="text-gray-500" size={20} />
                <span className="text-gray-500 text-sm">Coming Soon</span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                disabled
                className="flex-1 bg-gray-600/50 text-gray-400 font-semibold py-2 px-4 rounded-lg cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Calendar size={16} />
                Setup OmniFocus
              </button>
              <button 
                disabled
                className="px-4 py-2 bg-gray-600/50 text-gray-400 rounded-lg cursor-not-allowed"
              >
                <Settings size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Activity size={20} />
            Recent Activity
          </h3>
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-600/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="text-gray-400" size={32} />
            </div>
            <p className="text-gray-400 text-lg">No activity yet</p>
            <p className="text-gray-500 text-sm">Connect your integrations to start syncing</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;