import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Staff Manager",
    short_name: "Staff",
    description:
      "Portale interno per la gestione di collaboratori, compensi, rimborsi e documenti di Testbusters e Peer4Med.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#FE3200",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
    ],
  };
}
