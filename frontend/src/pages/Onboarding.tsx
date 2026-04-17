import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video, Users, DollarSign, Zap, ChevronRight, Check, ExternalLink
} from 'lucide-react';
import api from '@/utils/api';
import { useAuth } from '@/utils/auth';
import toast from 'react-hot-toast';

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to SwanyThree',
    subtitle: 'Your complete creator streaming platform',
    icon: Zap,
    color: 'from-purple-600 to-pink-600',
  },
  {
    id: 'streaming',
    title: 'Multi-Platform Streaming',
    subtitle: 'Stream to YouTube, Twitch, Facebook, and 5+ more platforms simultaneously',
    icon: Video,
    color: 'from-blue-600 to-cyan-600',
  },
  {
    id: 'watchparty',
    title: 'Watch Party & Panel',
    subtitle: 'Host live events with up to 20 panelists, synced YouTube viewing, and real-time chat',
    icon: Users,
    color: 'from-green-600 to-teal-600',
  },
  {
    id: 'monetize',
    title: 'Monetization Ready',
    subtitle: 'Accept tips with a 90/10 creator split via Stripe. Connect your account to start earning.',
    icon: DollarSign,
    color: 'from-yellow-600 to-orange-600',
  },
  {
    id: 'stripe',
    title: 'Connect Stripe',
    subtitle: 'Set up your payment account to receive tips from your audience',
    icon: DollarSign,
    color: 'from-purple-600 to-pink-600',
    action: true,
  },
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      // Mark onboarding complete
      localStorage.setItem('onboardingComplete', 'true');
      navigate('/dashboard');
      toast.success('Setup complete! Welcome to SwanyThree 🎉');
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const connectStripe = async () => {
    setIsConnectingStripe(true);
    try {
      const res = await api.post('/payments/connect/onboard');
      window.open(res.data.onboardingUrl, '_blank');
      setStripeConnected(true);
      toast.success('Stripe onboarding opened in new tab');
    } catch {
      toast.error('Failed to start Stripe onboarding');
    } finally {
      setIsConnectingStripe(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all ${
                i === currentStep
                  ? 'w-8 h-3 bg-white'
                  : i < currentStep
                  ? 'w-3 h-3 bg-white/60'
                  : 'w-3 h-3 bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          {/* Icon */}
          <div className={`w-20 h-20 bg-gradient-to-r ${step.color} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
            <step.icon className="w-10 h-10 text-white" />
          </div>

          {/* Content */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">{step.title}</h2>
            <p className="text-gray-600 text-lg leading-relaxed">{step.subtitle}</p>
          </div>

          {/* Step-specific content */}
          {step.id === 'welcome' && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { label: '8+ Platforms', sub: 'Simultaneous' },
                { label: '20 Panelists', sub: 'Watch Party' },
                { label: '90/10 Split', sub: 'Creator Economy' },
                { label: 'AI Powered', sub: 'Moderation & Avatars' },
              ].map(item => (
                <div key={item.label} className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="font-bold text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.sub}</p>
                </div>
              ))}
            </div>
          )}

          {step.id === 'streaming' && (
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {['YouTube', 'Twitch', 'Facebook', 'Twitter/X', 'LinkedIn', 'Instagram', 'TikTok', 'Kick'].map(p => (
                <span key={p} className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                  {p}
                </span>
              ))}
            </div>
          )}

          {step.id === 'stripe' && (
            <div className="space-y-4 mb-6">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Tip amount</span>
                  <span className="font-bold">$10.00</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">You receive (90%)</span>
                  <span className="font-bold text-green-600">$9.00</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Platform fee (10%)</span>
                  <span>$1.00</span>
                </div>
              </div>
              <button
                onClick={connectStripe}
                disabled={isConnectingStripe || stripeConnected}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${
                  stripeConnected
                    ? 'bg-green-500 text-white'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:scale-105 transition'
                }`}
              >
                {stripeConnected ? (
                  <><Check className="w-5 h-5" /> Stripe Connected</>
                ) : isConnectingStripe ? (
                  'Opening Stripe...'
                ) : (
                  <><ExternalLink className="w-5 h-5" /> Connect Stripe Account</>
                )}
              </button>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:scale-105 transition flex items-center justify-center gap-2"
            >
              {isLast ? 'Go to Dashboard' : 'Next'}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {isLast && (
            <button
              onClick={() => { localStorage.setItem('onboardingComplete', 'true'); navigate('/dashboard'); }}
              className="w-full mt-3 py-2 text-gray-500 text-sm hover:text-gray-700 transition"
            >
              Skip for now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
