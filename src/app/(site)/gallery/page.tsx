import KeyMomentsPage from "@/app/components/KeyMomentsPage";
import { getLocalKeyMomentYears } from "@/lib/localKeyMoments";
import { pageMetadata } from "@/lib/publicSiteMetadata";

export const metadata = pageMetadata(
  "Gallery",
  "Match-day memories and approved public photos from Starks Cricket.",
);

export default async function GalleryPage() {
  const yearGroups = await getLocalKeyMomentYears();
  return <KeyMomentsPage yearGroups={yearGroups} />;
}
