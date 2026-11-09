import type { MetadataRoute } from "next";

import { PUBLIC_SITE } from "@/content/publicSite";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [],
    },
    sitemap: `${PUBLIC_SITE.siteUrl}/sitemap.xml`,
  };
}
