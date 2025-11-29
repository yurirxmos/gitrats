import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-config";

const routes = ["/", "/leaderboard", "/docs", "/reports"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.map((route) => ({
    url: absoluteUrl(route),
    lastModified,
    changeFrequency: route === "/" ? "daily" : "weekly",
    priority: route === "/" ? 1 : 0.8,
  }));
}
