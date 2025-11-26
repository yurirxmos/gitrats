"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Footer } from "@/components/footer";

// Componente cliente para controlar Navbar e espaçamento conforme a rota
export function FooterController() {
  const pathname = usePathname();

  if (pathname === "/" || pathname?.startsWith("/onboarding")) return null;

  return (
    <>
      <Footer />
    </>
  );
}
