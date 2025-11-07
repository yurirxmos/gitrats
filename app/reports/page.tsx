"use client";

import { Navbar } from "@/components/navbar";

export default function Reports() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto px-8 py-12 w-full">
        <h1 className="text-3xl font-bold mb-6">Reports</h1>
        <p>Página dedicada a desenvolvedores que ajudaram/reportaram bugs no Gitrats.</p>
      </main>
    </div>
  );
}
