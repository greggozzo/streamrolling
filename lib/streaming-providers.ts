/**
 * Major streaming providers: cancel/manage links and logos.
 * Update cancelUrl for each provider to keep links current.
 * Logos: use image URL (e.g. Clearbit, or /logos/name.svg in public).
 */

/** Suffixes TMDB uses for "watch via X on Apple TV / Prime / Amazon / Roku" — we strip these and show the direct service. */
const CHANNEL_SUFFIXES = [
  ' Apple TV Channel',
  ' Apple TV channel',
  ' Prime Channel',
  ' Prime channel',
  ' Amazon Channel',
  ' Roku Premium Channel',
  ' Originals Amazon Channel',
];

/** After stripping channel suffix, map base name to canonical display name. */
const BASE_TO_CANONICAL: Record<string, string> = {
  'Paramount Plus': 'Paramount+',
  'Paramount+': 'Paramount+',
  'Peacock': 'Peacock',
  'Peacock Premium': 'Peacock',
  'AMC Plus': 'AMC+',
  'AMC+': 'AMC+',
  'Disney Plus': 'Disney+',
  'Disney+': 'Disney+',
  'HBO Max': 'Max',
  'Max': 'Max',
  'Starz': 'Starz',
  'Showtime': 'Showtime',
  'MGM Plus': 'MGM+',
  'MGM+': 'MGM+',
};

/** TMDB sometimes returns tier names (Essential, Premium, Basic with Ads); map to canonical. */
const DISPLAY_NORMALIZE: Record<string, string> = {
  'Paramount Plus': 'Paramount+',
  'Paramount Plus Essential': 'Paramount+',
  'Paramount Plus Premium': 'Paramount+',
  'Paramount Plus Basic with Ads': 'Paramount+',
};

function isChannelVariant(name: string): boolean {
  const n = name.trim();
  return CHANNEL_SUFFIXES.some((suffix) => n.includes(suffix));
}

function channelVariantToDirect(name: string): string {
  let base = name.trim();
  for (const suffix of CHANNEL_SUFFIXES) {
    if (base.includes(suffix)) {
      base = base.replace(suffix, '').trim();
      break;
    }
  }
  return BASE_TO_CANONICAL[base] ?? BASE_TO_CANONICAL[base.replace(/\s+/g, ' ')] ?? (base || name);
}

function toDisplayName(name: string): string {
  const n = name.trim();
  return DISPLAY_NORMALIZE[n] ?? n;
}

/** TMDB watch/providers response shape (results by country code). */
type WatchProvidersResults = Record<string, { flatrate?: { provider_name?: string }[] } | undefined>;

/**
 * Get flatrate list from the first region that has it (US first, then GB, CA, then any).
 * TMDB often has no US data for unreleased titles; other regions may list the service.
 */
export function getFlatrateFromRegions(
  watchProviders: { results?: WatchProvidersResults } | null | undefined,
  regions: string[] = ['US', 'GB', 'CA']
): { provider_name?: string }[] | null | undefined {
  const results = watchProviders?.results;
  if (!results || typeof results !== 'object') return undefined;
  for (const code of regions) {
    const flatrate = results[code]?.flatrate;
    if (flatrate?.length) return flatrate;
  }
  const first = Object.values(results).find((r) => r?.flatrate?.length);
  return first?.flatrate ?? undefined;
}

/**
 * From TMDB watch/providers flatrate list, pick the primary service name.
 * Prefers the direct service (e.g. "Paramount+") over channel variants.
 * US responses often list only channel variants first (e.g. "Paramount Plus Apple TV Channel ");
 * we map those to the direct service name.
 */
export function pickPrimaryProvider(
  flatrate: { provider_name?: string }[] | null | undefined
): string {
  if (!flatrate?.length) return 'Unknown';
  const names = flatrate.map((p) => (p.provider_name ?? '').trim()).filter(Boolean);
  if (!names.length) return 'Unknown';

  for (const name of names) {
    if (!isChannelVariant(name)) return toDisplayName(name);
  }
  return channelVariantToDirect(names[0]);
}

export interface StreamingProvider {
  id: string;
  name: string;
  /** Official account or cancel subscription page. */
  cancelUrl: string;
  /** Optional: affiliate or signup URL for subscribe column on manage-subscriptions page. */
  subscribeUrl?: string;
  /** Logo image URL (external or /logo.svg in public). */
  logoUrl: string;
  /** Optional: match TMDB/provider names for consistency (e.g. "HBO Max" vs "Max"). */
  aliases?: string[];
}

export const STREAMING_PROVIDERS: StreamingProvider[] = [
  {
    id: 'netflix',
    name: 'Netflix',
    cancelUrl: 'https://www.netflix.com/YourAccount',
    logoUrl: 'https://media.themoviedb.org/t/p/original/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg',
    aliases: ['Netflix'],
  },
  {
    id: 'max',
    name: 'HBO',
    cancelUrl: 'https://hbomax.com/subscription',
    logoUrl: 'https://media.themoviedb.org/t/p/original/jbe4gVSfRlbPTdESXhEKpornsfu.jpg',
    aliases: ['HBO Max', 'Max'],
  },
  {
    id: 'disney-plus',
    name: 'Disney+',
    cancelUrl: 'https://www.disneyplus.com/account',
    logoUrl: 'https://media.themoviedb.org/t/p/original/97yvRBw1GzX7fXprcF80er19ot.jpg',
    aliases: ['Disney Plus', 'Disney+'],
  },
  {
    id: 'amazon',
    name: 'Prime Video',
    cancelUrl: 'https://www.amazon.com/amazonprime',
    logoUrl: 'https://media.themoviedb.org/t/p/original/pvske1MyAoymrs5bguRfVqYiM9a.jpg',
    aliases: ['Amazon Prime Video', 'Prime Video', 'Amazon'],
  },
  {
    id: 'apple-tv',
    name: 'Apple TV+',
    cancelUrl: 'https://tv.apple.com/account',
    logoUrl: 'https://media.themoviedb.org/t/p/original/mcbz1LgtErU9p4UdbZ0rG6RTWHX.jpg',
    aliases: ['Apple TV Plus', 'Apple TV+'],
  },
  {
    id: 'hulu',
    name: 'Hulu',
    cancelUrl: 'https://www.hulu.com/account',
    logoUrl: 'https://media.themoviedb.org/t/p/original/bxBlRPEPpMVDc4jMhSrTf2339DW.jpg',
    aliases: ['Hulu'],
  },
  {
    id: 'paramount',
    name: 'Paramount+',
    cancelUrl: 'https://www.paramountplus.com/account/',
    logoUrl: 'https://media.themoviedb.org/t/p/original/fts6X10Jn4QT0X6ac3udKEn2tJA.jpg',
    aliases: ['Paramount Plus', 'Paramount+', 'Paramount+ Essentials', 'Paramount+ Premium'],
  },
  {
    id: 'peacock',
    name: 'Peacock',
    cancelUrl: 'https://www.peacocktv.com/account',
    logoUrl: 'https://media.themoviedb.org/t/p/original/2aGrp1xw3qhwCYvNGAJZPdjfeeX.jpg',
    aliases: ['Peacock'],
  },
  {
    id: 'youtube',
    name: 'YouTubeTV',
    cancelUrl: 'https://tv.youtube.com/settings/subscriptions',
    logoUrl: 'https://media.themoviedb.org/t/p/original/x9zOHTUkQzt3PgPVKbMH9CKBwLK.jpg',
    aliases: ['YouTube', 'YouTubeTV', 'YouTube TV'],
  },
  {
    id: 'amc',
    name: 'AMC+',
    cancelUrl: 'https://www.amcplus.com/account',
    logoUrl: 'https://media.themoviedb.org/t/p/original/ovmu6uot1XVvsemM2dDySXLiX57.jpg',
    aliases: ['AMC Plus', 'AMC+'],
  },

];

/** Find a provider by display name or alias (e.g. "Max", "HBO Max", "Paramount+"). */
export function getProviderForServiceName(serviceName: string | null | undefined): StreamingProvider | null {
  if (!serviceName || typeof serviceName !== 'string') return null;
  const normalized = serviceName.trim().toLowerCase();
  if (!normalized) return null;
  return (
    STREAMING_PROVIDERS.find(
      (p) =>
        p.name.toLowerCase() === normalized ||
        p.aliases?.some((a) => a.trim().toLowerCase() === normalized)
    ) ?? null
  );
}
