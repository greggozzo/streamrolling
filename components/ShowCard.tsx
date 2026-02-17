// components/ShowCard.tsx
import Image from 'next/image';
import Link from 'next/link';

interface Show {
  id?: number;
  tmdb_id?: number;
  name?: string;           // TV
  title?: string;          // Movie
  poster_path: string | null;
  media_type?: 'tv' | 'movie';
}

export default function ShowCard({ show, compact = false }: { show: Show; compact?: boolean }) {
  const title = show.name || show.title || 'Unknown Title';
  const type = show.media_type || 'tv';

  const posterUrl = show.poster_path
    ? `https://image.tmdb.org/t/p/${compact ? 'w185' : 'w500'}${show.poster_path}`
    : 'https://picsum.photos/id/1015/300/450';

  const id = show.id ?? show.tmdb_id;
  const href = id != null ? (type === 'movie' ? `/movie/${id}` : `/show/${id}`) : '#';

  return (
    <Link href={href} className={`group relative overflow-hidden shadow-xl block ${compact ? 'rounded-2xl' : 'rounded-3xl'}`}>
      <Image
        src={posterUrl}
        alt={title}
        width={compact ? 185 : 300}
        height={compact ? 278 : 450}
        className="w-full aspect-[2/3] object-cover group-hover:scale-110 transition-transform"
        unoptimized
      />
      <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent ${compact ? 'h-16' : 'h-24'}`} />
      <div className={compact ? 'absolute bottom-2 left-2 right-2' : 'absolute bottom-4 left-4 right-4'}>
        <p className={`font-semibold leading-tight line-clamp-2 ${compact ? 'text-sm' : 'text-lg'}`}>{title}</p>
        <p className={`text-emerald-400 mt-0.5 ${compact ? 'text-xs' : 'text-sm mt-1'}`}>See best month →</p>
      </div>
    </Link>
  );
}