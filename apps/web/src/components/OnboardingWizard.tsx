import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { oauthApi, agentApi } from '../services/api';

type Step = 'welcome' | 'asana' | 'agent' | 'done';

export default function OnboardingWizard() {
  const [step, setStep] = useState<Step>('welcome');
  const [agentKey, setAgentKey] = useState('');
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const connectAsana = async () => {
    const { data } = await oauthApi.getAuthorizeUrl();
    window.location.href = data.url;
  };

  const generateKey = async () => {
    const { data } = await agentApi.generateKey();
    setAgentKey(data.agentKey);
  };

  const copyKey = () => {
    navigator.clipboard.writeText(agentKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const STEPS: Step[] = ['welcome', 'asana', 'agent', 'done'];
  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-md border border-gray-100 p-8">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {STEPS.slice(0, -1).map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= stepIndex - 1 ? 'bg-brand-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {step === 'welcome' && (
          <div className="text-center space-y-4">
            <p className="text-4xl">👋</p>
            <h1 className="text-2xl font-bold text-gray-900">Welcome to AsanaBridge!</h1>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">
              Let's get you set up in three quick steps. It takes about 2 minutes.
            </p>
            <button
              onClick={() => setStep('asana')}
              className="mt-4 bg-brand-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-brand-700 text-sm"
            >
              Get started
            </button>
          </div>
        )}

        {step === 'asana' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Connect Asana</h2>
              <p className="text-sm text-gray-500">
                Authorise AsanaBridge to read and update your Asana tasks.
              </p>
            </div>
            <div className="bg-brand-50 rounded-xl p-4 text-sm text-brand-800">
              You'll be redirected to Asana to grant access, then brought back here.
            </div>
            <div className="flex gap-3">
              <button
                onClick={connectAsana}
                className="bg-brand-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-700 text-sm"
              >
                Connect to Asana
              </button>
              <button
                onClick={() => setStep('agent')}
                className="text-gray-400 hover:underline text-sm"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {step === 'agent' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Install the Mac agent</h2>
              <p className="text-sm text-gray-500">
                The AsanaBridge agent runs on your Mac and connects to OmniFocus.
              </p>
            </div>

            <ol className="space-y-3 text-sm text-gray-700">
              <li className="flex gap-3">
                <span className="font-bold text-brand-600 shrink-0">1.</span>
                <span>
                  <a
                    href={`${import.meta.env.VITE_API_URL ?? ''}/api/auth/app/download/latest`}
                    className="text-brand-600 hover:underline font-medium"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download AsanaBridge.dmg
                  </a>{' '}
                  and open it to install the app.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-brand-600 shrink-0">2.</span>
                <span>Generate your agent key below and paste it into the app.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-brand-600 shrink-0">3.</span>
                <span>The app will connect automatically and start syncing.</span>
              </li>
            </ol>

            {agentKey ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-medium">Your agent key:</p>
                <div className="flex gap-2 items-center">
                  <code className="text-xs bg-gray-50 border rounded-lg px-3 py-2 flex-1 truncate font-mono">
                    {agentKey}
                  </code>
                  <button
                    onClick={copyKey}
                    className="text-xs text-brand-600 hover:underline shrink-0 font-medium"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={generateKey}
                className="text-sm bg-brand-600 text-white px-5 py-2.5 rounded-lg hover:bg-brand-700 font-medium"
              >
                Generate agent key
              </button>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep('done')}
                className="bg-brand-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-700 text-sm"
              >
                Continue
              </button>
              <button onClick={() => setStep('done')} className="text-gray-400 hover:underline text-sm">
                Skip for now
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center space-y-4">
            <p className="text-4xl">🎉</p>
            <h2 className="text-2xl font-bold text-gray-900">You're all set!</h2>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Head to your dashboard to add your first project mapping and start syncing.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-4 bg-brand-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-brand-700 text-sm"
            >
              Go to dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
