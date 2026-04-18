'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Zap, Star, DollarSign } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import toast from 'react-hot-toast';

const PRESETS = [
  { amount: 1, label: '$1', icon: Heart, color: '#FF3B3B' },
  { amount: 5, label: '$5', icon: Zap, color: '#C8FF00' },
  { amount: 10, label: '$10', icon: Star, color: '#D4AF37' },
  { amount: 25, label: '$25', icon: DollarSign, color: '#A855F7' },
] as const;

export function TipJar({ streamId }: { streamId: string; creatorId: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState('');
  const [loading, setLoading] = useState(false);

  const tip = async (amountDollars: number) => {
    if (!user) { toast.error('Sign in to tip'); return; }
    setLoading(true);
    try {
      const { checkoutUrl } = await api.post<{ checkoutUrl: string }>('/api/payments/tip', {
        streamId,
        grossAmountCents: Math.floor(amountDollars * 100),
        successUrl: `${window.location.href}?tipped=true`,
        cancelUrl: window.location.href,
      });
      window.location.assign(checkoutUrl);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="btn-volt py-2 px-4 text-sm">
        💸 Tip
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute right-0 top-12 bg-[#161616] border border-[#242424] rounded-2xl p-4 w-64 z-20 shadow-2xl"
          >
            <p className="text-xs text-[#C8FF00] font-mono-custom mb-3">Creator keeps 90%</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {PRESETS.map(({ amount, label, icon: Icon, color }) => (
                <button
                  key={amount}
                  onClick={() => tip(amount)}
                  disabled={loading}
                  className="p-3 rounded-xl border border-[#242424] hover:border-[#C8FF00]/40 transition-all flex flex-col items-center gap-1 hover:scale-105 active:scale-95"
                >
                  <Icon size={18} style={{ color }} />
                  <span className="text-sm font-bold">{label}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Custom $"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                className="input text-sm py-2"
                min="1"
              />
              <button
                onClick={() => custom && tip(parseFloat(custom))}
                disabled={loading || !custom}
                className="btn-volt py-2 px-3 text-sm"
              >
                Send
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
