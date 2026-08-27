import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

const site = getSiteUrl();

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/sorteos-activos",
    "/check-tickets",
    "/bases-legales",
    "/privacidad",
  ];

  const builtAt = new Date();

  return routes.map((path) => ({
    url: `${site}${path}`,
    lastModified: builtAt,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
