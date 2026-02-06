// components/ShowCard.tsx
import Image from 'next/image';
import Link from 'next/link';

interface Show {
  id: number;
  name?: string;           // TV
  title?: string;          // Movie
  poster_path: string | null;
  media_type?: 'tv' | 'movie';
}

export default function ShowCard({ show }: { show: Show }) {
  const title = show.name || show.title || 'Unknown Title';
  const type = show.media_type || 'tv';

  const posterUrl = show.poster_path
    ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
    : 'https://picsum.photos/id/1015/300/450';

  const href = type === 'movie' ? `/movie/${show.id}` : `/show/${show.id}`;

  return (
    <Link href={href} className="group relative overflow-hidden rounded-3xl shadow-xl">
      <Image
        src={posterUrl}
        alt={title}
        width={300}
        height={450}
        className="w-full aspect-[2/3] object-cover group-hover:scale-110 transition-transform"
        unoptimized
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent h-24" />
      <div className="absolute bottom-4 left-4 right-4">
        <p className="font-semibold text-lg leading-tight line-clamp-2">{title}</p>
        <p className="text-emerald-400 text-sm mt-1">See best month →</p>
      </div>
    </Link>
  );
}