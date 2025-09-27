import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, ArrowRight, ArrowLeft, X, ExternalLink, Download, Settings, Zap } from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  isOptional?: boolean;
}

interface OnboardingWizardProps {
  asanaConnected: boolean;
  agentStatus: { connected: boolean; hasKey: boolean };
  syncMappings: any[];
  onClose: () => void;
  onConnectAsana: () => void;
  onGenerateAgentKey: () => void;
  onDownloadAgent: () => void;
  onSetupSync: () => void;
}

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  asanaConnected,
  agentStatus,
  syncMappings,
  onClose,
  onConnectAsana,

  onDownloadAgent,
  onSetupSync
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showWizard, setShowWizard] = useState(true);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to AsanaBridge',
      description: 'Let\'s get you set up with seamless task synchronization between Asana and OmniFocus.',
      isCompleted: true
    },
    {
      id: 'connect-asana',
      title: 'Connect to Asana',
      description: 'Connect your Asana account to access your projects and tasks.',
      isCompleted: asanaConnected
    },
    {
      id: 'setup-projects',
      title: 'Select Projects to Sync',
      description: 'Choose which Asana projects you want to synchronize with OmniFocus.',
      isCompleted: syncMappings.length > 0
    },
    {
      id: 'download-app',
      title: 'Download macOS App',
      description: 'Download the app, open it, and click "Connect to AsanaBridge" - that\'s it!',
      isCompleted: agentStatus.connected,
      isOptional: false
    },
    {
      id: 'complete',
      title: 'Setup Complete!',
      description: 'You\'re all set! Your tasks will now sync between Asana and OmniFocus.',
      isCompleted: asanaConnected && syncMappings.length > 0 && agentStatus.connected
    }
  ];

  // Auto-advance to next incomplete step
  useEffect(() => {
    const firstIncompleteStep = steps.findIndex(step => !step.isCompleted);
    if (firstIncompleteStep !== -1 && firstIncompleteStep !== currentStep) {
      setCurrentStep(firstIncompleteStep);
    }
  }, [asanaConnected, agentStatus, syncMappings]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const handleClose = () => {
    setShowWizard(false);
    onClose();
  };

  const renderStepContent = () => {
    const step = steps[currentStep];

    switch (step.id) {
      case 'welcome':
        return (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Zap className="text-white" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Welcome to AsanaBridge!</h3>
            <p className="text-gray-300 text-lg mb-6">
              Let's get you set up with seamless task synchronization between Asana and OmniFocus.
            </p>
            <p className="text-gray-400 text-sm">
              This wizard will guide you through each step. You can always come back to complete any step later.
            </p>
          </div>
        );

      case 'connect-asana':
        return (
          <div className="py-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center text-white font-bold text-2xl">
                A
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Connect to Asana</h3>
                <p className="text-gray-400">Access your projects and tasks</p>
              </div>
            </div>
            
            {asanaConnected ? (
              <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-green-400" size={20} />
                  <span className="text-green-400 font-semibold">Asana Connected Successfully!</span>
                </div>
                <p className="text-green-300 text-sm mt-2">
                  You can now access your Asana projects and start setting up synchronization.
                </p>
              </div>
            ) : (
              <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 mb-6">
                <p className="text-blue-200 mb-4">
                  Connect your Asana account to access your projects. This will open a secure OAuth window.
                </p>
                <button
                  onClick={onConnectAsana}
                  className="w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
                >
                  <ExternalLink size={16} />
                  Connect to Asana
                </button>
              </div>
            )}
          </div>
        );

      case 'setup-projects':
        return (
          <div className="py-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <Settings className="text-blue-400" size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Select Projects to Sync</h3>
                <p className="text-gray-400">Choose which projects to synchronize</p>
              </div>
            </div>
            
            {!asanaConnected ? (
              <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 mb-6">
                <p className="text-yellow-200">
                  You need to connect to Asana first before setting up project synchronization.
                </p>
              </div>
            ) : syncMappings.length > 0 ? (
              <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="text-green-400" size={20} />
                  <span className="text-green-400 font-semibold">
                    {syncMappings.length} Project{syncMappings.length !== 1 ? 's' : ''} Configured
                  </span>
                </div>
                <p className="text-green-300 text-sm">
                  Projects: {syncMappings.map(m => m.asanaProjectName).join(', ')}
                </p>
              </div>
            ) : (
              <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 mb-6">
                <p className="text-blue-200 mb-4">
                  Select which Asana projects you want to sync with OmniFocus. Tasks from these projects will automatically appear in OmniFocus.
                </p>
                <button
                  onClick={onSetupSync}
                  disabled={!asanaConnected}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
                >
                  <Settings size={16} />
                  Setup Project Sync
                </button>
              </div>
            )}
          </div>
        );

      case 'download-app':
        return (
          <div className="py-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-green-600/20 rounded-lg flex items-center justify-center">
                <Download className="text-green-400" size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Download macOS App</h3>
                <p className="text-gray-400">Ultra-simple setup - just download, open, and connect!</p>
              </div>
            </div>
            
            {agentStatus.connected ? (
              <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="text-green-400" size={20} />
                  <span className="text-green-400 font-semibold">App Connected!</span>
                </div>
                <p className="text-green-300 text-sm mb-3">
                  Your macOS app is connected and ready to sync tasks with OmniFocus.
                </p>
              </div>
            ) : (
              <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 mb-6">
                <div className="space-y-4">
                  <p className="text-blue-200 text-lg font-medium">
                    � Super Simple Setup
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold mt-0.5">1</div>
                      <p className="text-blue-200 text-sm">Download and install the macOS app</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold mt-0.5">2</div>
                      <p className="text-blue-200 text-sm">Open the app (it will show your connection status automatically)</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold mt-0.5">3</div>
                      <p className="text-blue-200 text-sm">Click "Connect to AsanaBridge" and you're done!</p>
                    </div>
                  </div>
                  <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3 mt-4">
                    <p className="text-green-200 text-sm">
                      ✨ <strong>No complex setup required!</strong> No keys to copy, no manual configuration - just download and connect.
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={onDownloadAgent}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2 mt-6"
                >
                  <Download size={16} />
                  Download macOS App
                </button>
              </div>
            )}
          </div>
        );



      case 'complete':
        return (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="text-white" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Setup Complete!</h3>
            <p className="text-gray-300 text-lg mb-6">
              🎉 Congratulations! AsanaBridge is now set up and ready to sync your tasks.
            </p>
            <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-6">
              <h4 className="text-green-400 font-semibold mb-2">What happens next:</h4>
              <ul className="text-green-300 text-sm space-y-1 text-left">
                <li>• Tasks from your selected Asana projects will appear in OmniFocus</li>
                <li>• Changes made in either app will sync automatically</li>
                <li>• The macOS agent runs quietly in the background</li>
                <li>• You can manage your sync settings anytime from the dashboard</li>
              </ul>
            </div>
            <button
              onClick={handleClose}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
            >
              Get Started
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  if (!showWizard) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-white/20 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/20">
          <div>
            <h2 className="text-xl font-bold text-white">Setup Wizard</h2>
            <p className="text-gray-400 text-sm">Step {currentStep + 1} of {steps.length}</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-white/20">
          <div className="flex items-center gap-2 overflow-x-auto">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => handleStepClick(index)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  index === currentStep
                    ? 'bg-blue-600/20 text-blue-400'
                    : step.isCompleted
                    ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                    : 'text-gray-500 hover:text-gray-400 hover:bg-white/5'
                }`}
              >
                {step.isCompleted ? (
                  <CheckCircle size={16} />
                ) : (
                  <Circle size={16} />
                )}
                <span className="text-sm font-medium">{step.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/20 bg-slate-900/50">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft size={16} />
            Previous
          </button>
          
          <div className="flex items-center gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep
                    ? 'bg-blue-400'
                    : index < currentStep || steps[index].isCompleted
                    ? 'bg-green-400'
                    : 'bg-gray-600'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={currentStep === steps.length - 1}
            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;