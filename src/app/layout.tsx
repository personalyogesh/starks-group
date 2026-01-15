import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          <div style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
