import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Obter usuário autenticado
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Buscar personagem do usuário
    const { data: character, error: characterError } = await supabase
      .from("characters")
      .select("id, name, class, level, current_xp, total_xp")
      .eq("user_id", user.id)
      .single();

    if (characterError) {
      if (characterError.code === "PGRST116") {
        return NextResponse.json({ error: "Personagem não encontrado" }, { status: 404 });
      }
      console.error("Erro ao buscar personagem:", characterError);
      return NextResponse.json({ error: characterError.message }, { status: 500 });
    }

    // Buscar estatísticas do GitHub separadamente
    const { data: githubStats } = await supabase
      .from("github_stats")
      .select("total_commits, total_prs, baseline_commits, baseline_prs")
      .eq("user_id", user.id)
      .single();

    // Mostrar apenas atividades APÓS a primeira sync (baseline)
    // baseline_commits/prs = histórico GitHub ignorado
    // total_commits/prs = total atual do GitHub
    // Diferença = atividades que geraram XP
    const commitsAfterJoin = githubStats ? (githubStats.total_commits || 0) - (githubStats.baseline_commits || 0) : 0;
    const prsAfterJoin = githubStats ? (githubStats.total_prs || 0) - (githubStats.baseline_prs || 0) : 0;

    return NextResponse.json({
      data: {
        id: character.id,
        name: character.name,
        class: character.class,
        level: character.level,
        current_xp: character.current_xp,
        total_xp: character.total_xp,
        github_stats: {
          total_commits: commitsAfterJoin, // Apenas após entrar na plataforma
          total_prs: prsAfterJoin, // Apenas após entrar na plataforma
        },
      },
    });
  } catch (error) {
    console.error("Erro no endpoint character:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Obter usuário autenticado
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { name, characterClass } = body;

    if (!name || !characterClass) {
      return NextResponse.json({ error: "Nome e classe são obrigatórios" }, { status: 400 });
    }

    // Verificar se já existe um personagem para este usuário
    const { data: existingCharacter } = await supabase.from("characters").select("id").eq("user_id", user.id).single();

    if (existingCharacter) {
      return NextResponse.json({ error: "Você já possui um personagem" }, { status: 400 });
    }

    // Criar personagem
    const { data: character, error: createError } = await supabase
      .from("characters")
      .insert({
        user_id: user.id,
        name,
        class: characterClass,
        level: 1,
        current_xp: 0,
        total_xp: 0,
      })
      .select()
      .single();

    if (createError) {
      console.error("Erro ao criar personagem:", createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    // Criar registro de estatísticas do GitHub (sem last_sync_at para marcar como "nunca sincronizado")
    const { error: statsError } = await supabase.from("github_stats").insert({
      user_id: user.id,
      total_commits: 0,
      total_prs: 0,
      total_issues: 0,
      total_reviews: 0,
      last_sync_at: null, // Marca que nunca foi sincronizado
    });

    if (statsError) {
      console.error("Erro ao criar stats do GitHub:", statsError);
      // Não retornar erro aqui, pois o personagem já foi criado
    }

    return NextResponse.json({
      data: character,
    });
  } catch (error) {
    console.error("Erro no endpoint character POST:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
