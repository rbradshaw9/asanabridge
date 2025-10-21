import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import OnboardingWizard from './OnboardingWizard';
import SupportForm from './SupportForm';
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
  CreditCard,
  HelpCircle,
  Shield
} from 'lucide-react';

// User Menu Component
const UserMenu: React.FC<{
  user: any;
  onLogout: () => void;
}> = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const dropdownContent = isOpen ? (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[999999]" 
        onClick={() => setIsOpen(false)}
        style={{ backgroundColor: 'transparent' }}
      />
      {/* Dropdown Menu */}
      <div 
        className="fixed z-[9999999] w-56 bg-slate-800 border border-white/20 rounded-lg shadow-2xl"
        style={{
          top: `${dropdownPosition.top}px`,
          right: `${dropdownPosition.right}px`,
        }}
      >
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
          {user?.isAdmin && (
            <button
              onClick={() => {
                navigate('/admin');
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-purple-400 hover:text-purple-300 hover:bg-purple-600/10 transition-colors flex items-center gap-2"
            >
              <Shield size={16} />
              Admin Dashboard
            </button>
          )}
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
  ) : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
      >
        <User size={20} />
        <span>{user?.name?.split(' ')[0]}</span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {dropdownContent && createPortal(dropdownContent, document.body)}
    </div>
  );
};

// Recent Syncs Section Component
const RecentSyncsSection: React.FC = () => {
  const [syncs, setSyncs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRecentSyncs();
  }, []);

  const fetchRecentSyncs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/agent/recent-syncs', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      if (data.logs) {
        setSyncs(data.logs);
      }
    } catch (err: any) {
      console.error('Failed to fetch recent syncs:', err);
      setError(err.message || 'Failed to load recent syncs');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Activity size={20} />
          Recent Syncs
        </h3>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading recent syncs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Activity size={20} />
          Recent Syncs
        </h3>
        <div className="text-center py-8">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <Activity size={20} />
        Recent Syncs
        <button
          onClick={fetchRecentSyncs}
          className="ml-auto text-gray-400 hover:text-white transition-colors"
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>
      </h3>
      {syncs.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-600/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="text-gray-400" size={32} />
          </div>
          <p className="text-gray-400 text-lg">No syncs yet</p>
          <p className="text-gray-500 text-sm">Tasks will appear here when they're synced from OmniFocus</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {syncs.map((sync: any, index: number) => {
            // Try to parse details from errorMessage if it's JSON
            let details = null;
            try {
              if (sync.errorMessage && sync.errorMessage.startsWith('{')) {
                details = JSON.parse(sync.errorMessage);
              }
            } catch (e) {
              // Not JSON, just regular error message
            }

            return (
              <div
                key={index}
                className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    {sync.status === 'SUCCESS' ? (
                      <CheckCircle className="text-green-400 flex-shrink-0" size={18} />
                    ) : (
                      <XCircle className="text-red-400 flex-shrink-0" size={18} />
                    )}
                    <div>
                      <p className="text-white font-medium">
                        {sync.direction === 'OF_TO_ASANA' ? '📤 OmniFocus → Asana' :
                         sync.direction === 'ASANA_TO_OF' ? '📥 Asana → OmniFocus' :
                         '🔄 Bidirectional'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(sync.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-blue-400 font-semibold">{sync.itemsSynced} tasks</p>
                  </div>
                </div>

                {/* Show detailed sync information if available */}
                {details && details.omnifocus && (
                  <div className="mt-3 p-3 bg-black/20 rounded border border-white/5">
                    <div className="grid grid-cols-2 gap-4">
                      {/* OmniFocus side */}
                      <div>
                        <p className="text-xs font-semibold text-gray-400 mb-1">📋 OMNIFOCUS</p>
                        <p className="text-sm text-white">
                          {details.omnifocus.tasksReceived} tasks received
                        </p>
                        {details.omnifocus.taskNames && details.omnifocus.taskNames.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 mb-1">Tasks:</p>
                            <ul className="text-xs text-gray-300 space-y-0.5">
                              {details.omnifocus.taskNames.slice(0, 3).map((name: string, i: number) => (
                                <li key={i} className="truncate">• {name}</li>
                              ))}
                              {details.omnifocus.taskNames.length > 3 && (
                                <li className="text-gray-500">+ {details.omnifocus.taskNames.length - 3} more</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Asana side */}
                      <div>
                        <p className="text-xs font-semibold text-gray-400 mb-1">📊 ASANA</p>
                        <div className="text-sm text-white space-y-1">
                          {details.asana.tasksCreated > 0 && (
                            <p className="text-green-400">✓ {details.asana.tasksCreated} created</p>
                          )}
                          {details.asana.tasksUpdated > 0 && (
                            <p className="text-blue-400">⟳ {details.asana.tasksUpdated} updated</p>
                          )}
                          {details.asana.tasksCreated === 0 && details.asana.tasksUpdated === 0 && (
                            <p className="text-gray-500">Pending sync...</p>
                          )}
                          {details.asana.errors && details.asana.errors.length > 0 && (
                            <p className="text-red-400">⚠ {details.asana.errors.length} errors</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show project info if available */}
                {sync.syncMapping && (
                  <div className="mt-2 text-xs text-gray-400">
                    {sync.syncMapping.ofProjectName} ↔ {sync.syncMapping.asanaProjectName}
                  </div>
                )}

                {/* Show error message if it's not JSON details */}
                {sync.errorMessage && !details && (
                  <div className="mt-2 text-xs text-red-400">
                    {sync.errorMessage}
                  </div>
                )}
              </div>
            );
          })}
        </div>
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

  const [planInfo, setPlanInfo] = useState<{
    plan: string;
    currentProjects: number;
    maxProjects: number;
    isUnlimited: boolean;
    canAddMore: boolean;
  } | null>(null);
  const [syncMappings, setSyncMappings] = useState<any[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSupport, setShowSupport] = useState(false);

  // Check Asana connection status on component mount
  useEffect(() => {
    checkAsanaStatus();
    checkAgentStatus();
    loadPlanInfo();
    loadSyncMappings();
    
    // Check if user needs onboarding
    checkOnboardingStatus();
    
    // Poll agent status every 30 seconds to detect disconnections quickly
    const agentStatusInterval = setInterval(() => {
      checkAgentStatus();
    }, 30000); // 30 seconds
    
    return () => clearInterval(agentStatusInterval);
  }, []);

  const checkOnboardingStatus = () => {
    // Show onboarding if user hasn't completed basic setup
    const hasCompletedOnboarding = localStorage.getItem('onboarding-completed');
    if (!hasCompletedOnboarding) {
      // Delay showing onboarding to let other data load first
      setTimeout(() => {
        const needsOnboarding = !asanaConnected || syncMappings.length === 0 || !agentStatus.connected;
        if (needsOnboarding) {
          setShowOnboarding(true);
        }
      }, 1000);
    }
  };

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

  const handleDisconnectAgent = async () => {
    if (!confirm('Disconnect the desktop app? You can reconnect by opening the app again.')) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authApi.disconnectAgent();
      setAgentStatus({ connected: false, hasKey: false });
      setSuccessMessage('Desktop app disconnected successfully.');
      // Refresh status after a moment
      setTimeout(() => checkAgentStatus(), 1000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to disconnect desktop app');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNow = async () => {
    if (syncMappings.length === 0) {
      setError('No projects configured for sync');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      // Trigger sync for all active mappings
      const syncPromises = syncMappings.map(mapping => 
        authApi.triggerSync(mapping.id)
      );
      
      await Promise.all(syncPromises);
      
      setSuccessMessage(`✅ Sync completed for ${syncMappings.length} project(s)!`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Sync failed. Please try again.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
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
      a.download = 'AsanaBridge.dmg';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccessMessage('✅ App download started! Check your Downloads folder.');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      console.error('Download error:', err);
      setError(err.message || 'Failed to download agent. Please try again.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Onboarding handlers
  const handleCloseOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem('onboarding-completed', 'true');
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
              <button
                onClick={() => setShowOnboarding(true)}
                className="px-3 py-2 bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 rounded-lg transition-colors text-sm font-medium"
              >
                Setup Guide
              </button>
              
              <button
                onClick={() => setShowSupport(true)}
                className="flex items-center gap-2 px-3 py-2 bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 rounded-lg transition-colors text-sm font-medium"
              >
                <HelpCircle size={16} />
                Support
              </button>
              
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
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[80] max-w-md w-full mx-4">
          <div className="bg-red-500/90 backdrop-blur-sm text-white px-4 py-3 rounded-lg shadow-lg">
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
      
      {successMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[80] max-w-md w-full mx-4">
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
            <div className="flex items-center justify-between mb-3">
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
            {syncMappings.length > 0 && agentStatus.connected && (
              <button
                onClick={handleSyncNow}
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2 text-sm"
                title={!asanaConnected ? 'Asana is currently offline, but you can still test sync' : 'Trigger sync now'}
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                {loading ? 'Syncing...' : 'Sync Now'}
              </button>
            )}
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

          {/* macOS Integration */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            {/* Beautiful Apple-Style Status Card */}
            <div className="mb-6 bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Calendar className="text-white" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">macOS App</h3>
                    <p className="text-gray-400 text-sm">Seamless OmniFocus integration</p>
                  </div>
                </div>
                
                {agentStatus.connected ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-full" title={agentStatus.lastSeen ? `Last heartbeat: ${new Date(agentStatus.lastSeen).toLocaleString()}` : ''}>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-300 text-sm font-medium">Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-500/20 border border-gray-500/30 rounded-full" title={agentStatus.lastSeen ? `Last seen: ${new Date(agentStatus.lastSeen).toLocaleString()}` : 'Never connected'}>
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="text-gray-400 text-sm font-medium">Not Connected</span>
                  </div>
                )}
              </div>
              
              {agentStatus.connected ? (
                <div className="space-y-3">
                  <p className="text-gray-300 text-sm">
                    Your tasks are syncing automatically between Asana and OmniFocus.
                  </p>
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <CheckCircle size={16} />
                    <span>Real-time synchronization active</span>
                  </div>
                  <button
                    onClick={handleDisconnectAgent}
                    className="text-red-400 hover:text-red-300 text-sm underline"
                  >
                    Disconnect Desktop App
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-300 text-sm">
                    Connect your Mac to sync tasks automatically with OmniFocus.
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-gray-400 text-sm">
                      <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-xs font-semibold text-blue-400">1</div>
                      <span>Download and install the macOS app</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-400 text-sm">
                      <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-xs font-semibold text-blue-400">2</div>
                      <span>Open the app and click "Connect"</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-400 text-sm">
                      <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-xs font-semibold text-blue-400">3</div>
                      <span>Start syncing instantly</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleDownloadAgent}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Calendar size={18} />
                    Download for Mac
                  </button>
                </div>
              )}
            
            {/* Installation Instructions */}
            <div className="mt-4 bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
              <p className="text-blue-200 text-sm font-medium mb-2">📱 macOS Installation Instructions:</p>
              <ol className="text-blue-200 text-sm space-y-1 list-decimal list-inside">
                <li>Download and open the DMG file</li>
                <li>Drag AsanaBridge to Applications folder</li>
                <li><strong>Right-click</strong> AsanaBridge in Applications → Select "Open"</li>
                <li>Click "Open" when macOS asks for confirmation</li>
              </ol>
              <p className="text-blue-300 text-xs mt-2">
                ⚠️ macOS will show a security warning since this app isn't notarized by Apple. This is safe to ignore.
              </p>
            </div>
            </div>
          </div>
        </div>

        {/* Recent Syncs */}
        <RecentSyncsSection />
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

      {/* Onboarding Wizard */}
      {showOnboarding && (
        <OnboardingWizard
          asanaConnected={asanaConnected}
          agentStatus={agentStatus}
          syncMappings={syncMappings}
          onClose={handleCloseOnboarding}
          onConnectAsana={handleAsanaConnect}
          onGenerateAgentKey={() => {}}
          onDownloadAgent={handleDownloadAgent}
          onSetupSync={handleSetupSync}
        />
      )}

      {/* Support Form */}
      {showSupport && (
        <SupportForm
          isOpen={showSupport}
          onClose={() => setShowSupport(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;