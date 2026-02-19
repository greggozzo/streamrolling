// components/Header.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { UserButton, SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      {open ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      )}
    </svg>
  );
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen]);

  return (
    <header className="border-b border-zinc-800 bg-zinc-950 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
          <Image src="/logo.jpg" alt="" width={200} height={56} className="h-10 sm:h-12 w-auto object-contain shrink-0" priority />
          <span className="text-xl sm:text-3xl font-bold tracking-tighter truncate">Streamrolling</span>
        </Link>

        <nav className="flex items-center gap-3 sm:gap-8 text-sm sm:text-lg shrink-0">
          {/* Desktop: full nav. Mobile: only My Shows + menu + account */}
          <SignedIn>
            <Link href="/dashboard" className="hover:text-emerald-400 transition-colors whitespace-nowrap">
              My Shows
            </Link>
            <Link href="/manage-subscriptions" className="hidden sm:inline hover:text-emerald-400 transition-colors whitespace-nowrap">
              Cancel & Subscribe
            </Link>
            <Link href="/settings/notifications" className="hidden sm:inline hover:text-emerald-400 transition-colors whitespace-nowrap">
              Notifications
            </Link>
          </SignedIn>

          {/* Mobile menu button (signed in only) */}
          <SignedIn>
            <div className="relative sm:hidden" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                aria-expanded={menuOpen}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              >
                <MenuIcon open={menuOpen} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 py-2 min-w-[180px] bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-50">
                  <Link
                    href="/manage-subscriptions"
                    className="block px-4 py-2.5 text-sm hover:bg-zinc-800 hover:text-emerald-400"
                    onClick={() => setMenuOpen(false)}
                  >
                    Cancel & Subscribe
                  </Link>
                  <Link
                    href="/settings/notifications"
                    className="block px-4 py-2.5 text-sm hover:bg-zinc-800 hover:text-emerald-400"
                    onClick={() => setMenuOpen(false)}
                  >
                    Notifications
                  </Link>
                </div>
              )}
            </div>
          </SignedIn>

          <SignedOut>
            <SignInButton mode="modal">
              <button className="hover:text-emerald-400 transition-colors whitespace-nowrap">Sign in</button>
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