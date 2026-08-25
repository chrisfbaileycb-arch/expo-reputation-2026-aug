
-- Track source-side review IDs for dedup across polled platforms
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS source_review_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS reviews_platform_location_source_uidx
  ON public.reviews (platform, location_id, source_review_id)
  WHERE source_review_id IS NOT NULL;

-- Track per-location poll cadence per source
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS yelp_last_polled_at TIMESTAMPTZ;
