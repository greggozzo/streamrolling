'use client';

import { useState } from 'react';
import { STREAMING_PROVIDERS } from '@/lib/streaming-providers';

export default function CancelProvidersSidebar() {
  return (
    <aside className="w-full lg:w-52 lg:min-w-52 lg:shrink-0 lg:basis-52">
      <div className="lg:sticky lg:top-6 overflow-visible">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
          Cancel subscription
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2">
          {STREAMING_PROVIDERS.map((provider) => (
            <ProviderCancelButton key={provider.id} provider={provider} />
          ))}
        </div>
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
      className="flex items-center gap-3 w-full min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-left text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-800"
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
      <span className="truncate text-sm font-medium">
        {provider.name}
      </span>
    </a>
  );
}
