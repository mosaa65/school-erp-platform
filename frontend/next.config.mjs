/** @type {import('next').NextConfig} */
const backendApiUrl = (process.env.BACKEND_API_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
);

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${backendApiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
