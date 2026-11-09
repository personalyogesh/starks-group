/** @type {import('next').NextConfig} */
const legacyPortal = "/legacy-portal";

const nextConfig = {
  async redirects() {
    return [
      { source: "/login", destination: legacyPortal, permanent: false },
      { source: "/register", destination: legacyPortal, permanent: false },
      { source: "/community", destination: legacyPortal, permanent: false },
      { source: "/community/:path*", destination: legacyPortal, permanent: false },
      { source: "/dashboard", destination: legacyPortal, permanent: false },
      { source: "/create-post", destination: legacyPortal, permanent: false },
      { source: "/profile", destination: legacyPortal, permanent: false },
      { source: "/notifications", destination: legacyPortal, permanent: false },
      { source: "/settings", destination: legacyPortal, permanent: false },
      { source: "/payments", destination: legacyPortal, permanent: false },
      { source: "/videos", destination: legacyPortal, permanent: false },
      { source: "/members", destination: legacyPortal, permanent: false },
      { source: "/members/:path*", destination: legacyPortal, permanent: false },
      { source: "/events", destination: legacyPortal, permanent: false },
      { source: "/admin", destination: legacyPortal, permanent: false },
      { source: "/admin/:path*", destination: legacyPortal, permanent: false },
      { source: "/redeem", destination: legacyPortal, permanent: false },
      { source: "/redeem/:path*", destination: legacyPortal, permanent: false },
      { source: "/fixtures", destination: "/matches", permanent: true },
      { source: "/schedule", destination: "/matches", permanent: true },
      { source: "/partners", destination: "/sponsors", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/v0/b/**",
      },
      // Some Firebase Storage URLs can also come from Google Cloud Storage domains.
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/**",
      },
      // Google Auth / user avatars
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;
