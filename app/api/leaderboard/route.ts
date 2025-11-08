import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    const supabase = await createClient();

    // Buscar personagens ordenados por XP
    const { data: characters, error: charactersError } = await supabase
      .from("characters")
      .select("id, user_id, name, class, level, total_xp")
      .order("total_xp", { ascending: false })
      .limit(limit);

    if (charactersError) {
      console.error("Erro ao buscar personagens:", charactersError);
      return NextResponse.json({ error: charactersError.message }, { status: 500 });
    }

    if (!characters || characters.length === 0) {
      return NextResponse.json({
        data: [],
        lastUpdate: new Date().toISOString(),
      });
    }

    // Buscar dados dos usuários
    const userIds = characters.map((c) => c.user_id);
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, github_username, github_avatar_url")
      .in("id", userIds);

    if (usersError) {
      console.error("Erro ao buscar usuários:", usersError);
    }

    // Buscar estatísticas do GitHub
    const { data: githubStats, error: statsError } = await supabase
      .from("github_stats")
      .select("user_id, total_commits, total_prs, total_issues, baseline_commits, baseline_prs, baseline_issues")
      .in("user_id", userIds);
    // Buscar achievements dos usuários (lista de códigos) - uma única batida
    // Nota: user_achievements possui RLS que restringe leitura ao próprio usuário.
    // Para exibir badges no leaderboard precisamos da lista completa — usar o
    // cliente admin (service_role) apenas para esta query (somente códigos públicos).
    let achievementsRaw: any[] | null = null;
    try {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("user_achievements")
        .select("user_id, achievement:achievements(code)")
        .in("user_id", userIds);

      if (error) {
        console.error("Erro ao buscar achievements com admin client:", error);
      }

      achievementsRaw = data || [];
    } catch (err) {
      console.error("Erro ao inicializar admin client para achievements:", err);
      // Fallback: tentar via client padrão (poderá retornar apenas achievements do usuário logado)
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("user_achievements")
        .select("user_id, achievement:achievements(code)")
        .in("user_id", userIds);

      if (fallbackError) console.error("Fallback achievements error:", fallbackError);
      achievementsRaw = fallbackData || [];
    }

    // Mapear codes por user_id
    const achievementsMap = new Map<string, string[]>();
    achievementsRaw?.forEach((row: any) => {
      const arr = achievementsMap.get(row.user_id) || [];
      if (row.achievement?.code) arr.push(row.achievement.code);
      achievementsMap.set(row.user_id, arr);
    });

    if (statsError) {
      console.error("Erro ao buscar stats:", statsError);
    }

    // Criar mapas para acesso rápido
    const usersMap = new Map(users?.map((u) => [u.id, u]) || []);
    const statsMap = new Map(githubStats?.map((s) => [s.user_id, s]) || []);

    // Formatar dados para o formato esperado pelo frontend
    const formattedPlayers = characters.map((character, index) => {
      const user = usersMap.get(character.user_id);
      const stats = statsMap.get(character.user_id);

      // Mostrar apenas atividades APÓS entrar na plataforma (total - baseline)
      const commitsAfterJoin = stats ? (stats.total_commits || 0) - (stats.baseline_commits || 0) : 0;
      const prsAfterJoin = stats ? (stats.total_prs || 0) - (stats.baseline_prs || 0) : 0;
      const issuesAfterJoin = stats ? (stats.total_issues || 0) - (stats.baseline_issues || 0) : 0;

      return {
        rank: index + 1,
        user_id: character.user_id,
        character_name: character.name,
        character_class: character.class,
        level: character.level,
        total_xp: character.total_xp,
        github_username: user?.github_username || "unknown",
        github_avatar_url: user?.github_avatar_url || null,
        total_commits: commitsAfterJoin, // Apenas atividade pós-plataforma
        total_prs: prsAfterJoin, // Apenas atividade pós-plataforma
        total_issues: issuesAfterJoin, // Apenas atividade pós-plataforma
        achievement_codes: achievementsMap.get(character.user_id) || [],
      };
    });

    return NextResponse.json({
      data: formattedPlayers,
      lastUpdate: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erro no endpoint leaderboard:", error);
    // Em desenvolvimento, retornar a mensagem do erro para facilitar debug
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
