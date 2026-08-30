import type { NextConfig } from "next";

const contentSecurityPolicy = [
  "default-src 'self'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'", "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'", "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://cdn.discordapp.com", "font-src 'self' data:", "connect-src 'self'",
  "frame-src 'self'", "worker-src 'self' blob:", "media-src 'none'", "manifest-src 'self'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source:"/:path*", headers:[
      { key:"Content-Security-Policy", value:contentSecurityPolicy },
      { key:"Referrer-Policy", value:"strict-origin-when-cross-origin" },
      { key:"X-Content-Type-Options", value:"nosniff" },
      { key:"X-Frame-Options", value:"DENY" },
      { key:"X-XSS-Protection", value:"0" },
      { key:"Permissions-Policy", value:"camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
      { key:"Cross-Origin-Opener-Policy", value:"same-origin-allow-popups" },
      { key:"Cross-Origin-Resource-Policy", value:"same-origin" },
      { key:"Origin-Agent-Cluster", value:"?1" },
    ] }];
  },
};

export default nextConfig;
