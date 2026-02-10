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
    cancelUrl: 'https://https://www.amcplus.com/account',
    logoUrl: 'https://media.themoviedb.org/t/p/original/ovmu6uot1XVvsemM2dDySXLiX57.jpg',
    aliases: ['Peacock'],
  },

];
