import LegacyPortalRetiredPage from "@/components/public-site/LegacyPortalRetiredPage";
import { pageMetadata } from "@/lib/publicSiteMetadata";

export const metadata = {
  ...pageMetadata(
    "Member portal",
    "The previous Starks member portal has been retired. Public club information lives on the main site.",
  ),
  robots: { index: false, follow: true },
};

export default function LegacyPortalPage() {
  return <LegacyPortalRetiredPage />;
}
