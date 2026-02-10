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
    logoUrl: 'https://images.ctfassets.net/y2ske730sjqp/1aONibCke6niZhgPxuiilC/2c401b05a07288746ddf3bd3943fbc76/BrandAssets_Logos_01-Wordmark.jpg?w=940',
    aliases: ['Netflix'],
  },
  {
    id: 'max',
    name: 'HBO',
    cancelUrl: 'https://hbomax.com/subscription',
    logoUrl: 'https://hbomax.com/hbo-max-logo.6a0ffd17390eb01cb22124ab4185b23a.sha.png?h=30&f=webp',
    aliases: ['HBO Max', 'Max'],
  },
  {
    id: 'disney-plus',
    name: 'Disney+',
    cancelUrl: 'https://www.disneyplus.com/account',
    logoUrl: 'https://lumiere-a.akamaihd.net/v1/images/disney_logo_march_2024_050fef2e.png?region=0%2C0%2C1920%2C1080',
    aliases: ['Disney Plus', 'Disney+'],
  },
  {
    id: 'amazon',
    name: 'Prime Video',
    cancelUrl: 'https://www.amazon.com/amazonprime',
    logoUrl: 'https://assets.aboutamazon.com/dims4/default/01a6d9c/2147483647/strip/true/crop/1041x317+0+0/resize/709x216!/format/webp/quality/90/?url=https%3A%2F%2Famazon-blogs-brightspot.s3.amazonaws.com%2F26%2Fc7%2F11fb9c044d14870a3154c90d9bf5%2Fprime-video-landscape-logo-blue-rgb.png',
    aliases: ['Amazon Prime Video', 'Prime Video', 'Amazon'],
  },
  {
    id: 'apple-tv',
    name: 'Apple TV+',
    cancelUrl: 'https://tv.apple.com/account',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/ae/Apple_TV_%28logo%29.svg/960px-Apple_TV_%28logo%29.svg.png?20221018175008',
    aliases: ['Apple TV Plus', 'Apple TV+'],
  },
  {
    id: 'hulu',
    name: 'Hulu',
    cancelUrl: 'https://www.hulu.com/account',
    logoUrl: 'https://greenhouse.hulu.com/app/uploads/sites/12/2023/10/logo-gradient-3up.svg',
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
