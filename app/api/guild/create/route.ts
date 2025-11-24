import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_GUILD_MEMBERS = 20;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { name, description, tag } = await req.json();

    if (!name || name.trim().length < 3) {
      return NextResponse.json({ error: "Nome da guilda deve ter no mínimo 3 caracteres" }, { status: 400 });
    }

    if (tag && tag.length > 6) {
      return NextResponse.json({ error: "Tag deve ter no máximo 6 caracteres" }, { status: 400 });
    }

    // Verificar se usuário já está em uma guilda
    const { data: existingMembership } = await supabase
      .from("guild_members")
      .select("guild_id")
      .eq("user_id", user.id)
      .single();

    if (existingMembership) {
      return NextResponse.json({ error: "Você já está em uma guilda" }, { status: 400 });
    }

    // Buscar dados do usuário
    const { data: userData } = await supabase.from("users").select("total_xp").eq("id", user.id).single();

    // Criar guilda
    const { data: guild, error: guildError } = await supabase
      .from("guilds")
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        tag: tag?.trim().toUpperCase() || null,
        owner_id: user.id,
        total_xp: userData?.total_xp || 0,
        total_members: 1,
      })
      .select()
      .single();

    if (guildError) {
      console.error("Erro ao criar guilda:", guildError);
      if (guildError.code === "23505") {
        return NextResponse.json({ error: "Nome ou tag já em uso" }, { status: 400 });
      }
      throw guildError;
    }

    if (!guild) {
      return NextResponse.json({ error: "Erro ao criar guilda - dados não retornados" }, { status: 500 });
    }

    // Adicionar criador como owner
    const { error: memberError } = await supabase.from("guild_members").insert({
      guild_id: guild.id,
      user_id: user.id,
      role: "owner",
    });

    if (memberError) {
      console.error("Erro ao adicionar membro:", memberError);
      // Tentar deletar a guilda se falhar ao adicionar membro
      await supabase.from("guilds").delete().eq("id", guild.id);
      throw memberError;
    }

    return NextResponse.json({
      message: "Guilda criada com sucesso",
      guild,
    });
  } catch (error) {
    console.error("Erro ao criar guilda:", error);
    return NextResponse.json({ error: "Erro ao criar guilda" }, { status: 500 });
  }
}
