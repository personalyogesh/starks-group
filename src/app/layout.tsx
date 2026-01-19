import "./globals.css";
import { ThemeProvider } from "@/app/components/ThemeProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="color-scheme" content="light dark" />
        <script
          // Apply theme before React hydration to avoid iOS “invisible text” flashes.
          dangerouslySetInnerHTML={{
            __html: `
(() => {
  try {
    const key = "starks:theme";
    const mode = localStorage.getItem(key) || "system";
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = mode === "system" ? (prefersDark ? "dark" : "light") : mode;
    if (resolved === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  } catch {}
})();`.trim(),
          }}
        />
      </head>
      <body className="min-h-screen">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
