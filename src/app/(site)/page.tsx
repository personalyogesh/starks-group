import PublicHomePage from "@/components/public-site/PublicHomePage";
import { getLocalKeyMomentYears } from "@/lib/localKeyMoments";

export default async function HomePage() {
  const keyMomentYears = await getLocalKeyMomentYears();
  return <PublicHomePage keyMomentYears={keyMomentYears} />;
}
