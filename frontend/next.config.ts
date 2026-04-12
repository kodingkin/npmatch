/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@heroui/react', '@heroui/styles'],
  output: "standalone",
}; 
module.exports = nextConfig;
