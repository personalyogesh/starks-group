import Container from "@/components/ui/Container";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#EAF0FF]">
      <Container>
        <div className="py-10 md:py-16">{children}</div>
      </Container>
    </div>
  );
}

