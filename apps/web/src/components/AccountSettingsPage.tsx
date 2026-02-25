import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';

type Tab = 'profile' | 'security';

export default function AccountSettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('profile');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/dashboard" className="text-brand-700 font-bold text-lg">AsanaBridge</Link>
          <button onClick={logout} className="text-sm text-red-500 hover:underline">Sign out</button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Account settings</h1>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-gray-200">
          {(['profile', 'security'] as Tab[]).map((t) => (
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

        {tab === 'profile' && <ProfileTab user={user} onRefresh={refreshUser} />}
        {tab === 'security' && <SecurityTab />}
      </main>
    </div>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab({ user, onRefresh }: { user: { name?: string | null; email: string; plan: string } | null; onRefresh: () => void }) {
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSuccess(''); setError('');
    setIsSaving(true);
    try {
      await authApi.updateProfile({ name, email });
      await onRefresh();
      setSuccess('Profile saved.');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Save failed.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
        <p className="text-sm text-gray-900 font-semibold">{user?.plan ?? 'FREE'}</p>
      </div>

      {success && <p className="text-sm text-green-600">{success}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isSaving}
        className="bg-brand-600 text-white text-sm px-5 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-60"
      >
        {isSaving ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────────────────

function SecurityTab() {
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSuccess(''); setError('');
    if (newPass !== confirm) { setError('New passwords do not match.'); return; }
    if (newPass.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setIsSaving(true);
    try {
      await authApi.changePassword(current, newPass);
      setSuccess('Password changed successfully.');
      setCurrent(''); setNewPass(''); setConfirm('');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to change password.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Current password</label>
        <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
        <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} required minLength={8} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
      </div>

      {success && <p className="text-sm text-green-600">{success}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={isSaving} className="bg-brand-600 text-white text-sm px-5 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-60">
        {isSaving ? 'Saving…' : 'Change password'}
      </button>
    </form>
  );
}
