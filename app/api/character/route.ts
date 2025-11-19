import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Preparar cliente supabase. Se houver Authorization, priorizar client com token (mais confiável em prod).
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const supabase = token
      ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : await createClient();

    // Obter usuário autenticado
    const {
      data: { user },
      error: authError,
    } = token ? await supabase.auth.getUser() : await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Buscar personagem do usuário
    const { data: character, error: characterError } = await supabase
      .from("characters")
      .select("id, name, class, level, current_xp, total_xp, created_at")
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
      .select("total_commits, total_prs, total_issues, baseline_commits, baseline_prs, baseline_issues")
      .eq("user_id", user.id)
      .single();

    // Mostrar apenas atividades APÓS a primeira sync (baseline)
    // baseline_commits/prs = histórico GitHub ignorado
    // total_commits/prs = total atual do GitHub
    // Diferença = atividades que geraram XP
    const commitsAfterJoin = githubStats ? (githubStats.total_commits || 0) - (githubStats.baseline_commits || 0) : 0;
    const prsAfterJoin = githubStats ? (githubStats.total_prs || 0) - (githubStats.baseline_prs || 0) : 0;
    const issuesAfterJoin = githubStats ? (githubStats.total_issues || 0) - (githubStats.baseline_issues || 0) : 0;

    // Buscar achievements do usuário (lista de códigos)
    // Comentário: join via relacionamento para obter apenas o code e evitar N+1
    const { data: achievementsRaw } = await supabase
      .from("user_achievements")
      .select("achievement:achievements(code)")
      .eq("user_id", user.id);

    const achievementCodes = (achievementsRaw || [])
      .map((r: any) => r.achievement?.code)
      .filter((c: string | undefined): c is string => Boolean(c));

    return NextResponse.json({
      data: {
        id: character.id,
        name: character.name,
        class: character.class,
        level: character.level,
        current_xp: character.current_xp,
        total_xp: character.total_xp,
        created_at: character.created_at,
        achievement_codes: achievementCodes,
        github_stats: {
          total_commits: commitsAfterJoin, // Apenas após entrar na plataforma
          total_prs: prsAfterJoin, // Apenas após entrar na plataforma
          total_issues: issuesAfterJoin, // Apenas após entrar na plataforma
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

    // Tentar obter token do header Authorization como fallback
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      await supabase.auth.setSession({
        access_token: token,
        refresh_token: "",
      });
    }

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
      baseline_commits: 0,
      baseline_prs: 0,
      baseline_issues: 0,
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
