import path from "path";
import { execFileSync } from "node:child_process";
import type { NextConfig } from "next";

function getDeploymentId(): string {
  const configuredDeploymentId = process.env.NEXT_DEPLOYMENT_ID;

  if (configuredDeploymentId) {
    return configuredDeploymentId.slice(0, 12);
  }

  try {
    return execFileSync("git", ["rev-parse", "--short=12", "HEAD"], {
      cwd: __dirname,
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

const nextConfig: NextConfig = {
  deploymentId: getDeploymentId(),
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
