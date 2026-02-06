// components/AddToMyShowsButton.tsx
'use client';
import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

interface Props {
  tmdbId: number;
  mediaType?: 'tv' | 'movie';   // ← NEW: pass 'movie' from movie pages
}

export default function AddToMyShowsButton({ tmdbId, mediaType = 'tv' }: Props) {
  const { isSignedIn, userId } = useUser();
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [alreadySaved, setAlreadySaved] = useState(false);
  const router = useRouter();

  // Check if already saved
  useEffect(() => {
    if (!isSignedIn || !userId) return;

    fetch(`/api/check-saved?tmdbId=${tmdbId}`)
      .then(res => res.json())
      .then(data => setAlreadySaved(data.saved));
  }, [isSignedIn, userId, tmdbId]);

  const add = async () => {
    if (!isSignedIn) {
      alert('Sign in to save shows');
      return;
    }
    setLoading(true);

    const res = await fetch('/api/add-show', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdbId, mediaType }),
    });

    const json = await res.json();
    if (json.success) {
      setAdded(true);
      setTimeout(() => router.push('/dashboard'), 700);
    } else {
      alert(json.error || 'Could not add');
    }
    setLoading(false);
  };

  if (alreadySaved) {
    return (
      <div className="w-full bg-zinc-800 text-zinc-400 font-medium py-4 rounded-2xl text-center cursor-default">
        Already in My Shows ✓
      </div>
    );
  }

  if (added) {
    return <div className="text-emerald-400 font-bold text-center py-4">Added ✓ Going to dashboard...</div>;
  }

  return (
    <button
      onClick={add}
      disabled={loading}
      className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-200 transition-colors disabled:opacity-50"
    >
      {loading ? 'Adding...' : 'Add to My Shows'}
    </button>
  );
}