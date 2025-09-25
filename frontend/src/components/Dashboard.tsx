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
  const [asanaProjects, setAsanaProjects] = useState<any[]>([]);
  const [showProjectSelection, setShowProjectSelection] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [agentStatus, setAgentStatus] = useState<{connected: boolean, hasKey: boolean, lastSeen?: string, version?: string}>({connected: false, hasKey: false});
  const [agentKey, setAgentKey] = useState<string>('');
  const [showAgentKey, setShowAgentKey] = useState(false);

  // Check Asana connection status on component mount
  useEffect(() => {
    checkAsanaStatus();
    checkAgentStatus();
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
        // Load projects if connected
        loadAsanaProjects();
      }
    } catch (err) {
      console.log('Asana not connected');
      setAsanaConnected(false);
    }
  };

  const checkAgentStatus = async () => {
    try {
      const response = await authApi.getAgentStatus();
      setAgentStatus(response.data);
    } catch (err) {
      console.log('Failed to check agent status:', err);
    }
  };

  const loadAsanaProjects = async () => {
    try {
      console.log('Loading Asana projects...');
      const response = await authApi.getAsanaProjects();
      console.log('Projects response:', response.data);
      setAsanaProjects(response.data.projects || []);
    } catch (err) {
      console.error('Failed to load Asana projects:', err);
      setError('Failed to load projects from Asana');
    }
  };

  const handleGenerateAgentKey = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');
    
    try {
      const response = await authApi.generateAgentKey();
      setAgentKey(response.data.agentKey);
      setShowAgentKey(true);
      setSuccessMessage('Agent key generated! Save this key securely - it won\'t be shown again.');
      
      // Refresh agent status
      checkAgentStatus();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate agent key');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupSync = () => {
    setShowProjectSelection(true);
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
                // Load projects after successful connection
                loadAsanaProjects();
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
              {!asanaConnected ? (
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
                      Connect to Asana
                    </>
                  )}
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSetupSync}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
                  >
                    <Settings size={16} />
                    Setup Project Sync
                  </button>
                  <button 
                    onClick={handleAsanaConnect}
                    className="px-4 py-2 bg-white/10 text-gray-300 rounded-lg hover:bg-white/20 transition-colors"
                    title="Reconnect Asana"
                  >
                    <RefreshCw size={16} />
                  </button>
                </>
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
                <h3 className="text-xl font-semibold text-white">OmniFocus Agent</h3>
                <p className="text-gray-400">Desktop sync agent</p>
              </div>
              <div className="flex items-center gap-2">
                {agentStatus.connected ? (
                  <>
                    <CheckCircle className="text-green-400" size={20} />
                    <span className="text-green-400 text-sm">Connected</span>
                  </>
                ) : agentStatus.hasKey ? (
                  <>
                    <XCircle className="text-orange-400" size={20} />
                    <span className="text-orange-400 text-sm">Agent Offline</span>
                  </>
                ) : (
                  <>
                    <XCircle className="text-red-400" size={20} />
                    <span className="text-red-400 text-sm">Not Setup</span>
                  </>
                )}
              </div>
            </div>

            {agentStatus.connected && agentStatus.version && (
              <div className="mb-4 bg-green-500/20 border border-green-500/50 rounded-lg p-3 text-green-200 text-sm">
                Agent v{agentStatus.version} • Last seen: {agentStatus.lastSeen ? new Date(agentStatus.lastSeen).toLocaleString() : 'Unknown'}
              </div>
            )}

            {showAgentKey && agentKey && (
              <div className="mb-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3">
                <p className="text-yellow-200 text-sm font-medium mb-2">🔑 Your Agent Key (save this securely):</p>
                <div className="bg-black/30 rounded p-2 font-mono text-xs text-white break-all">
                  {agentKey}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(agentKey);
                    setSuccessMessage('Agent key copied to clipboard!');
                  }}
                  className="mt-2 text-xs text-yellow-300 hover:text-yellow-200"
                >
                  📋 Copy to clipboard
                </button>
              </div>
            )}

            {!agentStatus.hasKey ? (
              <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                <p className="text-blue-200 text-sm">
                  � Generate an agent key to connect the OmniFocus sync agent
                </p>
              </div>
            ) : !agentStatus.connected ? (
              <div className="mb-4 p-3 bg-orange-500/20 border border-orange-500/50 rounded-lg">
                <p className="text-orange-200 text-sm">
                  ⏳ Agent key created but agent is not connected. Download and start the agent.
                </p>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
                <p className="text-green-200 text-sm">
                  ✅ Agent is connected and ready to sync tasks!
                </p>
              </div>
            )}
            
            <div className="flex gap-3">
              {!agentStatus.hasKey ? (
                <button
                  onClick={handleGenerateAgentKey}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Zap size={16} />
                      Generate Agent Key
                    </>
                  )}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => window.open('/api/download/agent', '_blank')}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
                  >
                    <Calendar size={16} />
                    Download Agent
                  </button>
                  <button
                    onClick={handleGenerateAgentKey}
                    disabled={loading}
                    className="px-4 py-2 bg-yellow-600/80 hover:bg-yellow-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Regenerate Agent Key"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <RefreshCw size={16} />
                    )}
                  </button>
                </>
              )}
              <button 
                onClick={() => window.open('https://github.com/rbradshaw9/asanabridge#setup', '_blank')}
                className="px-4 py-2 bg-white/10 text-gray-300 rounded-lg hover:bg-white/20 transition-colors"
                title="Setup Instructions"
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

      {/* Project Selection Modal */}
      {showProjectSelection && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-slate-700">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-white">Select Asana Projects</h3>
                  <p className="text-gray-400 text-sm mt-1">
                    Choose up to {user?.plan === 'PRO' ? 'unlimited' : '2'} projects to sync with OmniFocus
                  </p>
                </div>
                <button
                  onClick={() => setShowProjectSelection(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 max-h-96 overflow-y-auto">
              {asanaProjects.length === 0 ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading projects...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {asanaProjects.map((project: any) => (
                    <div
                      key={project.gid}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedProjects.includes(project.gid)
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                      }`}
                      onClick={() => {
                        const isSelected = selectedProjects.includes(project.gid);
                        const maxProjects = user?.plan === 'PRO' ? Infinity : 2;
                        
                        if (isSelected) {
                          setSelectedProjects(prev => prev.filter(id => id !== project.gid));
                        } else if (selectedProjects.length < maxProjects) {
                          setSelectedProjects(prev => [...prev, project.gid]);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-semibold">{project.name}</h4>
                          <p className="text-gray-400 text-sm">{project.notes || 'No description'}</p>
                        </div>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedProjects.includes(project.gid)
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-400'
                        }`}>
                          {selectedProjects.includes(project.gid) && (
                            <CheckCircle className="text-white" size={16} />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {user?.plan !== 'PRO' && selectedProjects.length >= 2 && (
                <div className="mt-4 p-3 bg-amber-500/20 border border-amber-500/50 rounded-lg">
                  <p className="text-amber-200 text-sm">
                    🎯 Free accounts can sync up to 2 projects. <a href="#" className="underline">Upgrade to Pro</a> for unlimited projects.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-700 flex gap-3">
              <button
                onClick={() => setShowProjectSelection(false)}
                className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // TODO: Save selected projects and set up sync
                  console.log('Selected projects:', selectedProjects);
                  setShowProjectSelection(false);
                }}
                disabled={selectedProjects.length === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Set Up Sync ({selectedProjects.length} projects)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;