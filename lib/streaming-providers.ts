/**
 * Major streaming providers: cancel/manage links and logos.
 * Update cancelUrl for each provider to keep links current.
 * Logos: use image URL (e.g. Clearbit, or /logos/name.svg in public).
 */

export interface StreamingProvider {
  id: string;
  name: string;
  /** Official account or cancel subscription page. */
  cancelUrl: string;
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
    logoUrl: 'https://logo.clearbit.com/netflix.com',
    aliases: ['Netflix'],
  },
  {
    id: 'max',
    name: 'Max',
    cancelUrl: 'https://hbomax.com/subscription',
    logoUrl: 'https://www.flaticon.com/free-icon/hbo_5968611?term=hbo&page=1&position=1&origin=search&related_id=5968611',
    aliases: ['HBO Max', 'Max'],
  },
  {
    id: 'disney-plus',
    name: 'Disney+',
    cancelUrl: 'https://www.disneyplus.com/account',
    logoUrl: 'https://logo.clearbit.com/disneyplus.com',
    aliases: ['Disney Plus', 'Disney+'],
  },
  {
    id: 'amazon',
    name: 'Prime Video',
    cancelUrl: 'https://www.amazon.com/amazonprime',
    logoUrl: 'https://logo.clearbit.com/primevideo.com',
    aliases: ['Amazon Prime Video', 'Prime Video', 'Amazon'],
  },
  {
    id: 'apple-tv',
    name: 'Apple TV+',
    cancelUrl: 'https://tv.apple.com/account',
    logoUrl: 'https://logo.clearbit.com/apple.com',
    aliases: ['Apple TV Plus', 'Apple TV+'],
  },
  {
    id: 'hulu',
    name: 'Hulu',
    cancelUrl: 'https://www.hulu.com/account',
    logoUrl: 'https://logo.clearbit.com/hulu.com',
    aliases: ['Hulu'],
  },
  {
    id: 'paramount',
    name: 'Paramount+',
    cancelUrl: 'https://www.paramountplus.com/account/',
    logoUrl: 'https://logo.clearbit.com/paramountplus.com',
    aliases: ['Paramount Plus', 'Paramount+'],
  },
  {
    id: 'peacock',
    name: 'Peacock',
    cancelUrl: 'https://www.peacocktv.com/account',
    logoUrl: 'https://logo.clearbit.com/peacocktv.com',
    aliases: ['Peacock'],
  },
  {
    id: 'espn',
    name: 'ESPN+',
    cancelUrl: 'https://www.espn.com/espnplus/',
    logoUrl: 'https://logo.clearbit.com/espn.com',
    aliases: ['ESPN Plus', 'ESPN+'],
  },
];
