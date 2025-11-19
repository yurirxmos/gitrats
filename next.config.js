/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use o objeto `compiler.removeConsole` para que o SWC remova `console.*` no build de produção
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },
};

export default nextConfig;
