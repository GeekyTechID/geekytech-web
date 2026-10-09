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
