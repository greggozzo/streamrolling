/**
 * Build path for track-and-redirect API. Use for cancel/subscribe links so we log the click.
 */
export function getTrackAndRedirectPath(
  targetUrl: string,
  options: { type: 'cancel' | 'subscribe'; service: string }
): string {
  const params = new URLSearchParams({
    to: targetUrl,
    type: options.type,
    service: options.service,
  });
  return `/api/track-and-redirect?${params.toString()}`;
}
