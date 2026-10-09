import path from "path";
import type { NextConfig } from "next";

import { checkAppEnvConsistency } from "./lib/app-env";

// Gagalkan dev/build/start kalau env salah sambung (mis. sandbox ke db_production).
const envProblems = checkAppEnvConsistency();
if (envProblems.length > 0) {
  throw new Error(`Konfigurasi env tidak konsisten:\n- ${envProblems.join("\n- ")}`);
}

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: ["lightningcss"],
  // geekytech.local → hosts-file alias buat localhost, dipakai supaya Cloudflare
  // Turnstile bisa di-whitelist (widget butuh domain valid, bukan "localhost" polos).
  allowedDevOrigins: ["geekytech.local"],
  // Dev pakai `next dev --webpack` — bundler Turbopack default sering bentrok dengan lightningcss (Tailwind v4).
  webpack: (config) => {
    config.externals = [...(config.externals ?? []), "lightningcss"];
    return config;
  },
  // Header keamanan untuk semua respons. CSP sengaja tanpa script-src (GA,
  // Turnstile, dll.) — fokus anti-clickjacking, base/object injection.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=(), geolocation=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/terms", destination: "/syarat-ketentuan", permanent: true },
      { source: "/privacy", destination: "/kebijakan-privasi", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        // Google OAuth profile pictures
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        // Placeholder images untuk development (seed data)
        protocol: "https",
        hostname: "placehold.co",
      },
    ],
  },
};

export default nextConfig;
