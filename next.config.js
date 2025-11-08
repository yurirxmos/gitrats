/** @type {import('next').NextConfig} */
const nextConfig = {
  removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
};

export default nextConfig;
