import { NextRequest, NextResponse } from "next/server";
import { getResendClient } from "@/lib/resend-client";

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html, from = "GitRats <contact@rxmos.dev.br>" } = await request.json();

    if (!to || !subject || !html) {
      return NextResponse.json({ error: "Campos obrigatórios: to, subject, html" }, { status: 400 });
    }

    const resendClient = getResendClient();
    const { data, error } = await resendClient.emails.send({
      from,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("Erro ao enviar e-mail:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error("Erro no endpoint de envio de e-mail:", error);
    return NextResponse.json({ error: "Erro interno ao enviar e-mail" }, { status: 500 });
  }
}
