'use client';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Category { id: string; name: string; slug: string; icon: string; streamCount: number }

export function CategoryFilter() {
  const { data } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/api/categories'),
    staleTime: 300000,
  });
  const router = useRouter();
  const params = useSearchParams();
  const active = params.get('category');

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
      <button
        onClick={() => router.push('/')}
        className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-ui border transition-all ${
          !active ? 'bg-[#C8FF00] text-[#0C0806] border-[#C8FF00] font-bold' : 'border-[#242424] text-gray-400 hover:border-[#C8FF00]/50'
        }`}
      >
        All
      </button>
      {data?.map((cat) => (
        <button
          key={cat.id}
          onClick={() => router.push(`/?category=${cat.slug}`)}
          className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-ui border transition-all flex items-center gap-1.5 ${
            active === cat.slug ? 'bg-[#C8FF00] text-[#0C0806] border-[#C8FF00] font-bold' : 'border-[#242424] text-gray-400 hover:border-[#C8FF00]/50'
          }`}
        >
          <span>{cat.icon}</span> {cat.name}
          {cat.streamCount > 0 && <span className="text-xs opacity-60">({cat.streamCount})</span>}
        </button>
      ))}
    </div>
  );
}
