import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
      .select("user_id, total_commits, total_prs, baseline_commits, baseline_prs")
      .in("user_id", userIds);

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
