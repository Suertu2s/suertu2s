import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

const site = getSiteUrl();

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/sorteos-activos",
    "/checkout",
    "/check-tickets",
    "/bases-legales",
    "/privacidad",
    "/afiliados",
  ];

  return routes.map((path) => ({
    url: `${site}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
