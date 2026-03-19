import LandingPage from "@/app/components/LandingPage";
import { getLocalKeyMomentYears } from "@/lib/localKeyMoments";

export default async function HomePage() {
  const keyMomentYears = await getLocalKeyMomentYears();

  return <LandingPage keyMomentYears={keyMomentYears} />;
}

