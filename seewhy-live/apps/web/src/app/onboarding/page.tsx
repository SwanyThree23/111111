'use client';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const STEPS = [
  { id: 1, title: 'Welcome to SeeWhy LIVE', desc: 'Creator-first streaming platform. Every feature built for you.' },
  { id: 2, title: 'Set Up Streaming', desc: 'Go live to 9 platforms simultaneously with one click.' },
  { id: 3, title: 'Invite Guests', desc: 'Host up to 20 live guests via VDO.Ninja WebRTC. No downloads required.' },
  { id: 4, title: 'Earn Money', desc: 'Stripe Connect routes 90% of every tip and subscription directly to your account.' },
  { id: 5, title: 'Connect Stripe', desc: 'Set up payouts to start earning. Takes 2 minutes.' },
];

export default function OnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [stripeLoading, setStripeLoading] = useState(false);

  const handleNext = () => {
    if (step === STEPS.length) { router.push('/dashboard'); return; }
    setStep((s) => s + 1);
  };

  const handleStripe = async () => {
    setStripeLoading(true);
    try {
      const { url } = await api.post<{ url: string }>('/api/payments/connect/onboard', { email: user?.username });
      window.location.href = url;
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setStripeLoading(false);
    }
  };

  const current = STEPS[step - 1];

  return (
    <div className="min-h-screen bg-[#0C0806] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((s) => (
            <div key={s.id} className={`flex-1 h-1 rounded-full transition-all ${s.id <= step ? 'bg-[#C8FF00]' : 'bg-[#242424]'}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="card"
          >
            <div className="mb-2 text-xs text-gray-500 font-ui uppercase tracking-wider">Step {step} of {STEPS.length}</div>
            <h2 className="font-display text-4xl text-white mb-3">{current.title.toUpperCase()}</h2>
            <p className="text-gray-400 mb-8">{current.desc}</p>

            {step === 5 && (
              <button onClick={handleStripe} disabled={stripeLoading} className="btn-volt w-full mb-4">
                {stripeLoading ? 'Opening Stripe...' : '💳 Connect Stripe (2 min)'}
              </button>
            )}

            <button onClick={handleNext} className={step === 5 ? 'btn-ghost w-full' : 'btn-volt w-full'}>
              {step === STEPS.length ? 'Go to Dashboard' : <span className="flex items-center justify-center gap-2">Continue <ChevronRight size={16} /></span>}
            </button>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
