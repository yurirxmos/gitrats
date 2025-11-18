import axios from "axios";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Endpoint de debug para testar busca de commits do GitHub
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Buscar dados do usuário
    const { data: userData } = await supabase
      .from("users")
      .select("github_username, github_access_token")
      .eq("id", user.id)
      .single();

    if (!userData?.github_access_token) {
      return NextResponse.json({ error: "Token do GitHub não encontrado" }, { status: 400 });
    }

    const since = new Date();
    since.setDate(since.getDate() - 7);

    // Testar ambas as queries
    const queries = [
      {
        name: "committer-date",
        query: `author:${userData.github_username}+committer-date:>${since.toISOString().split("T")[0]}`,
      },
      {
        name: "author-date",
        query: `author:${userData.github_username}+author-date:>${since.toISOString().split("T")[0]}`,
      },
      {
        name: "simple",
        query: `author:${userData.github_username}`,
      },
    ];

    const results = [];

    for (const { name, query } of queries) {
      const url = `https://api.github.com/search/commits?q=${encodeURIComponent(query)}&sort=committer-date&order=desc&per_page=5`;

      try {
        const response = await axios.get(url, {
          headers: {
            Authorization: `token ${userData.github_access_token}`,
            Accept: "application/vnd.github.cloak-preview+json",
          },
        });

        const data = response.data;

        results.push({
          type: name,
          query,
          status: response.status,
          total_count: data.total_count,
          items_returned: data.items?.length || 0,
          first_commit: data.items?.[0]
            ? {
                sha: data.items[0].sha?.substring(0, 7),
                message: data.items[0].commit?.message?.substring(0, 100),
                date: data.items[0].commit?.committer?.date,
                repo: data.items[0].repository?.full_name,
              }
            : null,
          error: data.message || null,
        });
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          const data = error.response.data || {};
          results.push({
            type: name,
            query,
            status: error.response.status,
            total_count: data.total_count || 0,
            items_returned: data.items?.length || 0,
            first_commit: null,
            error: data.message || error.message,
          });
        } else {
          throw error;
        }
      }
    }

    return NextResponse.json({
      github_username: userData.github_username,
      search_period: `${since.toISOString().split("T")[0]} até hoje`,
      results,
    });
  } catch (error) {
    console.error("Erro no debug:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
