import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <span className="text-xl font-bold text-brand-700">AsanaBridge</span>
        <div className="flex gap-4">
          <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-brand-600">
            Sign in
          </Link>
          <Link
            to="/register"
            className="text-sm font-medium bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Sync Asana &amp; OmniFocus{' '}
          <span className="text-brand-600">automatically</span>
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          AsanaBridge keeps your Asana projects and OmniFocus tasks in sync — bidirectionally,
          in the background, without any manual effort.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/register"
            className="bg-brand-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-brand-700 transition-colors"
          >
            Start for free
          </Link>
          <a
            href="https://github.com/asanabridge"
            className="border border-gray-300 text-gray-700 px-8 py-3 rounded-xl font-semibold hover:border-brand-400 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn more
          </a>
        </div>
      </main>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        {FEATURES.map((f) => (
          <div key={f.title} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="text-3xl mb-4">{f.icon}</div>
            <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
            <p className="text-sm text-gray-600">{f.description}</p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="text-center text-sm text-gray-400 py-8">
        &copy; {new Date().getFullYear()} AsanaBridge. All rights reserved.
      </footer>
    </div>
  );
}

const FEATURES = [
  {
    icon: '🔄',
    title: 'Bidirectional sync',
    description:
      'Changes in Asana flow to OmniFocus and vice versa. Conflicts are resolved automatically.',
  },
  {
    icon: '⚡',
    title: 'Lightning fast',
    description:
      'PRO users get 5-minute sync intervals. Never fall out of sync during a busy workday.',
  },
  {
    icon: '🖥️',
    title: 'Native Mac agent',
    description:
      'A lightweight macOS helper runs locally and communicates with OmniFocus via JavaScript.',
  },
];
