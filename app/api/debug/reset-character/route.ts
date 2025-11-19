import { NextRequest, NextResponse } from "next/server";

// Rota desativada: mudanças estruturais em personagem/stats não são mais expostas
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    { error: "Rota desativada. Use apenas /api/admin/recalculate-all-xp para XP." },
    { status: 410 }
  );
}
