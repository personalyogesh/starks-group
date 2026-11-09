import PublicSponsorsPage from "@/components/public-site/PublicSponsorsPage";
import { pageMetadata } from "@/lib/publicSiteMetadata";

export const metadata = pageMetadata(
  "Sponsors",
  "Starks Cricket sponsors and partnership information — Hashtag India Cary.",
);

export default function SponsorsPage() {
  return <PublicSponsorsPage />;
}
