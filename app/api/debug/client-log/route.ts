import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    console.error("[CLIENT_LOG]", payload);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[CLIENT_LOG] Error parsing payload", e);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
