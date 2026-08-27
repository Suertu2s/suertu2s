import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

const site = getSiteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/", "/afiliados/"],
    },
    sitemap: `${site}/sitemap.xml`,
  };
}
