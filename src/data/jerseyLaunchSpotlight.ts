/**
 * Starks 2026 Jersey Launch — homepage spotlight copy.
 * Default link: official Facebook post/event share for the jersey launch.
 * Override with NEXT_PUBLIC_STARKS_JERSEY_LAUNCH_FB_URL if the URL changes.
 */
export const JERSEY_LAUNCH_FACEBOOK_DEFAULT =
  "https://www.facebook.com/share/p/1DV4UqHAZm/";

export const JERSEY_LAUNCH_YEAR = 2026;

export const JERSEY_LAUNCH_VENUE = "Hashtag India";

export const JERSEY_LAUNCH_LOCATION = "Cary, NC";

export const JERSEY_LAUNCH_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=Hashtag+India+Cary+NC";

export function getJerseyLaunchFacebookEventUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_STARKS_JERSEY_LAUNCH_FB_URL?.trim();
  return fromEnv || JERSEY_LAUNCH_FACEBOOK_DEFAULT;
}
