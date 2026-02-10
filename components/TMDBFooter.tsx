import Image from 'next/image';
import Link from 'next/link';

/**
 * TMDB attribution as per their terms of use. Shown in smaller print on each page.
 * https://www.themoviedb.org/documentation/api/terms-of-use
 */
export default function TMDBFooter() {
  return (
    <footer className="mt-auto border-t border-zinc-800 bg-zinc-950 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <p className="text-xs text-zinc-500 mb-2">
          As per TMDB&apos;s terms of use, every application that uses their data or images is required to properly attribute TMDB as the source. This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
        <Link
          href="https://www.themoviedb.org"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-400 transition-colors"
        >
          <Image
            src="/tmdb-logo.svg"
            alt="TMDB"
            width={80}
            height={34}
            className="h-5 w-auto"
          />
          <span className="text-xs">themoviedb.org</span>
        </Link>
      </div>
    </footer>
  );
}
