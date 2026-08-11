/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@heroui/react', '@heroui/styles'],
  // Standalone output is only needed for Docker self-hosting (see Dockerfile).
  // Vercel does its own file tracing and fails on missing .nft.json files
  // when standalone output is enabled, so skip it on Vercel builds.
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
};
module.exports = nextConfig;
