import type { Metadata } from "next";
import { Kode_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/contexts/theme-context";
import { QueryProvider } from "@/contexts/query-provider";
import { UserProvider } from "@/contexts/user-context";
import { Header } from "@/components/layout-controller/header-controller";
import { FooterController } from "@/components/layout-controller/footer-controller";
import { SITE_URL } from "@/lib/site-config";

const kodeMono = Kode_Mono({ subsets: ["latin"], variable: "--font-kode-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "GitRats",
  description: "Transforme seus commits e pull requests em XP. Crie seu personagem e domine o leaderboard.",
  applicationName: "GitRats",
  keywords: ["gitrats", "git leaderboard", "gamificação git", "commits", "pull requests", "github"],
  alternates: { canonical: SITE_URL },
  // Open Graph padrão
  openGraph: {
    title: "GitRats",
    description: "Transforme seus commits e pull requests em XP. Crie seu personagem e domine o leaderboard.",
    url: SITE_URL,
    siteName: "GitRats",
    // imagem social default (coloque um arquivo em /public/og-image.png ou ajuste)
    images: [{ url: `${SITE_URL}/og-image.png`, width: 802, height: 877, alt: "GitRats" }],
    locale: "pt_BR",
    type: "website",
  },
  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "GitRats",
    description: "Transforme seus commits e pull requests em XP.",
    images: [`${SITE_URL}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  // Controle para robôs (padrão) — robots meta será gerado automaticamente no build.
  // Favicon e ícones simples
  icons: {
    // usar o favicon que existe em /public (favicon.png)
    icon: "/favicon.png",
    shortcut: "/favicon.png",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "GitRats",
  url: SITE_URL,
  logo: `${SITE_URL}/og-image.png`,
  sameAs: [
    "https://github.com/yuriramosdasilva/gitrats",
  ],
};

// Removido uso de window para evitar mismatch de hidratação

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={kodeMono.variable}
    >
      <head>
        {/* Script para aplicar tema baseado em localStorage */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') || 'dark';
                document.documentElement.classList.toggle('dark', theme === 'dark');
                
                // Limpar service workers antigos (force refresh)
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    for(let registration of registrations) {
                      registration.unregister();
                    }
                  });
                }
              } catch (e) {}
            `,
          }}
        />

        {/* JSON-LD: structured data para SEO 
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body>
        <ThemeProvider>
          <QueryProvider>
            <UserProvider>
              {/* Componente cliente para controlar Navbar e espaçamento conforme a rota */}
              <Header />

              {/* Conteúdo da página */}
              {children}

              {/* Componente cliente para controlar Footer e espaçamento conforme a rota */}
              <FooterController />
            </UserProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
