/** @type {import('next').NextConfig} */
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  images: {
    // Citizen-uploaded evidence is served by the FastAPI backend.
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "8000", pathname: "/static/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "8000", pathname: "/static/**" },
      ...(apiUrl.startsWith("https")
        ? [{ protocol: "https", hostname: new URL(apiUrl).hostname, pathname: "/static/**" }]
        : []),
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            // Geolocation is required for citizen reporting; nothing else is.
            value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
