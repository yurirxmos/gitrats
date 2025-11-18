import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/contexts/theme-context";
import { UserProvider } from "@/contexts/user-context";
import Script from "next/script";

// Base URL do site - altere usando a variável de ambiente NEXT_PUBLIC_SITE_URL em produção
const siteUrl = "https://gitrats.rxmos.dev.br";

export const metadata: Metadata = {
  title: "GitRats",
  description: "Transforme seus commits e pull requests em XP. Crie seu personagem e domine o leaderboard.",
  // Open Graph padrão
  openGraph: {
    title: "GitRats",
    description: "Transforme seus commits e pull requests em XP. Crie seu personagem e domine o leaderboard.",
    url: siteUrl,
    siteName: "GitRats",
    images: [{ url: `${siteUrl}/og-image.png`, width: 802, height: 877, alt: "GitRats" }],
    locale: "pt_BR",
    type: "website",
  },
  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "GitRats",
    description: "Transforme seus commits e pull requests em XP.",
    images: [`${siteUrl}/og-image.png`],
  },
  // Favicon e ícones
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

// Dados estruturados JSON-LD para melhor compatibilidade com rich results
const structuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "GitRats",
  url: siteUrl,
  logo: `${siteUrl}/og-image.png`,
  sameAs: [
    // Adicione links sociais aqui se houver
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
    >
      <head>
        {/* Script para aplicar tema baseado em localStorage */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') || 'dark';
                document.documentElement.classList.toggle('dark', theme === 'dark');
              } catch (e) {}
            `,
          }}
        />

        {/* Google Analytics apenas em produção para não afetar dev */}
        {process.env.NODE_ENV === "production" && (
          <>
            <Script
              src="https://www.googletagmanager.com/gtag/js?id=G-0PLVQ46WZH"
              strategy="afterInteractive"
            />
            <Script
              id="google-analytics"
              strategy="afterInteractive"
            >
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);} 
                gtag('js', new Date());
                gtag('config', 'G-0PLVQ46WZH');
              `}
            </Script>
          </>
        )}

        {/* JSON-LD: structured data para SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body>
        <ThemeProvider>
          <UserProvider>{children}</UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
