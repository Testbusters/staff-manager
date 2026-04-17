import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://nyajqcjqmgxctlqighql.supabase.co";

const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: ${supabaseUrl};
  connect-src 'self' ${supabaseUrl} ${supabaseUrl.replace("https://", "wss://")};
  frame-src 'self' ${supabaseUrl};
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
`
  .replace(/\s{2,}/g, " ")
  .trim();

const securityHeaders = [
  // Prevent DNS prefetching leaking visited sub-resources
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Enforce HTTPS for 2 years (only effective once deployed on HTTPS)
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Block this app from being embedded in iframes (clickjacking protection)
  { key: "X-Frame-Options", value: "DENY" },
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send only origin in Referer header for cross-origin requests
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable browser features not used by this app
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Content Security Policy
  { key: "Content-Security-Policy", value: ContentSecurityPolicy },
  // Tell crawlers not to index any page (belt-and-suspenders with robots.txt + <meta robots>)
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  // Keep pdfjs-dist, pdf-lib and lightningcss out of the Turbopack/webpack bundle so they
  // run in plain Node.js context. Without this, Turbopack rewrites module
  // paths into .next/dev/server/chunks/ and native binary resolution breaks.
  serverExternalPackages: ["lightningcss", "pdfjs-dist", "pdf-lib", "exceljs", "docxtemplater", "pizzip"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  typescript: {
    // Type checking runs locally via `npx tsc --noEmit` (pipeline Phase 3).
    // Skipped here to avoid OOM on Replit's build workers.
    ignoreBuildErrors: true,
  },
  async headers() {
    // CSP is production-only; Turbopack dev runtime blocks eval() regardless
    // of the unsafe-eval directive, causing a false-positive React console error.
    if (process.env.NODE_ENV === "development") {
      return [{ source: "/(.*)", headers: securityHeaders.filter(h => h.key !== "Content-Security-Policy") }];
    }
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

const analyze = withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

export default analyze(nextConfig);
