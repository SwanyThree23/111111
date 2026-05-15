import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Users, DollarSign, Zap, ChevronRight, Check, ExternalLink, Radio } from 'lucide-react';
import api from '@/utils/api';
import toast from 'react-hot-toast';

const STEPS = [
  {
    id: 'welcome',
    title: 'WELCOME TO SEEWHY LIVE',
    subtitle: 'Your complete broadcast monetization suite',
    icon: Radio,
  },
  {
    id: 'streaming',
    title: 'MULTI-PLATFORM',
    subtitle: 'Stream simultaneously to YouTube, Twitch, TikTok, Facebook, Kick, X and more',
    icon: Video,
  },
  {
    id: 'watchparty',
    title: 'PANEL STUDIO',
    subtitle: 'Host live panels with up to 20 VDO.Ninja guests, synced YouTube viewing, real-time chat',
    icon: Users,
  },
  {
    id: 'monetize',
    title: 'CREATOR ECONOMY',
    subtitle: '90% of every tip goes directly to you. Zero hidden fees. Connect Stripe to start.',
    icon: DollarSign,
  },
  {
    id: 'stripe',
    title: 'CONNECT STRIPE',
    subtitle: 'Set up your payout account to receive tips from your audience',
    icon: DollarSign,
    action: true,
  },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const navigate = useNavigate();

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const next = () => {
    if (isLast) {
      localStorage.setItem('onboardingComplete', 'true');
      navigate('/dashboard');
      toast.success('Setup complete! Welcome to SeeWhy LIVE.');
    } else {
      setStep((s) => s + 1);
    }
  };

  const connectStripe = async () => {
    setConnecting(true);
    try {
      const res = await api.post('/payments/connect/onboard');
      window.open(res.data.onboardingUrl, '_blank');
      setConnected(true);
      toast.success('Stripe onboarding opened in new tab');
    } catch {
      toast.error('Failed to start Stripe onboarding');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(128,0,32,0.1),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all ${
                i === step ? 'flex-[3] bg-gold' : i < step ? 'flex-1 bg-gold/40' : 'flex-1 bg-white/10'
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-obsidian-50 border border-white/8 rounded-3xl p-8">
          {/* Icon */}
          <div className="w-16 h-16 bg-burgundy/20 border border-burgundy/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <current.icon className="w-8 h-8 text-burgundy-light" />
          </div>

          <div className="text-center mb-8">
            <h2 className="font-display text-3xl tracking-wider text-white mb-3">{current.title}</h2>
            <p className="text-white/50 font-mono text-sm leading-relaxed">{current.subtitle}</p>
          </div>

          {/* Step-specific content */}
          {current.id === 'welcome' && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { label: '8+ Platforms', sub: 'Simultaneous' },
                { label: '20 Guests', sub: 'Panel Studio' },
                { label: '90/10 Split', sub: 'Creator-first' },
                { label: 'Guardian AI', sub: 'Auto-moderation' },
              ].map((item) => (
                <div key={item.label} className="bg-obsidian-100 border border-white/5 rounded-xl p-3 text-center">
                  <p className="font-display text-lg text-gold">{item.label}</p>
                  <p className="text-xs text-white/30 font-mono">{item.sub}</p>
                </div>
              ))}
            </div>
          )}

          {current.id === 'streaming' && (
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {['YouTube', 'Twitch', 'TikTok', 'Facebook', 'Kick', 'X', 'LinkedIn', 'Instagram'].map((p) => (
                <span key={p} className="px-3 py-1.5 bg-burgundy/10 border border-burgundy/20 text-burgundy-light rounded-full text-xs font-mono">
                  {p}
                </span>
              ))}
            </div>
          )}

          {current.id === 'monetize' && (
            <div className="bg-obsidian-100 border border-white/8 rounded-xl p-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm font-mono">
                <span className="text-white/60">Tip amount</span>
                <span className="text-white">$10.00</span>
              </div>
              <div className="flex justify-between text-sm font-mono">
                <span className="text-gold">You receive (90%)</span>
                <span className="text-gold font-bold">$9.00</span>
              </div>
              <div className="flex justify-between text-sm font-mono text-white/30">
                <span>Platform (10%)</span>
                <span>$1.00</span>
              </div>
            </div>
          )}

          {current.id === 'stripe' && (
            <div className="space-y-4 mb-6">
              <div className="bg-obsidian-100 border border-white/8 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm font-mono">
                  <span className="text-white/60">Example tip</span>
                  <span className="text-white">$25.00</span>
                </div>
                <div className="flex justify-between text-sm font-mono">
                  <span className="text-gold">Your payout (90%)</span>
                  <span className="text-gold font-bold">$22.50</span>
                </div>
              </div>
              <button
                onClick={connectStripe}
                disabled={connecting || connected}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 font-mono transition ${
                  connected ? 'bg-green-800 text-green-300 border border-green-700' : 'btn-gold'
                }`}
              >
                {connected ? (
                  <><Check className="w-5 h-5" /> Stripe Connected</>
                ) : connecting ? 'Opening...' : (
                  <><ExternalLink className="w-5 h-5" /> Connect Stripe</>
                )}
              </button>
            </div>
          )}

          {/* Nav */}
          <div className="flex gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 py-3 border border-white/10 text-white/50 rounded-xl font-mono hover:bg-white/5 transition"
              >
                Back
              </button>
            )}
            <button
              onClick={next}
              className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
            >
              {isLast ? 'Enter Dashboard' : 'Next'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {isLast && (
            <button
              onClick={() => { localStorage.setItem('onboardingComplete', 'true'); navigate('/dashboard'); }}
              className="w-full mt-3 py-2 text-white/20 text-xs font-mono hover:text-white/40 transition"
            >
              Skip for now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
