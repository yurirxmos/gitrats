import { Octokit } from "@octokit/rest";
import { graphql } from "@octokit/graphql";

export interface GitHubUserStats {
  username: string;
  name: string;
  bio: string | null;
  location: string | null;
  followers: number;
  following: number;
  createdAt: Date;
  totalCommits: number;
  totalPRs: number;
  totalStars: number;
  totalForks: number;
  totalRepos: number;
  totalIssues: number;
}

export class GitHubService {
  private octokit: Octokit;
  private graphqlWithAuth: typeof graphql;

  constructor(accessToken?: string) {
    this.octokit = new Octokit({
      auth: accessToken,
      userAgent: "GitRats/1.0",
    });

    this.graphqlWithAuth = graphql.defaults({
      headers: {
        authorization: accessToken ? `token ${accessToken}` : undefined,
      },
    });
  }

  /**
   * Busca estatísticas completas do usuário do GitHub
   */
  async getUserStats(username: string): Promise<GitHubUserStats> {
    try {
      // Buscar dados de contribuições via GraphQL
      const contributionData = await this.getAccurateContributionData(username);

      // Buscar dados do perfil do usuário
      const { data: user } = await this.octokit.rest.users.getByUsername({
        username,
      });

      // Buscar repositórios do usuário
      const { data: repos } = await this.octokit.rest.repos.listForUser({
        username,
        per_page: 100,
        sort: "updated",
      });

      const totalRepos = user.public_repos;
      const totalStars = repos.reduce((sum: number, repo: any) => sum + (repo.stargazers_count || 0), 0);
      const totalForks = repos.reduce((sum: number, repo: any) => sum + (repo.forks_count || 0), 0);

      return {
        username,
        name: user.name || username,
        bio: user.bio,
        location: user.location,
        followers: user.followers,
        following: user.following,
        createdAt: new Date(user.created_at),
        totalCommits: contributionData.totalCommits,
        totalPRs: contributionData.totalPRs,
        totalStars,
        totalForks,
        totalRepos,
        totalIssues: contributionData.totalIssues,
      };
    } catch (error) {
      console.error("Erro ao buscar stats do GitHub:", error);
      throw new Error("Failed to fetch GitHub statistics");
    }
  }

  /**
   * Busca dados precisos de contribuições usando GraphQL
   * Similar ao GitMon - busca últimos 4 anos de contribuições
   */
  async getAccurateContributionData(username: string): Promise<{
    totalCommits: number;
    totalPRs: number;
    totalIssues: number;
    totalReviews: number;
  }> {
    try {
      console.log(`[GitHub GraphQL] Buscando dados de contribuições para ${username}`);

      const currentYear = new Date().getFullYear();
      const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];

      const query = `
        query($username: String!) {
          user(login: $username) {
            contributionsCollection {
              totalCommitContributions
              totalIssueContributions
              totalPullRequestContributions
              totalPullRequestReviewContributions
            }
            ${years
              .map(
                (year) => `
            contributionsCollection${year}: contributionsCollection(
              from: "${year}-01-01T00:00:00Z", 
              to: "${year}-12-31T23:59:59Z"
            ) {
              totalCommitContributions
              totalIssueContributions
              totalPullRequestContributions
              totalPullRequestReviewContributions
            }
            `
              )
              .join("")}
          }
        }
      `;

      const response: Record<string, any> = await this.graphqlWithAuth(query, { username });
      const user = response.user;

      if (!user) {
        throw new Error(`Usuário ${username} não encontrado`);
      }

      // Somar contribuições de todos os anos
      const collections = ["contributionsCollection", ...years.map((y) => `contributionsCollection${y}`)];

      let totalCommits = 0;
      let totalPRs = 0;
      let totalIssues = 0;
      let totalReviews = 0;

      collections.forEach((key) => {
        const collection = user[key];
        if (collection && typeof collection === "object") {
          totalCommits += collection.totalCommitContributions || 0;
          totalPRs += collection.totalPullRequestContributions || 0;
          totalIssues += collection.totalIssueContributions || 0;
          totalReviews += collection.totalPullRequestReviewContributions || 0;
        }
      });

      console.log(`[GitHub GraphQL] Dados encontrados para ${username}:`);
      console.log(`  Total Commits: ${totalCommits}`);
      console.log(`  Total PRs: ${totalPRs}`);
      console.log(`  Total Issues: ${totalIssues}`);
      console.log(`  Total Reviews: ${totalReviews}`);

      return {
        totalCommits,
        totalPRs,
        totalIssues,
        totalReviews,
      };
    } catch (error) {
      console.error("Erro ao buscar dados via GraphQL:", error);

      // Fallback para REST API se GraphQL falhar
      console.log(`[GitHub] Usando fallback REST API para ${username}`);
      const { data: events } = await this.octokit.rest.activity.listPublicEventsForUser({
        username,
        per_page: 100,
      });

      return {
        totalCommits: this.countCommitsFromEvents(events),
        totalPRs: this.countPRsFromEvents(events),
        totalIssues: this.countIssuesFromEvents(events),
        totalReviews: 0,
      };
    }
  }

  /**
   * Busca XP semanal (últimos 7 dias) via GraphQL
   */
  async getWeeklyXp(username: string): Promise<{ commits: number; prs: number; issues: number; reviews: number }> {
    try {
      console.log(`[GitHub Service] Buscando XP semanal para ${username} via GraphQL`);

      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);

      const fromDate = startDate.toISOString();
      const toDate = now.toISOString();

      const query = `
        query($username: String!, $from: DateTime!, $to: DateTime!) {
          user(login: $username) {
            contributionsCollection(from: $from, to: $to) {
              totalCommitContributions
              totalIssueContributions
              totalPullRequestContributions
              totalPullRequestReviewContributions
            }
          }
        }
      `;

      const response: Record<string, any> = await this.graphqlWithAuth(query, {
        username,
        from: fromDate,
        to: toDate,
      });

      const collection = response.user?.contributionsCollection;

      if (!collection) {
        throw new Error("Dados de contribuição não encontrados");
      }

      const commits = Number(collection.totalCommitContributions) || 0;
      const prs = Number(collection.totalPullRequestContributions) || 0;
      const issues = Number(collection.totalIssueContributions) || 0;
      const reviews = Number(collection.totalPullRequestReviewContributions) || 0;

      console.log(`[GitHub Service] Dados semanais para ${username}:`);
      console.log(`  Commits: ${commits}`);
      console.log(`  PRs: ${prs}`);
      console.log(`  Issues: ${issues}`);
      console.log(`  Reviews: ${reviews}`);

      return { commits, prs, issues, reviews };
    } catch (error) {
      console.error("Erro ao calcular XP semanal via GraphQL:", error);
      console.log("Usando fallback para eventos...");

      // Fallback para Events API
      const { data: events } = await this.octokit.rest.activity.listPublicEventsForUser({
        username,
        per_page: 100,
      });

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const weekEvents = events.filter((e: any) => {
        const eventDate = new Date(e.created_at);
        return eventDate >= weekAgo;
      });

      return {
        commits: this.countCommitsFromEvents(weekEvents),
        prs: this.countPRsFromEvents(weekEvents),
        issues: this.countIssuesFromEvents(weekEvents),
        reviews: 0,
      };
    }
  }

  // Helpers para fallback REST API
  private countCommitsFromEvents(events: Record<string, any>[]): number {
    return events
      .filter((event) => event.type === "PushEvent")
      .reduce((sum, event) => sum + (event.payload?.commits?.length || 1), 0);
  }

  private countPRsFromEvents(events: Record<string, any>[]): number {
    return events.filter((event) => event.type === "PullRequestEvent" && event.payload?.action === "opened").length;
  }

  private countIssuesFromEvents(events: Record<string, any>[]): number {
    return events.filter((event) => event.type === "IssuesEvent" && event.payload?.action === "opened").length;
  }
}

export default GitHubService;
