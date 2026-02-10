'use client';

import { useState } from 'react';
import { STREAMING_PROVIDERS } from '@/lib/streaming-providers';

export default function CancelProvidersSidebar() {
  return (
    <aside className="w-52 shrink-0">
      <div className="sticky top-6 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
          Cancel subscription
        </p>
        {STREAMING_PROVIDERS.map((provider) => (
          <ProviderCancelButton key={provider.id} provider={provider} />
        ))}
      </div>
    </aside>
  );
}

function ProviderCancelButton({ provider }: { provider: (typeof STREAMING_PROVIDERS)[0] }) {
  const [logoError, setLogoError] = useState(false);
  return (
    <a
      href={provider.cancelUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2.5 text-left transition-colors hover:border-zinc-600 hover:bg-zinc-800"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-800">
        {!logoError ? (
          <img
            src={provider.logoUrl}
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
            onError={() => setLogoError(true)}
          />
        ) : (
          <span className="text-xs font-medium text-zinc-400">
            {provider.name.charAt(0)}
          </span>
        )}
      </span>
      <span className="truncate text-sm font-medium text-zinc-200">
        {provider.name}
      </span>
    </a>
  );
}
