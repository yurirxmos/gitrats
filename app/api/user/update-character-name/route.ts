import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name || name.length === 0) {
      return NextResponse.json({ error: "Nome inválido" }, { status: 400 });
    }

    if (name.length > 32) {
      return NextResponse.json({ error: "Nome muito longo (máx 32 caracteres)" }, { status: 400 });
    }

    // Preferir client com token quando presente
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const supabase = token
      ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : await createClient();

    // Recuperar usuário autenticado
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Buscar character do usuário
    const { data: chars, error: charErr } = await supabase
      .from("characters")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    if (charErr) {
      console.error("Erro ao buscar personagem:", charErr);
      return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }

    const character = Array.isArray(chars) && chars.length > 0 ? chars[0] : null;

    if (!character) {
      return NextResponse.json({ error: "Usuário não tem personagem" }, { status: 400 });
    }

    // Verificar cooldown: tentar ler `last_name_change_at` na tabela `users`.
    try {
      const { data: userRow, error: userRowErr } = await supabase
        .from("users")
        .select("last_name_change_at")
        .eq("id", user.id)
        .single();

      if (!userRowErr && userRow && userRow.last_name_change_at) {
        const lastChange = new Date(userRow.last_name_change_at).getTime();
        const now = Date.now();
        const weekMs = 7 * 24 * 60 * 60 * 1000;
        const diff = now - lastChange;

        if (diff < weekMs) {
          const remaining = weekMs - diff;
          const hours = Math.floor(remaining / (1000 * 60 * 60));
          const days = Math.floor(hours / 24);
          const hrs = hours % 24;
          const human = days > 0 ? `${days} dia(s) e ${hrs} hora(s)` : `${hrs} hora(s)`;

          return NextResponse.json(
            { error: `Cooldown: você só pode trocar o nome 1 vez por semana. Tente novamente em ${human}.` },
            { status: 429 }
          );
        }
      }
    } catch (e) {
      // Possível que a coluna `last_name_change_at` não exista — não bloquear a operação,
      // mas logar para investigação. Sem a coluna, não aplicamos cooldown no servidor.
      console.warn("Não foi possível verificar cooldown de nome (coluna possivelmente ausente):", e);
    }

    const { data: updated, error: updateErr } = await supabase
      .from("characters")
      .update({ name })
      .eq("id", character.id)
      .select()
      .single();

    if (updateErr) {
      console.error("Erro ao atualizar personagem:", updateErr);
      return NextResponse.json({ error: "Falha ao atualizar" }, { status: 500 });
    }

    // Tentar atualizar a coluna de cooldown em `users` (se existir). Não falhar se der erro.
    try {
      await supabase.from("users").update({ last_name_change_at: new Date().toISOString() }).eq("id", user.id);
    } catch (e) {
      console.warn("Não foi possível gravar last_name_change_at em users:", e);
    }

    return NextResponse.json({ success: true, character: updated });
  } catch (error) {
    console.error("[update-character-name] error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
