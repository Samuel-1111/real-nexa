import type { MetadataRoute } from "next";

// PWA install configuration for browser and Android app surfaces.\nexport default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NEXA — Your Personal Assistant",
    short_name: "NEXA",
    description: "Organize. Plan. Achieve.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#020817",
    theme_color: "#020817",
    orientation: "portrait-primary",
    categories: ["productivity", "utilities", "lifestyle"],
    prefer_related_applications: false,
    icons: [
      { src: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml", purpose: "maskable" },
      { src: "/icon-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" }
    ]
  };
}
