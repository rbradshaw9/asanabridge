import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supportApi } from '../services/api';

export default function SupportForm() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [priority, setPriority] = useState('NORMAL');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await supportApi.createTicket({ subject, body, category, priority });
      setSuccess(true);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Failed to submit ticket.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link to="/dashboard" className="text-brand-700 font-bold text-lg">AsanaBridge</Link>
          <Link to="/dashboard" className="text-sm text-gray-500 hover:underline">← Dashboard</Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Contact support</h1>
        <p className="text-sm text-gray-500 mb-8">
          Describe your issue and we'll get back to you as soon as possible.
        </p>

        {success ? (
          <div className="bg-green-50 border border-green-100 rounded-xl px-6 py-8 text-center">
            <p className="text-2xl mb-3">✅</p>
            <h2 className="font-semibold text-gray-900 mb-2">Ticket submitted!</h2>
            <p className="text-sm text-gray-500 mb-6">
              We'll respond to your ticket shortly.
            </p>
            <Link to="/dashboard" className="text-sm text-brand-600 hover:underline">
              Return to dashboard
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief description of the issue"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="GENERAL">General</option>
                  <option value="SYNC">Sync issue</option>
                  <option value="BILLING">Billing</option>
                  <option value="AGENT">Agent / Mac app</option>
                  <option value="ACCOUNT">Account</option>
                  <option value="BUG">Bug report</option>
                  <option value="FEATURE">Feature request</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                placeholder="Describe the problem in detail…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-brand-600 text-white text-sm px-5 py-2.5 rounded-lg hover:bg-brand-700 disabled:opacity-60 w-full font-medium"
            >
              {isSubmitting ? 'Submitting…' : 'Submit ticket'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
