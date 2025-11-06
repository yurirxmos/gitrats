import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  calculateCommitXp,
  calculatePullRequestXp,
  calculateCodeReviewXp,
  calculateIssueXp,
  calculateStarForkXp,
  getLevelFromXp,
  getCurrentXp,
  XP_CONSTANTS,
} from "@/lib/xp-system";
import type { CharacterClass } from "@/lib/classes";

/**
 * Calcula XP diário por tipo de atividade
 */
async function getDailyXpByType(supabase: any, userId: string, activityType: string): Promise<number> {
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("activity_log")
    .select("xp_gained")
    .eq("user_id", userId)
    .eq("activity_type", activityType)
    .gte("created_at", `${today}T00:00:00.000Z`)
    .lt("created_at", `${today}T23:59:59.999Z`);

  return data?.reduce((sum: number, row: any) => sum + (row.xp_gained || 0), 0) || 0;
}

/**
 * Calcula XP diário total
 */
async function getDailyXp(supabase: any, userId: string): Promise<number> {
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("activity_log")
    .select("xp_gained")
    .eq("user_id", userId)
    .gte("created_at", `${today}T00:00:00.000Z`)
    .lt("created_at", `${today}T23:59:59.999Z`);

  return data?.reduce((sum: number, row: any) => sum + (row.xp_gained || 0), 0) || 0;
}

/**
 * Webhook do GitHub que processa eventos e aplica XP de acordo com a classe do personagem
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verificar header do GitHub
    const githubEvent = request.headers.get("x-github-event");
    const signature = request.headers.get("x-hub-signature-256");

    if (!githubEvent) {
      return NextResponse.json({ error: "Missing GitHub event header" }, { status: 400 });
    }

    const payload = await request.json();
    console.log(`📦 Webhook recebido: ${githubEvent}`, payload);

    // Obter username do GitHub do payload
    let githubUsername: string | null = null;

    if (payload.sender?.login) {
      githubUsername = payload.sender.login;
    } else if (payload.pusher?.name) {
      githubUsername = payload.pusher.name;
    }

    if (!githubUsername) {
      console.log("❌ Username do GitHub não encontrado no payload");
      return NextResponse.json({ error: "GitHub username not found" }, { status: 400 });
    }

    // Buscar usuário pelo GitHub username
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, github_username")
      .eq("github_username", githubUsername)
      .single();

    if (userError || !userData) {
      console.log(`❌ Usuário não encontrado: ${githubUsername}`);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log(`✅ Usuário encontrado: ${userData.github_username} (${userData.id})`);

    // Buscar personagem e classe do usuário
    const { data: character, error: characterError } = await supabase
      .from("characters")
      .select("id, name, class, level, current_xp, total_xp")
      .eq("user_id", userData.id)
      .single();

    if (characterError || !character) {
      console.log(`❌ Personagem não encontrado para user: ${userData.id}`);
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    // Buscar estatísticas do GitHub
    const { data: githubStats } = await supabase
      .from("github_stats")
      .select("total_commits, total_prs")
      .eq("user_id", userData.id)
      .single();

    const characterClass = character.class as CharacterClass;
    let xpGained = 0;
    let activityDescription = "";
    let commitSha: string | null = null;
    let prNumber: number | null = null;

    // Processar eventos e calcular XP baseado na classe
    switch (githubEvent) {
      case "push": {
        const commits = payload.commits || [];
        const isOwnRepo = payload.repository?.owner?.login === githubUsername;

        // Verificar cap diário de commits
        const dailyCommitXp = await getDailyXpByType(supabase, userData.id, "push");

        for (const commit of commits) {
          // Verificar se commit já foi processado
          commitSha = commit.id;

          const { data: existingCommit } = await supabase
            .from("activity_log")
            .select("id")
            .eq("user_id", userData.id)
            .eq("commit_sha", commitSha)
            .single();

          if (existingCommit) {
            console.log(`⚠️ Commit duplicado ignorado: ${commitSha}`);
            continue;
          }

          // Calcular linhas alteradas (aproximado)
          const linesChanged = (commit.added || 0) + (commit.removed || 0) + (commit.modified || 0);

          let commitXp = calculateCommitXp(linesChanged, isOwnRepo, characterClass);

          // Aplicar cap de commits
          if (dailyCommitXp + xpGained + commitXp > XP_CONSTANTS.MAX_COMMIT_XP_PER_DAY) {
            commitXp = Math.max(0, XP_CONSTANTS.MAX_COMMIT_XP_PER_DAY - (dailyCommitXp + xpGained));
            if (commitXp <= 0) {
              console.log(`⚠️ Cap de commits atingido (${XP_CONSTANTS.MAX_COMMIT_XP_PER_DAY} XP/dia)`);
              break;
            }
          }

          xpGained += commitXp;

          console.log(`✅ Commit de ${githubUsername} (${characterClass}): ${linesChanged} linhas = ${commitXp} XP`);
        }

        activityDescription = `${commits.length} commit(s) em ${payload.repository?.name}`;

        // Atualizar stats
        await supabase
          .from("github_stats")
          .update({
            total_commits: (githubStats?.total_commits || 0) + commits.length,
          })
          .eq("user_id", userData.id);

        break;
      }

      case "pull_request": {
        const action = payload.action;
        const isOwnRepo = payload.repository?.owner?.login === githubUsername;
        const repoStars = payload.repository?.stargazers_count || 0;
        prNumber = payload.pull_request?.number;

        // Verificar se PR já foi processado
        const { data: existingPr } = await supabase
          .from("activity_log")
          .select("id")
          .eq("user_id", userData.id)
          .eq("pr_number", prNumber)
          .single();

        if (existingPr) {
          console.log(`⚠️ PR duplicado ignorado: #${prNumber}`);
          return NextResponse.json({ message: "PR already processed" }, { status: 200 });
        }

        // Verificar cap diário de PRs
        const dailyPrXp = await getDailyXpByType(supabase, userData.id, "pull_request");

        if (action === "opened") {
          xpGained = calculatePullRequestXp("opened", isOwnRepo, repoStars, characterClass);
          activityDescription = `PR aberto em ${payload.repository?.name}`;

          // Atualizar stats
          await supabase
            .from("github_stats")
            .update({
              total_prs: (githubStats?.total_prs || 0) + 1,
            })
            .eq("user_id", userData.id);
        } else if (action === "closed" && payload.pull_request?.merged) {
          xpGained = calculatePullRequestXp("merged", isOwnRepo, repoStars, characterClass);
          activityDescription = `PR mergeado em ${payload.repository?.name}`;
        } else if (action === "closed") {
          xpGained = calculatePullRequestXp("closed", isOwnRepo, repoStars, characterClass);
          activityDescription = `PR fechado em ${payload.repository?.name}`;
        }

        // Aplicar cap de PRs
        if (dailyPrXp + xpGained > XP_CONSTANTS.MAX_PR_XP_PER_DAY) {
          xpGained = Math.max(0, XP_CONSTANTS.MAX_PR_XP_PER_DAY - dailyPrXp);
          if (xpGained <= 0) {
            console.log(`⚠️ Cap de PRs atingido (${XP_CONSTANTS.MAX_PR_XP_PER_DAY} XP/dia)`);
            return NextResponse.json({ message: "Daily PR XP cap reached" }, { status: 200 });
          }
        }

        console.log(`✅ Pull Request (${action}) de ${githubUsername} (${characterClass}): ${xpGained} XP`);
        break;
      }

      case "pull_request_review": {
        const hasChanges = payload.review?.body && payload.review.body.length > 0;
        xpGained = calculateCodeReviewXp(hasChanges, characterClass);
        activityDescription = `Code review em ${payload.repository?.name}`;

        console.log(`✅ Code Review de ${githubUsername} (${characterClass}): ${xpGained} XP`);
        break;
      }

      case "issues": {
        const action = payload.action;
        const isAuthor = payload.issue?.user?.login === githubUsername;

        if (action === "opened") {
          xpGained = calculateIssueXp("created", characterClass);
          activityDescription = `Issue criada em ${payload.repository?.name}`;
        } else if (action === "closed") {
          if (isAuthor) {
            xpGained = calculateIssueXp("resolved_by_author", characterClass);
            activityDescription = `Issue resolvida (autor) em ${payload.repository?.name}`;
          } else {
            xpGained = calculateIssueXp("resolved_by_community", characterClass);
            activityDescription = `Issue resolvida (comunidade) em ${payload.repository?.name}`;
          }
        }

        console.log(`✅ Issue (${action}) de ${githubUsername} (${characterClass}): ${xpGained} XP`);
        break;
      }

      case "star": {
        const action = payload.action;
        if (action === "created") {
          const isFirst = payload.repository?.stargazers_count === 1;

          // Verificar cap diário de stars
          const dailyStarsXp = await getDailyXpByType(supabase, userData.id, "star");

          xpGained = calculateStarForkXp("star", isFirst, characterClass);

          // Aplicar cap de stars
          if (dailyStarsXp + xpGained > XP_CONSTANTS.MAX_STARS_XP_PER_DAY) {
            xpGained = Math.max(0, XP_CONSTANTS.MAX_STARS_XP_PER_DAY - dailyStarsXp);
            if (xpGained <= 0) {
              console.log(`⚠️ Cap de stars atingido (${XP_CONSTANTS.MAX_STARS_XP_PER_DAY} XP/dia)`);
              return NextResponse.json({ message: "Daily stars XP cap reached" }, { status: 200 });
            }
          }

          activityDescription = `Star recebida em ${payload.repository?.name}`;

          console.log(`✅ Star de ${githubUsername} (${characterClass}): ${xpGained} XP`);
        }
        break;
      }

      case "fork": {
        const isFirst = payload.repository?.forks_count === 1;
        xpGained = calculateStarForkXp("fork", isFirst, characterClass);
        activityDescription = `Fork recebido em ${payload.repository?.name}`;

        console.log(`✅ Fork de ${githubUsername} (${characterClass}): ${xpGained} XP`);
        break;
      }

      default:
        console.log(`⚠️ Evento não processado: ${githubEvent}`);
        return NextResponse.json({ message: "Event not processed" }, { status: 200 });
    }

    if (xpGained > 0) {
      // Verificar cap diário geral
      const currentDailyXp = await getDailyXp(supabase, userData.id);

      if (currentDailyXp + xpGained > XP_CONSTANTS.MAX_XP_PER_DAY) {
        xpGained = Math.max(0, XP_CONSTANTS.MAX_XP_PER_DAY - currentDailyXp);

        if (xpGained <= 0) {
          console.log(`⚠️ Cap diário geral atingido (${XP_CONSTANTS.MAX_XP_PER_DAY} XP/dia)`);
          return NextResponse.json(
            {
              message: "Daily XP cap reached",
              daily_xp_used: currentDailyXp,
              daily_xp_cap: XP_CONSTANTS.MAX_XP_PER_DAY,
            },
            { status: 200 }
          );
        }
      }

      // Atualizar XP do personagem
      const newTotalXp = character.total_xp + xpGained;
      const newLevel = getLevelFromXp(newTotalXp);
      const newCurrentXp = getCurrentXp(newTotalXp, newLevel);

      const { error: updateError } = await supabase
        .from("characters")
        .update({
          total_xp: newTotalXp,
          level: newLevel,
          current_xp: newCurrentXp,
        })
        .eq("id", character.id);

      if (updateError) {
        console.error("❌ Erro ao atualizar XP:", updateError);
        return NextResponse.json({ error: "Failed to update XP" }, { status: 500 });
      }

      // Registrar atividade
      await supabase.from("activity_log").insert({
        user_id: userData.id,
        character_id: character.id,
        activity_type: githubEvent,
        description: activityDescription,
        xp_gained: xpGained,
        total_xp_after: newTotalXp,
        level_after: newLevel,
        commit_sha: commitSha,
        pr_number: prNumber,
      });

      const leveledUp = newLevel > character.level;

      console.log(
        `🎉 ${githubUsername} (${characterClass}) ganhou ${xpGained} XP! Total: ${newTotalXp} | Level: ${newLevel}${leveledUp ? " 🆙 LEVEL UP!" : ""}`
      );

      return NextResponse.json({
        success: true,
        message: `${xpGained} XP gained!`,
        data: {
          character_name: character.name,
          character_class: characterClass,
          xp_gained: xpGained,
          total_xp: newTotalXp,
          level: newLevel,
          leveled_up: leveledUp,
          activity: activityDescription,
        },
      });
    }

    return NextResponse.json({ message: "No XP gained" }, { status: 200 });
  } catch (error) {
    console.error("❌ Erro no webhook:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
