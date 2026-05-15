import { useState } from 'react';
import { DollarSign, Heart, Zap, Sparkles } from 'lucide-react';
import api from '@/utils/api';
import toast from 'react-hot-toast';

interface TipJarProps {
  roomId: string;
  recipientId: string;
  recipientName: string;
}

const TIERS = [
  { label: 'Bronze', amount: 100, icon: Heart, color: 'bg-amber-900/40 border-amber-700/40 text-amber-400' },
  { label: 'Silver', amount: 500, icon: Zap, color: 'bg-gray-700/40 border-gray-500/40 text-gray-300' },
  { label: 'Gold', amount: 1500, icon: Sparkles, color: 'bg-gold/10 border-gold/30 text-gold' },
];

const CREATOR_SHARE = 0.90;

export default function TipJar({ roomId, recipientId, recipientName }: TipJarProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [custom, setCustom] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const getAmount = () => {
    if (selected !== null) return selected;
    const c = parseInt(custom);
    return isNaN(c) ? 0 : c * 100;
  };

  const send = async () => {
    const amount = getAmount();
    if (!amount || amount < 100) { toast.error('Minimum tip is $1'); return; }
    setSending(true);
    try {
      await api.post('/payments/tip', {
        amount,
        currency: 'usd',
        toUserId: recipientId,
        toUsername: recipientName,
        roomId,
        message,
      });
      setSent(true);
      setTimeout(() => setSent(false), 3000);
      const creatorGets = Math.floor(amount * CREATOR_SHARE) / 100;
      toast.success(`Tip sent! ${recipientName} receives $${creatorGets.toFixed(2)}`);
      setSelected(null);
      setCustom('');
      setMessage('');
    } catch {
      toast.error('Tip failed. Make sure Stripe is connected in Settings.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center py-6">
        <div className="text-3xl mb-2">✨</div>
        <p className="text-gold font-display text-xl tracking-wider">TIP SENT!</p>
        <p className="text-white/40 font-mono text-xs mt-1">Thanks for supporting {recipientName}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-mono text-white/40">
        90% goes directly to <span className="text-gold">{recipientName}</span>
      </p>

      {/* Tiers */}
      <div className="grid grid-cols-3 gap-2">
        {TIERS.map(({ label, amount, icon: Icon, color }) => (
          <button
            key={amount}
            onClick={() => { setSelected(amount); setCustom(''); }}
            className={`flex flex-col items-center py-3 rounded-xl border transition text-xs font-mono font-bold ${
              selected === amount ? color : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
            }`}
          >
            <Icon className="w-4 h-4 mb-1" />
            {label}
            <span className="opacity-70">${(amount / 100).toFixed(0)}</span>
          </button>
        ))}
      </div>

      {/* Custom */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 font-mono text-sm">$</span>
        <input
          type="number"
          value={custom}
          onChange={(e) => { setCustom(e.target.value); setSelected(null); }}
          placeholder="Custom amount"
          className="input pl-7"
          min="1"
        />
      </div>

      {/* Message */}
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Message (optional)"
        className="input"
        maxLength={200}
      />

      {/* Send */}
      <button
        onClick={send}
        disabled={sending || !getAmount()}
        className="btn-gold w-full flex items-center justify-center gap-2 disabled:opacity-40"
      >
        <DollarSign className="w-4 h-4" />
        {sending ? 'Sending...' : getAmount() ? `Send $${(getAmount() / 100).toFixed(2)}` : 'Send Tip'}
      </button>

      <p className="text-xs font-mono text-white/20 text-center">
        10% platform fee · Secure via Stripe
      </p>
    </div>
  );
}
