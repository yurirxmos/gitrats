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
        source: "/:path(configs|docs|leaderboard|reports)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, must-revalidate",
          },
          {
            key: "CDN-Cache-Control",
            value: "no-store",
          },
          {
            key: "Vercel-CDN-Cache-Control",
            value: "no-store",
          },
        ],
      },
      {
        // Desabilitar cache para páginas de erro e rotas especiais
        source: "/:path(404|500|_error|_not-found)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
