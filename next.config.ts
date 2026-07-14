import path from "path";
import { execFileSync } from "node:child_process";
import type { NextConfig } from "next";

function getDeploymentId(): string {
  if (process.env.NEXT_DEPLOYMENT_ID) {
    return process.env.NEXT_DEPLOYMENT_ID;
  }

  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
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
