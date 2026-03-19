import KeyMomentsPage from "@/app/components/KeyMomentsPage";
import { getLocalKeyMomentYears } from "@/lib/localKeyMoments";

export default async function GalleryPage() {
  const yearGroups = await getLocalKeyMomentYears();
  return <KeyMomentsPage yearGroups={yearGroups} />;
}
