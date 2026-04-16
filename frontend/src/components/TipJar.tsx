import { useState } from 'react';
import { DollarSign, Heart, Zap, Sparkles } from 'lucide-react';
import api from '@/utils/api';
import toast from 'react-hot-toast';

interface TipJarProps {
  roomId: string;
  recipientId: string;
  recipientName: string;
}

const PRESET_AMOUNTS = [
  { label: '$1', cents: 100, icon: Heart },
  { label: '$5', cents: 500, icon: Zap },
  { label: '$10', cents: 1000, icon: Sparkles },
  { label: '$25', cents: 2500, icon: DollarSign },
];

export default function TipJar({ roomId, recipientId, recipientName }: TipJarProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const getFinalAmount = () => {
    if (selectedAmount) return selectedAmount;
    const custom = parseInt(customAmount);
    return isNaN(custom) ? 0 : custom * 100;
  };

  const sendTip = async () => {
    const amount = getFinalAmount();
    if (!amount || amount < 100) {
      toast.error('Minimum tip is $1');
      return;
    }

    setIsSending(true);
    try {
      const res = await api.post('/payments/tip', {
        amount,
        currency: 'usd',
        toUserId: recipientId,
        toUsername: recipientName,
        toStripeAccountId: 'acct_placeholder', // Real ID from user profile
        roomId,
        message,
      });

      // Show celebration
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);

      const { breakdown } = res.data;
      toast.success(
        `Tip sent! ${recipientName} receives $${(breakdown.creatorReceives / 100).toFixed(2)} (platform fee: $${(breakdown.platformFee / 100).toFixed(2)})`
      );

      setSelectedAmount(null);
      setCustomAmount('');
      setMessage('');
    } catch (error) {
      toast.error('Failed to send tip. Set up Stripe first in Settings.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-3">
      {showCelebration && (
        <div className="text-center py-3 animate-bounce">
          <span className="text-2xl">🎉✨💜</span>
          <p className="text-sm text-green-400 font-bold">Tip sent!</p>
        </div>
      )}

      <p className="text-xs text-gray-400 font-medium">
        Tip {recipientName} — <span className="text-purple-400">90% goes directly to creator</span>
      </p>

      {/* Preset amounts */}
      <div className="grid grid-cols-4 gap-2">
        {PRESET_AMOUNTS.map(({ label, cents, icon: Icon }) => (
          <button
            key={cents}
            onClick={() => { setSelectedAmount(cents); setCustomAmount(''); }}
            className={`flex flex-col items-center py-2 rounded-lg text-xs font-bold transition ${
              selectedAmount === cents
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <Icon className="w-4 h-4 mb-1" />
            {label}
          </button>
        ))}
      </div>

      {/* Custom amount */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
          <input
            type="number"
            value={customAmount}
            onChange={e => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
            placeholder="Custom"
            className="w-full bg-gray-800 text-white pl-7 pr-3 py-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-purple-500"
            min="1"
          />
        </div>
      </div>

      {/* Message */}
      <input
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Add a message (optional)"
        className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-purple-500 placeholder-gray-500"
        maxLength={200}
      />

      {/* Send button */}
      <button
        onClick={sendTip}
        disabled={isSending || !getFinalAmount()}
        className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <DollarSign className="w-5 h-5" />
        {isSending ? 'Sending...' : `Send ${getFinalAmount() ? `$${(getFinalAmount() / 100).toFixed(2)}` : 'Tip'}`}
      </button>

      <p className="text-xs text-gray-600 text-center">
        10% platform fee · Secure via Stripe
      </p>
    </div>
  );
}
