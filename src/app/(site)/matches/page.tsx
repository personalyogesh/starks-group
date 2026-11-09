import PublicMatchesPage from "@/components/public-site/PublicMatchesPage";
import { pageMetadata } from "@/lib/publicSiteMetadata";

export const metadata = pageMetadata(
  "Matches",
  "Upcoming fixtures and verified results for Starks Cricket Mega Smash 2026.",
);

export default function MatchesPage() {
  return <PublicMatchesPage />;
}
