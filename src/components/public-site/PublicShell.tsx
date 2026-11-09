import PublicFooter from "@/components/public-site/PublicFooter";
import PublicNavbar from "@/components/public-site/PublicNavbar";

export default function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-brand-bg text-slate-900 bg-stadium-glow dark:bg-[#0b1220] dark:text-slate-100">
      <PublicNavbar />
      <main className="flex-1 w-full">{children}</main>
      <PublicFooter />
    </div>
  );
}
