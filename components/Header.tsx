// components/Header.tsx
'use client';
import Link from 'next/link';
import { UserButton, SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';

export default function Header() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-emerald-500 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-bold text-black shrink-0">
            S
          </div>
          <span className="text-xl sm:text-3xl font-bold tracking-tighter truncate">Streamrolling</span>
        </Link>

        <nav className="flex items-center gap-4 sm:gap-10 text-sm sm:text-lg shrink-0">
          <Link href="/" className="hover:text-emerald-400 transition-colors">Home</Link>
          <SignedIn>
            <Link href="/dashboard" className="hover:text-emerald-400 transition-colors">My Shows</Link>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="hover:text-emerald-400 transition-colors">Sign in</button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </nav>
      </div>
    </header>
  );
}