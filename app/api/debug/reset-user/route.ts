import { NextRequest, NextResponse } from "next/server";
import { blockDebugRouteInProduction } from "@/lib/debug-route";

// Rota desativada: recálculo de XP agora é apenas o geral (/api/admin/recalculate-all-xp)
export async function POST(_request: NextRequest) {
  const blockedResponse = blockDebugRouteInProduction();

  if (blockedResponse) {
    return blockedResponse;
  }

  return NextResponse.json(
    {
      error:
        "Rota desativada. Use /api/admin/recalculate-all-xp para recálculo geral de XP.",
    },
    { status: 410 },
  );
}
