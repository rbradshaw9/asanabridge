import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
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
  Zap,
  CreditCard
} from 'lucide-react';

// User Menu Component
const UserMenu: React.FC<{
  user: any;
  onLogout: () => void;
}> = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
      >
        <User size={20} />
        <span>{user?.name?.split(' ')[0]}</span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-white/20 rounded-lg shadow-lg z-50">
            <div className="py-2">
              <div className="px-4 py-2 border-b border-white/10">
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  navigate('/account?tab=profile');
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2"
              >
                <User size={16} />
                Profile
              </button>
              <button
                onClick={() => {
                  navigate('/account?tab=billing');
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2"
              >
                <CreditCard size={16} />
                Billing
              </button>
              <button
                onClick={() => {
                  onLogout();
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-600/10 transition-colors flex items-center gap-2"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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
  const [planInfo, setPlanInfo] = useState<{
    plan: string;
    currentProjects: number;
    maxProjects: number;
    isUnlimited: boolean;
    canAddMore: boolean;
  } | null>(null);
  const [syncMappings, setSyncMappings] = useState<any[]>([]);

  // Check Asana connection status on component mount
  useEffect(() => {
    checkAsanaStatus();
    checkAgentStatus();
    loadPlanInfo();
    loadSyncMappings();
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
      } else {
        console.log('No Asana user data or not connected');
        setAsanaUser(null);
      }
    } catch (err) {
      console.log('Asana not connected:', err);
      setAsanaConnected(false);
      setAsanaUser(null);
    }
  };

  const checkAgentStatus = async () => {
    try {
      const response = await authApi.getAgentStatus();
      setAgentStatus({
        connected: response.data.isOnline,
        hasKey: response.data.hasKey,
        lastSeen: response.data.lastHeartbeat
      });
    } catch (err) {
      console.log('Failed to check agent status:', err);
    }
  };

  const loadPlanInfo = async () => {
    try {
      const response = await authApi.getPlanInfo();
      setPlanInfo(response.data);
    } catch (err) {
      console.log('Failed to load plan info:', err);
    }
  };

  const loadSyncMappings = async () => {
    try {
      const response = await authApi.getSyncMappings();
      setSyncMappings(response.data.mappings || []);
    } catch (err) {
      console.log('Failed to load sync mappings:', err);
    }
  };

  const handleDisconnectAsana = async () => {
    // For now, just clear local state and refresh
    setAsanaConnected(false);
    setAsanaUser(null);
    setAsanaProjects([]);
    setSuccessMessage('Asana disconnected. You can reconnect anytime.');
  };

  const loadAsanaProjects = async () => {
    try {
      const response = await authApi.getAsanaProjects();
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

  const handleCreateSyncMappings = async () => {
    if (selectedProjects.length === 0) {
      setError('Please select at least one project');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      // Create sync mappings for selected projects
      const promises = selectedProjects.map(async (projectId) => {
        const project = asanaProjects.find(p => p.gid === projectId);
        if (!project) return;

        return await authApi.createSyncMapping(
          project.gid,
          project.name,
          project.name // Use same name for OmniFocus initially
        );
      });

      await Promise.all(promises);
      
      setSuccessMessage(`Successfully set up sync for ${selectedProjects.length} project(s)!`);
      setShowProjectSelection(false);
      setSelectedProjects([]);
      
      // Refresh plan info and sync mappings to show updated usage
      loadPlanInfo();
      loadSyncMappings();
      
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      if (err.response?.status === 403 && err.response?.data?.error === 'Project limit reached') {
        setError(err.response.data.message);
      } else {
        setError(err.response?.data?.error || 'Failed to create sync mappings');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSyncMapping = async (mappingId: string, projectName: string) => {
    if (!confirm(`Are you sure you want to delete the sync for "${projectName}"? This will remove the project from OmniFocus and cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      await authApi.deleteSyncMapping(mappingId);
      
      setSuccessMessage(`Successfully deleted sync for "${projectName}"`);
      
      // Refresh data
      loadPlanInfo();
      loadSyncMappings();
      
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete sync mapping');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAgent = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication required. Please log in again.');
        setTimeout(() => setError(''), 5000);
        return;
      }
      
      setLoading(true);
      setError('');
      setSuccessMessage('');
      
      // Create a temporary link with auth header via fetch and blob
      const response = await fetch('/api/download/agent', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to download agent. Please try again.';
        
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // Use default error message if JSON parsing fails
        }
        
        if (response.status === 404) {
          errorMessage = 'Agent installer is being prepared. Please try again in a few minutes.';
        } else if (response.status === 401) {
          errorMessage = 'Authentication expired. Please refresh the page and try again.';
        }
        
        throw new Error(errorMessage);
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'AsanaBridge-Installer.dmg';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccessMessage('✅ Agent download started! Check your Downloads folder.');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      console.error('Download error:', err);
      setError(err.message || 'Failed to download agent. Please try again.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
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
              {planInfo?.plan === 'FREE' && (
                <button
                  onClick={() => navigate('/account?tab=billing')}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                >
                  Upgrade to Pro
                </button>
              )}
              
              <UserMenu user={user} onLogout={logout} />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Plan & Usage</p>
                <p className="text-2xl font-bold text-white">{user?.plan}</p>
                {planInfo && (
                  <p className="text-gray-400 text-xs mt-1">
                    {planInfo.currentProjects} / {planInfo.isUnlimited ? '∞' : planInfo.maxProjects} projects
                  </p>
                )}
              </div>
              <div className={`w-12 h-12 ${planInfo?.canAddMore ? 'bg-green-600/20' : 'bg-yellow-600/20'} rounded-lg flex items-center justify-center`}>
                <CheckCircle className={planInfo?.canAddMore ? 'text-green-400' : 'text-yellow-400'} size={24} />
              </div>
            </div>
            {planInfo && !planInfo.canAddMore && (
              <div className="mt-3 px-3 py-2 bg-yellow-600/20 rounded-lg flex flex-col sm:flex-row sm:items-center gap-2">
                <p className="text-yellow-400 text-sm flex-1">Plan limit reached.</p>
                <button
                  onClick={() => navigate('/account?tab=billing')}
                  className="px-3 py-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-semibold rounded hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                >
                  Upgrade
                </button>
              </div>
            )}
            {planInfo && planInfo.plan === 'FREE' && planInfo.canAddMore && (
              <div className="mt-3 px-3 py-2 bg-blue-600/20 rounded-lg">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <p className="text-blue-400 text-xs flex-1">
                    📅 Free plan: Hourly sync • 🚀 Pro plan: Real-time sync (5min intervals)
                  </p>
                  <button
                    onClick={() => navigate('/account?tab=billing')}
                    className="px-2 py-1 bg-gradient-to-r from-blue-600/50 to-purple-600/50 text-blue-200 text-xs font-medium rounded hover:from-blue-600 hover:to-purple-600 hover:text-white transition-all duration-200"
                  >
                    Upgrade
                  </button>
                </div>
              </div>
            )}
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
                <p className="text-2xl font-bold text-white">{syncMappings.length}</p>
                {syncMappings.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {syncMappings.map(m => m.asanaProjectName).join(', ')}
                  </p>
                )}
              </div>
              <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                <Activity className="text-purple-400" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Integration Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-8">
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
                  <button 
                    onClick={handleDisconnectAsana}
                    className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors"
                    title="Disconnect Asana"
                  >
                    <XCircle size={16} />
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
                    onClick={handleDownloadAgent}
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-700">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-white">Select Asana Projects</h3>
                  <p className="text-gray-400 text-xs sm:text-sm mt-1 break-words">
                    Choose up to {planInfo?.isUnlimited ? 'unlimited' : (planInfo?.maxProjects || 2)} projects to sync with OmniFocus
                    {planInfo && (
                      <span className="block sm:inline sm:ml-2 text-xs">
                        ({planInfo.currentProjects} / {planInfo.isUnlimited ? '∞' : planInfo.maxProjects} used)
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setShowProjectSelection(false)}
                  className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 max-h-96 overflow-y-auto">
              {asanaProjects.length === 0 ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading projects...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {asanaProjects.map((project: any) => {
                    const isAlreadySynced = syncMappings.some(m => m.asanaProjectId === project.gid);
                    const isSelected = selectedProjects.includes(project.gid);
                    
                    return (
                      <div
                        key={project.gid}
                        className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                          isAlreadySynced
                            ? 'border-green-500 bg-green-500/10 hover:border-red-500 hover:bg-red-500/10'
                            : isSelected
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                        }`}
                        onClick={() => {
                          // Handle synced projects - allow unchecking with confirmation
                          if (isAlreadySynced) {
                            const mapping = syncMappings.find(m => m.asanaProjectId === project.gid);
                            if (mapping) {
                              if (confirm(`Are you sure you want to stop syncing "${project.name}"?\n\nThis will:\n• Remove the project from OmniFocus\n• Delete all synced tasks\n• Free up one sync slot\n\nThis action cannot be undone.`)) {
                                handleDeleteSyncMapping(mapping.id, project.name);
                              }
                            }
                            return;
                          }
                          
                          const maxAllowed = planInfo ? (planInfo.isUnlimited ? Infinity : planInfo.maxProjects) : 2;
                          const availableSlots = maxAllowed - (planInfo?.currentProjects || 0);
                          
                          if (isSelected) {
                            setSelectedProjects(prev => prev.filter(id => id !== project.gid));
                          } else if (selectedProjects.length < availableSlots) {
                            setSelectedProjects(prev => [...prev, project.gid]);
                          } else {
                            setError(`You've reached your ${planInfo?.plan || 'FREE'} plan limit. Upgrade to Pro for unlimited projects.`);
                            setTimeout(() => setError(''), 3000);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-white font-semibold">{project.name}</h4>
                              {isAlreadySynced && (
                                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                                  Synced
                                </span>
                              )}
                            </div>
                            <p className="text-gray-400 text-sm">{project.notes || 'No description'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isAlreadySynced
                                ? 'border-green-500 bg-green-500'
                                : isSelected
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-gray-400'
                            }`}>
                              {(isAlreadySynced || isSelected) && (
                                <CheckCircle className="text-white" size={16} />
                              )}
                            </div>
                            {isAlreadySynced && (
                              <span className="text-xs text-gray-400">
                                Click to unsync
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {planInfo && !planInfo.isUnlimited && (planInfo.currentProjects + selectedProjects.length) >= planInfo.maxProjects && (
                <div className="mt-4 p-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/50 rounded-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                      <p className="text-amber-200 text-sm">
                        🎯 {planInfo.plan} accounts can sync up to {planInfo.maxProjects} projects.
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('/account?tab=billing')}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                    >
                      Upgrade to Pro
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 sm:p-6 border-t border-slate-700 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowProjectSelection(false)}
                className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors order-2 sm:order-1"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSyncMappings}
                disabled={selectedProjects.length === 0 || loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 order-1 sm:order-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span className="hidden sm:inline">Setting up...</span>
                    <span className="sm:hidden">Setup...</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">{`Set Up Sync (${selectedProjects.length} projects)`}</span>
                    <span className="sm:hidden">{`Setup (${selectedProjects.length})`}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;