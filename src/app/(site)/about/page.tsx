import PublicAboutPage from "@/components/public-site/PublicAboutPage";
import { pageMetadata } from "@/lib/publicSiteMetadata";

export const metadata = pageMetadata(
  "About",
  "Learn about Starks Cricket — community cricket in the Triangle, NC since 2018.",
);

export default function AboutPage() {
  return <PublicAboutPage />;
}
