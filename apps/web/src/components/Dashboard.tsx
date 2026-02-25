import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { syncApi, oauthApi, agentApi } from '../services/api';
import type { SyncMapping, AsanaProject, AgentStatus } from '@asanabridge/shared';

// ─── Dashboard (root) ─────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [mappings, setMappings] = useState<SyncMapping[]>([]);
  const [stats, setStats] = useState<{ totalMappings: number; totalSyncs: number; lastSyncAt: string | null } | null>(null);
  const [asanaConnected, setAsanaConnected] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [mappingRes, statsRes, oauthRes, agentRes] = await Promise.allSettled([
        syncApi.getMappings(),
        syncApi.getStats(),
        oauthApi.getStatus(),
        agentApi.getStatus(),
      ]);

      if (mappingRes.status === 'fulfilled') setMappings(mappingRes.value.data.mappings);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (oauthRes.status === 'fulfilled') setAsanaConnected(oauthRes.value.data.connected);
      if (agentRes.status === 'fulfilled') setAgentStatus(agentRes.value.data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <DashboardHeader user={user} onLogout={handleLogout} />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Stats */}
        <StatsCards stats={stats} mappingCount={mappings.length} />

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Asana Connection */}
          <AsanaConnectionCard connected={asanaConnected} onRefresh={loadData} />

          {/* Agent Status */}
          <AgentStatusCard status={agentStatus} onRefresh={loadData} />
        </div>

        {/* Project Mappings */}
        <ProjectMappingsPanel mappings={mappings} onRefresh={loadData} />

        {/* Recent Syncs */}
        <RecentSyncsPanel />
      </main>
    </div>
  );
}

// ─── DashboardHeader ──────────────────────────────────────────────────────────

function DashboardHeader({ user, onLogout }: { user: { name?: string | null; email: string; isAdmin?: boolean } | null; onLogout: () => void }) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <span className="font-bold text-brand-700 text-lg">AsanaBridge</span>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/support" className="text-gray-600 hover:text-brand-600">Support</Link>
          {user?.isAdmin && <Link to="/admin" className="text-gray-600 hover:text-brand-600">Admin</Link>}
          <Link to="/account" className="text-gray-600 hover:text-brand-600">
            {user?.name ?? user?.email}
          </Link>
          <button onClick={onLogout} className="text-red-500 hover:text-red-700">Sign out</button>
        </nav>
      </div>
    </header>
  );
}

// ─── StatsCards ───────────────────────────────────────────────────────────────

function StatsCards({ stats, mappingCount }: { stats: { totalMappings: number; totalSyncs: number; lastSyncAt: string | null } | null; mappingCount: number }) {
  const cards = [
    { label: 'Active mappings', value: mappingCount },
    { label: 'Total syncs', value: stats?.totalSyncs ?? 0 },
    { label: 'Last sync', value: stats?.lastSyncAt ? new Date(stats.lastSyncAt).toLocaleString() : '—' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500 mb-1">{c.label}</p>
          <p className="text-2xl font-bold text-gray-900">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── AsanaConnectionCard ──────────────────────────────────────────────────────

function AsanaConnectionCard({ connected, onRefresh }: { connected: boolean; onRefresh: () => void }) {
  const [isConnecting, setIsConnecting] = useState(false);

  const connectAsana = async () => {
    setIsConnecting(true);
    try {
      const { data } = await oauthApi.getAuthorizeUrl();
      window.location.href = data.url;
    } catch {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    await oauthApi.disconnect();
    onRefresh();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">Asana Connection</h2>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {connected ? 'Connected' : 'Not connected'}
        </span>
      </div>
      {connected ? (
        <button onClick={disconnect} className="text-sm text-red-500 hover:underline">
          Disconnect Asana
        </button>
      ) : (
        <button
          onClick={connectAsana}
          disabled={isConnecting}
          className="bg-brand-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-60"
        >
          {isConnecting ? 'Redirecting…' : 'Connect Asana'}
        </button>
      )}
    </div>
  );
}

// ─── AgentStatusCard ──────────────────────────────────────────────────────────

function AgentStatusCard({ status, onRefresh }: { status: AgentStatus | null; onRefresh: () => void }) {
  const [copied, setCopied] = useState(false);
  const [agentKey, setAgentKey] = useState<string | null>(null);

  const generateKey = async () => {
    const { data } = await agentApi.generateKey();
    setAgentKey(data.agentKey);
    onRefresh();
  };

  const copyKey = () => {
    if (!agentKey) return;
    navigator.clipboard.writeText(agentKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isOnline = status?.isOnline ?? false;
  const isRegistered = status?.registered ?? false;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">Mac Agent</h2>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${isOnline ? 'bg-green-100 text-green-700' : isRegistered ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
          {isOnline ? 'Online' : isRegistered ? 'Offline' : 'Not installed'}
        </span>
      </div>

      {status?.lastHeartbeat && (
        <p className="text-xs text-gray-400 mb-3">
          Last seen: {new Date(status.lastHeartbeat).toLocaleString()}
        </p>
      )}

      {agentKey ? (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Copy this key into the AsanaBridge app:</p>
          <div className="flex gap-2">
            <code className="text-xs bg-gray-50 border rounded px-2 py-1 flex-1 truncate">{agentKey}</code>
            <button onClick={copyKey} className="text-xs text-brand-600 hover:underline shrink-0">
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={generateKey} className="text-sm text-brand-600 hover:underline">
          Generate agent key
        </button>
      )}
    </div>
  );
}

// ─── ProjectMappingsPanel ─────────────────────────────────────────────────────

function ProjectMappingsPanel({ mappings, onRefresh }: { mappings: SyncMapping[]; onRefresh: () => void }) {
  const [showModal, setShowModal] = useState(false);

  const deleteMapping = async (id: string) => {
    if (!confirm('Remove this sync mapping?')) return;
    await syncApi.deleteMapping(id);
    onRefresh();
  };

  const triggerSync = async (id: string) => {
    await syncApi.triggerSync(id);
    onRefresh();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">Project Mappings</h2>
        <button
          onClick={() => setShowModal(true)}
          className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700"
        >
          + Add mapping
        </button>
      </div>

      {mappings.length === 0 ? (
        <p className="text-sm text-gray-400">No mappings yet. Connect Asana and add a project.</p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {mappings.map((m) => (
            <li key={m.id} className="py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{m.asanaProjectName}</p>
                <p className="text-xs text-gray-400">→ {m.ofProjectName}</p>
                {m.lastSyncAt && (
                  <p className="text-xs text-gray-300">
                    Last sync: {new Date(m.lastSyncAt).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex gap-2 text-xs">
                <button
                  onClick={() => triggerSync(m.id)}
                  className="text-brand-600 hover:underline"
                >
                  Sync now
                </button>
                <button
                  onClick={() => deleteMapping(m.id)}
                  className="text-red-400 hover:underline"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showModal && (
        <AddMappingModal onClose={() => setShowModal(false)} onSaved={onRefresh} />
      )}
    </div>
  );
}

// ─── AddMappingModal ──────────────────────────────────────────────────────────

function AddMappingModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [projects, setProjects] = useState<AsanaProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [ofName, setOfName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    oauthApi.getProjects().then(({ data }) => setProjects(data.projects)).catch(() => {});
  }, []);

  const save = async () => {
    if (!selectedProjectId || !ofName.trim()) {
      setError('Please select an Asana project and enter the OmniFocus project name.');
      return;
    }
    setIsLoading(true);
    try {
      const project = projects.find((p) => p.gid === selectedProjectId);
      await syncApi.createMapping({
        asanaProjectId: selectedProjectId,
        asanaProjectName: project?.name ?? selectedProjectId,
        ofProjectName: ofName.trim(),
      });
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Failed to create mapping.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Add project mapping</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asana project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select a project…</option>
              {projects.map((p) => (
                <option key={p.gid} value={p.gid}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              OmniFocus project name
            </label>
            <input
              type="text"
              value={ofName}
              onChange={(e) => setOfName(e.target.value)}
              placeholder="e.g. My Work Project"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="text-sm text-gray-500 hover:underline">Cancel</button>
          <button
            onClick={save}
            disabled={isLoading}
            className="bg-brand-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-60"
          >
            {isLoading ? 'Saving…' : 'Save mapping'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── RecentSyncsPanel ─────────────────────────────────────────────────────────

function RecentSyncsPanel() {
  const [logs, setLogs] = useState<Array<{
    id: string;
    status: string;
    itemsSynced: number;
    createdAt: string;
    syncMapping?: { asanaProjectName: string; ofProjectName: string };
  }>>([]);

  useEffect(() => {
    agentApi.getRecentSyncs()
      .then(({ data }) => setLogs(data.logs))
      .catch(() => {});
  }, []);

  if (logs.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h2 className="font-semibold text-gray-900 mb-4">Recent syncs</h2>
      <ul className="divide-y divide-gray-50">
        {logs.slice(0, 10).map((log) => (
          <li key={log.id} className="py-2 flex items-center justify-between text-sm">
            <div>
              <p className="text-gray-700">
                {log.syncMapping?.asanaProjectName ?? '—'} → {log.syncMapping?.ofProjectName ?? '—'}
              </p>
              <p className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{log.itemsSynced} items</span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  log.status === 'SUCCESS'
                    ? 'bg-green-100 text-green-700'
                    : log.status === 'ERROR'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {log.status}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
