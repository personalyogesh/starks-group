import PublicContactPage from "@/components/public-site/PublicContactPage";
import { pageMetadata } from "@/lib/publicSiteMetadata";

export const metadata = pageMetadata("Contact", "Contact Starks Cricket — email, phone and social links.");

export default function ContactPage() {
  return <PublicContactPage />;
}
