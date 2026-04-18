'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { Crown, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  streamId: string;
  creatorId: string;
  onUnlocked: () => void;
  onClose: () => void;
}

const TIERS = [
  { id: 'bronze', label: 'Bronze', price: '$1/mo', amount: 100, color: '#CD7F32', desc: 'Support & access' },
  { id: 'silver', label: 'Silver', price: '$5/mo', amount: 500, color: '#C0C0C0', desc: 'Silver perks + badges' },
  { id: 'gold', label: 'Gold', price: '$15/mo', amount: 1500, color: '#D4AF37', desc: 'VIP access + co-host priority' },
] as const;

export function GoldenPaywall({ streamId, creatorId, onUnlocked, onClose }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (tier: typeof TIERS[number]) => {
    if (!user) { toast.error('Sign in to subscribe'); return; }
    setLoading(tier.id);
    try {
      const { checkoutUrl } = await api.post<{ checkoutUrl: string }>('/api/payments/subscribe', {
        creatorId,
        tier: tier.id,
        successUrl: `${window.location.href}?subscribed=true`,
        cancelUrl: window.location.href,
      });
      window.location.href = checkoutUrl;
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-[#161616] border border-[#D4AF37]/30 rounded-2xl p-8 max-w-md w-full relative gold-glow"
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
            <X size={20} />
          </button>
          <div className="text-center mb-6">
            <Crown size={40} className="text-[#D4AF37] mx-auto mb-3" />
            <h2 className="font-display text-3xl text-white">FREE PREVIEW ENDED</h2>
            <p className="text-gray-400 text-sm mt-2">Subscribe to continue watching and support the creator</p>
            <p className="text-[#C8FF00] text-xs mt-1 font-mono-custom">Creator keeps 90% of every subscription</p>
          </div>
          <div className="space-y-3">
            {TIERS.map((tier) => (
              <button
                key={tier.id}
                onClick={() => handleSubscribe(tier)}
                disabled={loading !== null}
                className="w-full p-4 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-between"
                style={{ borderColor: tier.color + '40', background: tier.color + '10' }}
              >
                <div className="text-left">
                  <div className="font-bold" style={{ color: tier.color }}>{tier.label}</div>
                  <div className="text-xs text-gray-400">{tier.desc}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono-custom font-bold text-white">{tier.price}</div>
                  {loading === tier.id && <div className="text-xs text-gray-500">Redirecting...</div>}
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
