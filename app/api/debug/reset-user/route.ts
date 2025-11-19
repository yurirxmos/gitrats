import { NextRequest, NextResponse } from "next/server";

// Rota desativada: recálculo de XP agora é apenas o geral (/api/admin/recalculate-all-xp)
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error: "Rota desativada. Use /api/admin/recalculate-all-xp para recálculo geral de XP.",
    },
    { status: 410 }
  );
}
