import Container from "@/components/ui/Container";
import { AuthProvider } from "@/lib/AuthContext";
import { ToastProvider } from "@/components/ui/ToastProvider";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <div className="min-h-screen bg-[#EAF0FF]">
          <Container>
            <div className="py-10 md:py-16">{children}</div>
          </Container>
        </div>
      </ToastProvider>
    </AuthProvider>
  );
}

