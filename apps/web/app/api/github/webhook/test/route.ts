import { NextRequest, NextResponse } from "next/server";

/**
 * Endpoint de teste para verificar se o webhook está funcionando
 * Acesse: /api/github/webhook/test
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: "ok",
    message: "Webhook endpoint está funcionando!",
    timestamp: new Date().toISOString(),
    instructions: {
      step1: "Configure o webhook no GitHub",
      step2: "URL: https://seu-dominio.vercel.app/api/github/webhook",
      step3: "Events: push, pull_request, issues, star, fork",
      step4: "Faça um commit para testar",
    },
    endpoints: {
      webhook: "/api/github/webhook (POST)",
      test: "/api/github/webhook/test (GET - você está aqui)",
    },
  });
}

/**
 * Endpoint de teste com payload simulado
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    return NextResponse.json({
      status: "received",
      message: "Payload de teste recebido!",
      receivedData: body,
      note: "Este é apenas um endpoint de teste. Use /api/github/webhook para o webhook real.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: "Erro ao processar payload",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 }
    );
  }
}
