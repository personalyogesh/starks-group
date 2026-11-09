import PublicShell from "@/components/public-site/PublicShell";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
