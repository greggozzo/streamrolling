-- Run this in Supabase SQL editor to add sort order for dashboard show ordering.
-- Then use POST /api/shows-order with body { order: number[] } (tmdb_ids in desired order).

ALTER TABLE public.user_shows
ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.user_shows.sort_order IS 'Display order on dashboard; lower = first. Updated when user drag-and-drops.';
