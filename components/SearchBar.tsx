// components/SearchBar.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SearchBar({ initialQuery = '' }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="max-w-xl mx-auto">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any show or movie..."
          className="w-full bg-white/10 border border-white/20 rounded-2xl py-5 pl-6 pr-28 sm:pr-32 text-xl placeholder-zinc-400 focus:outline-none focus:border-emerald-400"
        />
        <button
          type="submit"
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-emerald-500 text-black px-8 py-3 rounded-xl font-semibold hover:bg-emerald-400 transition-colors"
        >
          Search
        </button>
      </div>
    </form>
  );
}
