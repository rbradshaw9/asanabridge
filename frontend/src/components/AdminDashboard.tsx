import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  BarChart3, 
  Settings, 
  Shield, 
  Activity,
  Search,
  ChevronLeft,
  Crown,
  TrendingUp,
  Database,
  CheckCircle,
  Clock,
  MessageSquare,
  Send
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  plan: 'FREE' | 'PRO';
  isAdmin: boolean;
  monthlyTasksUsed: number;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  _count: {
    syncMappings: number;
  };
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalSyncMappings: number;
  planDistribution: {
    free: number;
    pro: number;
  };
}

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  user: {
    id: string;
    email: string;
    name: string;
  };
  responses: Array<{
    id: string;
    message: string;
    isFromUser: boolean;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'support' | 'system'>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [ticketStatusFilter, setTicketStatusFilter] = useState('all');

  // Redirect if not admin
  useEffect(() => {
    if (user && !user.isAdmin) {
      navigate('/dashboard');
      return;
    }
  }, [user, navigate]);

  // Fetch admin data
  useEffect(() => {
    fetchAdminData();
  }, []);

  // Fetch users when page or search changes
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'support') {
      fetchSupportTickets();
    }
  }, [activeTab, currentPage, searchTerm, ticketStatusFilter]);

  const fetchAdminData = async () => {
    try {
      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      } else {
        setError('Failed to fetch admin data');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setTotalPages(data.pagination.totalPages);
      } else {
        setError('Failed to fetch users');
      }
    } catch (err) {
      setError('Network error fetching users');
    }
  };

  const fetchSupportTickets = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(ticketStatusFilter !== 'all' && { status: ticketStatusFilter })
      });

      const response = await fetch(`/api/admin/support-tickets?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSupportTickets(data.tickets);
        setTotalPages(data.pagination.totalPages);
      } else {
        setError('Failed to fetch support tickets');
      }
    } catch (err) {
      setError('Network error fetching support tickets');
    }
  };

  const updateUserPlan = async (userId: string, plan: 'FREE' | 'PRO') => {
    setUpdating(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}/plan`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ plan })
      });

      if (response.ok) {
        fetchUsers(); // Refresh the list
      } else {
        setError('Failed to update user plan');
      }
    } catch (err) {
      setError('Network error updating plan');
    } finally {
      setUpdating(null);
    }
  };

  const updateUserAdmin = async (userId: string, isAdmin: boolean) => {
    setUpdating(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}/admin`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ isAdmin })
      });

      if (response.ok) {
        fetchUsers(); // Refresh the list
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update admin status');
      }
    } catch (err) {
      setError('Network error updating admin status');
    } finally {
      setUpdating(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (user: User) => {
    if (!user.emailVerified) {
      return <span className="px-2 py-1 text-xs rounded-full bg-yellow-600/20 text-yellow-400">Unverified</span>;
    }
    
    const lastLogin = user.lastLoginAt ? new Date(user.lastLoginAt) : null;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    if (lastLogin && lastLogin > thirtyDaysAgo) {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-600/20 text-green-400">Active</span>;
    }
    
    return <span className="px-2 py-1 text-xs rounded-full bg-gray-600/20 text-gray-400">Inactive</span>;
  };

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto h-16 w-16 text-red-400 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400">Admin privileges required</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-purple-400" />
              <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <ChevronLeft size={16} />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex space-x-1 bg-slate-800/30 p-1 rounded-lg mb-6 w-fit">
          {[
            { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
            { id: 'users' as const, label: 'Users', icon: Users },
            { id: 'support' as const, label: 'Support', icon: MessageSquare },
            { id: 'system' as const, label: 'System', icon: Settings }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-600/20 border border-red-600/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-slate-800/50 border border-white/10 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Users</p>
                    <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-400" />
                </div>
              </div>

              <div className="bg-slate-800/50 border border-white/10 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Active Users</p>
                    <p className="text-2xl font-bold text-white">{stats.activeUsers}</p>
                  </div>
                  <Activity className="h-8 w-8 text-green-400" />
                </div>
              </div>

              <div className="bg-slate-800/50 border border-white/10 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Sync Mappings</p>
                    <p className="text-2xl font-bold text-white">{stats.totalSyncMappings}</p>
                  </div>
                  <Database className="h-8 w-8 text-purple-400" />
                </div>
              </div>

              <div className="bg-slate-800/50 border border-white/10 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Pro Users</p>
                    <p className="text-2xl font-bold text-white">{stats.planDistribution.pro}</p>
                  </div>
                  <Crown className="h-8 w-8 text-yellow-400" />
                </div>
              </div>
            </div>

            {/* Plan Distribution */}
            <div className="bg-slate-800/50 border border-white/10 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp size={20} />
                Plan Distribution
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Free Plan</span>
                    <span className="text-white">{stats.planDistribution.free} users</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ 
                        width: `${(stats.planDistribution.free / stats.totalUsers) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Pro Plan</span>
                    <span className="text-white">{stats.planDistribution.pro} users</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full"
                      style={{ 
                        width: `${(stats.planDistribution.pro / stats.totalUsers) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              />
            </div>

            {/* Users Table */}
            <div className="bg-slate-800/50 border border-white/10 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Plan</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Mappings</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Last Login</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {users.map((userItem) => (
                      <tr key={userItem.id} className="hover:bg-white/5">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-white flex items-center gap-2">
                                {userItem.name}
                                {userItem.isAdmin && <Shield className="h-4 w-4 text-purple-400" />}
                              </div>
                              <div className="text-sm text-gray-400">{userItem.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={userItem.plan}
                            onChange={(e) => updateUserPlan(userItem.id, e.target.value as 'FREE' | 'PRO')}
                            disabled={updating === userItem.id}
                            className="bg-slate-700 border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                          >
                            <option value="FREE">Free</option>
                            <option value="PRO">Pro</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(userItem)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {userItem._count.syncMappings}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {formatDate(userItem.lastLoginAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => updateUserAdmin(userItem.id, !userItem.isAdmin)}
                            disabled={updating === userItem.id || userItem.id === user?.userId}
                            className={`px-3 py-1 rounded text-xs font-medium ${
                              userItem.isAdmin
                                ? 'bg-purple-600/20 text-purple-400 hover:bg-purple-600/30'
                                : 'bg-gray-600/20 text-gray-400 hover:bg-gray-600/30'
                            } transition-colors disabled:opacity-50`}
                          >
                            {userItem.isAdmin ? 'Remove Admin' : 'Make Admin'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-3 bg-slate-700/30 border-t border-white/10 flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm bg-slate-600 text-white rounded hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm bg-slate-600 text-white rounded hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Support Tab */}
        {activeTab === 'support' && (
          <div className="space-y-6">
            {/* Status Filter */}
            <div className="flex gap-4 items-center">
              <select
                value={ticketStatusFilter}
                onChange={(e) => setTicketStatusFilter(e.target.value)}
                className="bg-slate-800/50 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
              >
                <option value="all">All Tickets</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="WAITING">Waiting</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            {/* Support Tickets Table */}
            <div className="bg-slate-800/50 border border-white/10 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Ticket</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Priority</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {supportTickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-white/5">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-white truncate max-w-xs">{ticket.subject}</div>
                            <div className="text-sm text-gray-400 truncate max-w-xs">{ticket.description}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">{ticket.user.name}</div>
                          <div className="text-sm text-gray-400">{ticket.user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            ticket.status === 'OPEN' ? 'bg-green-600/20 text-green-400' :
                            ticket.status === 'IN_PROGRESS' ? 'bg-blue-600/20 text-blue-400' :
                            ticket.status === 'WAITING' ? 'bg-yellow-600/20 text-yellow-400' :
                            'bg-gray-600/20 text-gray-400'
                          }`}>
                            {ticket.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            ticket.priority === 'URGENT' ? 'bg-red-600/20 text-red-400' :
                            ticket.priority === 'HIGH' ? 'bg-orange-600/20 text-orange-400' :
                            ticket.priority === 'MEDIUM' ? 'bg-yellow-600/20 text-yellow-400' :
                            'bg-gray-600/20 text-gray-400'
                          }`}>
                            {ticket.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {formatDate(ticket.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <button
                              className="px-3 py-1 rounded text-xs font-medium bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors"
                            >
                              View
                            </button>
                            <button
                              className="px-3 py-1 rounded text-xs font-medium bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors"
                            >
                              <Send size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-3 bg-slate-700/30 border-t border-white/10 flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm bg-slate-600 text-white rounded hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm bg-slate-600 text-white rounded hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* System Tab */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            {/* System Status */}
            <div className="bg-slate-800/50 border border-white/10 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Activity size={20} />
                System Status
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-white">Database Connected</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-white">API Healthy</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-yellow-400" />
                  <span className="text-white">Background Jobs Running</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-800/50 border border-white/10 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button className="p-4 bg-blue-600/20 border border-blue-600/30 rounded-lg text-left hover:bg-blue-600/30 transition-colors">
                  <div className="text-blue-400 font-medium">View System Logs</div>
                  <div className="text-gray-400 text-sm">Check application logs and errors</div>
                </button>
                <button className="p-4 bg-green-600/20 border border-green-600/30 rounded-lg text-left hover:bg-green-600/30 transition-colors">
                  <div className="text-green-400 font-medium">Database Backup</div>
                  <div className="text-gray-400 text-sm">Create manual database backup</div>
                </button>
                <button className="p-4 bg-purple-600/20 border border-purple-600/30 rounded-lg text-left hover:bg-purple-600/30 transition-colors">
                  <div className="text-purple-400 font-medium">Send Announcements</div>
                  <div className="text-gray-400 text-sm">Notify all users of updates</div>
                </button>
                <button className="p-4 bg-yellow-600/20 border border-yellow-600/30 rounded-lg text-left hover:bg-yellow-600/30 transition-colors">
                  <div className="text-yellow-400 font-medium">Export Data</div>
                  <div className="text-gray-400 text-sm">Export user and system data</div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;