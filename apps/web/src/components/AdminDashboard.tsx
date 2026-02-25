import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../services/api';

type Tab = 'overview' | 'users' | 'support';

interface AdminStats {
  users: { total: number; pro: number; enterprise: number; free: number };
  sync: { activeMappings: number; today: number; last7Days: number };
  support: { openTickets: number };
}

interface AdminUser {
  id: string;
  email: string;
  name?: string;
  plan: string;
  isAdmin: boolean;
  createdAt: string;
  _count: { syncMappings: number; syncLogs: number };
}

interface SupportTicket {
  id: string;
  subject: string;
  status: string;
  category: string;
  priority: string;
  createdAt: string;
  user: { email: string; name?: string };
}

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-brand-700 font-bold text-lg">AsanaBridge</Link>
            <span className="text-xs bg-brand-100 text-brand-700 font-semibold px-2 py-0.5 rounded">Admin</span>
          </div>
          <Link to="/dashboard" className="text-sm text-gray-500 hover:underline">← Dashboard</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-gray-200">
          {(['overview', 'users', 'support'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                tab === t
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'overview' && <OverviewTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'support' && <SupportTab />}
      </main>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    adminApi.getStats().then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  if (!stats) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { label: 'Total users', value: stats.users.total },
        { label: 'PRO users', value: stats.users.pro },
        { label: 'Enterprise', value: stats.users.enterprise },
        { label: 'Syncs today', value: stats.sync.today },
        { label: 'Syncs (7d)', value: stats.sync.last7Days },
        { label: 'Active mappings', value: stats.sync.activeMappings },
        { label: 'Open tickets', value: stats.support.openTickets },
        { label: 'Free users', value: stats.users.free },
      ].map((c) => (
        <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 mb-1">{c.label}</p>
          <p className="text-2xl font-bold text-gray-900">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const load = async (q = '') => {
    setIsLoading(true);
    try {
      const { data } = await adminApi.getUsers({ search: q });
      setUsers((data as { users: AdminUser[] }).users);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const changePlan = async (id: string, plan: string) => {
    await adminApi.updatePlan(id, plan);
    load(search);
  };

  const toggleAdmin = async (id: string, current: boolean) => {
    await adminApi.toggleAdmin(id, !current);
    load(search);
  };

  const deleteUser = async (id: string, email: string) => {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return;
    await adminApi.deleteUser(id);
    load(search);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          type="search"
          placeholder="Search by email or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load(search)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-72 focus:ring-2 focus:ring-brand-500 focus:outline-none"
        />
        <button onClick={() => load(search)} className="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700">
          Search
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Plan</th>
                <th className="text-left px-4 py-3">Mappings</th>
                <th className="text-left px-4 py-3">Joined</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{u.name ?? '—'}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                    {u.isAdmin && <span className="text-xs text-brand-600 font-medium">Admin</span>}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.plan}
                      onChange={(e) => changePlan(u.id, e.target.value)}
                      className="border border-gray-200 rounded px-2 py-1 text-xs"
                    >
                      <option>FREE</option>
                      <option>PRO</option>
                      <option>ENTERPRISE</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u._count.syncMappings}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => toggleAdmin(u.id, u.isAdmin)} className="text-xs text-gray-500 hover:underline">
                      {u.isAdmin ? 'Remove admin' : 'Make admin'}
                    </button>
                    <button onClick={() => deleteUser(u.id, u.email)} className="text-xs text-red-400 hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Support Tab ──────────────────────────────────────────────────────────────

function SupportTab() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [filter, setFilter] = useState('');

  const load = async (status?: string) => {
    const { data } = await adminApi.getSupportTickets(status ? { status } : undefined);
    setTickets((data as { tickets: SupportTicket[] }).tickets);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    await adminApi.updateTicketStatus(id, status);
    load(filter || undefined);
  };

  const STATUS_COLORS: Record<string, string> = {
    OPEN: 'bg-yellow-100 text-yellow-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    RESOLVED: 'bg-green-100 text-green-700',
    CLOSED: 'bg-gray-100 text-gray-500',
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => { setFilter(s); load(s || undefined); }}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filter === s
                ? 'bg-brand-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-400'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {tickets.map((t) => (
          <div key={t.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-gray-900 text-sm">{t.subject}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {t.user.name ?? t.user.email} · {t.category} · {new Date(t.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status] ?? ''}`}>
                  {t.status.replace('_', ' ')}
                </span>
                <select
                  value={t.status}
                  onChange={(e) => updateStatus(t.id, e.target.value)}
                  className="text-xs border border-gray-200 rounded px-2 py-1"
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
            </div>
          </div>
        ))}
        {tickets.length === 0 && <p className="text-sm text-gray-400">No tickets.</p>}
      </div>
    </div>
  );
}
