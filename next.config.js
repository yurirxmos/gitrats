/** @type {import('next').NextConfig} */
const nextConfig = {
  // Manter logs no build de produção para facilitar debug em produção
  // Comentário: quando terminar o diagnóstico, voltar a remover consoles
  compiler: {
    removeConsole: false,
  },
  async headers() {
    return [
      {
        // Desabilitar cache em TODAS as páginas (temporário para debug)
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          },
          {
            key: "CDN-Cache-Control",
            value: "no-store",
          },
          {
            key: "Vercel-CDN-Cache-Control",
            value: "no-store",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
