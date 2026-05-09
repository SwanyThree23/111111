import { Suspense } from 'react';
import { StreamGrid } from '@/components/stream/StreamGrid';
import { CategoryFilter } from '@/components/stream/CategoryFilter';
import { FeaturedStream } from '@/components/stream/FeaturedStream';
import { CreatorStrip } from '@/components/stream/CreatorStrip';
import { NavBar } from '@/components/ui/NavBar';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0C0806]">
      <NavBar />
      <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-8">
        <Suspense fallback={<div className="h-64 bg-[#161616] animate-pulse rounded-2xl" />}>
          <FeaturedStream />
        </Suspense>
        <CreatorStrip />
        <CategoryFilter />
        <Suspense fallback={<StreamGridSkeleton />}>
          <StreamGrid />
        </Suspense>
      </div>
    </main>
  );
}

function StreamGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="aspect-video bg-[#161616] animate-pulse rounded-xl" />
      ))}
    </div>
  );
}
