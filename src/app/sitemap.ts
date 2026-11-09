import type { MetadataRoute } from "next";

import { PUBLIC_SITE, PUBLIC_NAV } from "@/content/publicSite";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const routes = [
    ...PUBLIC_NAV.map((item) => item.href),
    "/privacy",
    "/terms",
    "/cookies",
  ];

  return routes.map((path) => ({
    url: `${PUBLIC_SITE.siteUrl}${path === "/" ? "" : path}`,
    lastModified,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
