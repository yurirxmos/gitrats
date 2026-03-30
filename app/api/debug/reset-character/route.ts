import { NextRequest, NextResponse } from "next/server";
import { blockDebugRouteInProduction } from "@/lib/debug-route";

// Rota desativada: mudanças estruturais em personagem/stats não são mais expostas
export async function POST(_request: NextRequest) {
  const blockedResponse = blockDebugRouteInProduction();

  if (blockedResponse) {
    return blockedResponse;
  }

  return NextResponse.json(
    {
      error:
        "Rota desativada. Use apenas /api/admin/recalculate-all-xp para XP.",
    },
    { status: 410 },
  );
}
