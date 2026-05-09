'use client';

import { useState } from 'react';
import { Plus, X, BarChart2 } from 'lucide-react';

interface Props {
  streamId: string;
  apiUrl: string;
  onLaunched?: () => void;
}

export default function PollCreator({ streamId, apiUrl, onLaunched }: Props) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [duration, setDuration] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function addOption() {
    if (options.length < 6) setOptions((o) => [...o, '']);
  }

  function removeOption(idx: number) {
    if (options.length <= 2) return;
    setOptions((o) => o.filter((_, i) => i !== idx));
  }

  async function launch() {
    const filled = options.filter((o) => o.trim());
    if (!question.trim() || filled.length < 2) {
      setError('Add a question and at least 2 options');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiUrl}/api/polls/${streamId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ question: question.trim(), options: filled, durationSeconds: duration }),
      });
      if (!res.ok) throw new Error(await res.text());
      setOpen(false);
      setQuestion('');
      setOptions(['', '']);
      setDuration(60);
      onLaunched?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-full transition"
      >
        <BarChart2 size={14} />
        Poll
      </button>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 w-full max-w-sm space-y-3">
      <div className="flex justify-between items-center">
        <span className="font-semibold text-sm text-white">Launch Poll</span>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">
          <X size={16} />
        </button>
      </div>

      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask your audience..."
        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
      />

      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={opt}
              onChange={(e) => setOptions((o) => o.map((v, j) => (j === i ? e.target.value : v)))}
              placeholder={`Option ${i + 1}`}
              className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
            {options.length > 2 && (
              <button onClick={() => removeOption(i)} className="text-gray-500 hover:text-red-400">
                <X size={14} />
              </button>
            )}
          </div>
        ))}
        {options.length < 6 && (
          <button onClick={addOption} className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300">
            <Plus size={12} /> Add option
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span>Duration:</span>
        {[30, 60, 120, 300].map((s) => (
          <button
            key={s}
            onClick={() => setDuration(s)}
            className={`px-2 py-0.5 rounded text-xs transition ${
              duration === s ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {s < 60 ? `${s}s` : `${s / 60}m`}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        onClick={launch}
        disabled={loading}
        className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg py-2 transition"
      >
        {loading ? 'Launching...' : 'Launch Poll'}
      </button>
    </div>
  );
}
