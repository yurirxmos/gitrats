"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navbar";

// Componente cliente para controlar Navbar e espaçamento conforme a rota
export function RouteAwareHeader() {
  const pathname = usePathname();
  const isOnboarding = pathname?.startsWith("/onboarding");
  const isHome = pathname === "/home";

  if (isOnboarding) return null;

  return (
    <>
      <Navbar />
      {!isHome && <div className="pt-15" />}
    </>
  );
}
