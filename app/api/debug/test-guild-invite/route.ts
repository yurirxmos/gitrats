import { NextRequest, NextResponse } from "next/server";
import { EmailService } from "@/lib/email-service";

/**
 * Endpoint de debug para envio de convite de guilda SEM mock.
 * PORQUÊ: força o caller a fornecer dados reais, evita hardcode.
 * Uso:
 * POST /api/debug/test-guild-invite
 * {
 *   "email": "destino@exemplo.com",
 *   "invitedUsername": "yurirxmos",
 *   "guildName": "Rats Elite",
 *   "guildTag": "RATS",
 *   "inviterUsername": "ownerUser",
 *   "inviteId": "invite-uuid"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Body inválido" }, { status: 400 });
    }

    const {
      email,
      invitedUsername,
      guildName,
      guildTag,
      inviterUsername,
      inviteId,
    }: {
      email?: string;
      invitedUsername?: string;
      guildName?: string;
      guildTag?: string;
      inviterUsername?: string;
      inviteId?: string;
    } = body;

    // Validação mínima (explica o porquê: garante que template gere info correta)
    if (!email || !invitedUsername || !guildName || !guildTag || !inviterUsername || !inviteId) {
      return NextResponse.json(
        { error: "Campos obrigatórios: email, invitedUsername, guildName, guildTag, inviterUsername, inviteId" },
        { status: 400 }
      );
    }

    const sendResult = await EmailService.sendGuildInviteEmail(
      email,
      invitedUsername,
      guildName,
      guildTag,
      inviterUsername,
      inviteId
    );

    return NextResponse.json({
      success: true,
      to: email,
      guild: { name: guildName, tag: guildTag },
      invite_id: inviteId,
      resend: sendResult.data,
    });
  } catch (e) {
    console.error("Erro envio convite debug sem mock:", e);
    return NextResponse.json({ error: "Falha ao enviar convite" }, { status: 500 });
  }
}
