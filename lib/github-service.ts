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
  private authenticatedLogin?: string;

  constructor(accessToken?: string) {
    if (!accessToken) {
      console.warn("[GitHubService] Criado sem token de acesso - algumas APIs podem falhar");
    }

    this.octokit = new Octokit({
      auth: accessToken,
      userAgent: "GitRats/1.0",
    });

    this.graphqlWithAuth = graphql.defaults({
      headers: {
        authorization: accessToken ? `token ${accessToken}` : "",
      },
    });
  }

  private async ensureAuthenticatedLogin(): Promise<string | undefined> {
    if (this.authenticatedLogin !== undefined) return this.authenticatedLogin;
    try {
      const me = await this.octokit.rest.users.getAuthenticated();
      this.authenticatedLogin = me.data.login;
    } catch {
      this.authenticatedLogin = undefined;
    }
    return this.authenticatedLogin;
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
    } catch (error: any) {
      console.error("[GitHubService] Erro ao buscar stats:", error);

      // Token inválido/expirado
      if (error.status === 401) {
        throw new Error("GitHub token inválido ou expirado. Faça login novamente.");
      }

      // Rate limit
      if (error.status === 403) {
        throw new Error("Rate limit do GitHub excedido. Tente novamente mais tarde.");
      }

      throw new Error(`Erro ao buscar estatísticas do GitHub: ${error.message || "Unknown error"}`);
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
      const currentYear = new Date().getFullYear();
      const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];

      const login = await this.ensureAuthenticatedLogin();
      const useViewer = !!login && login.toLowerCase() === username.toLowerCase();

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
          viewer {
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
      const node = useViewer ? response.viewer : response.user;

      if (!node) {
        throw new Error(`Usuário ${username} não encontrado`);
      }

      // Usar APENAS anos específicos - contributionsCollection sem ano já retorna o ano atual,
      // então incluí-lo causaria duplicação com contributionsCollection2025
      const collections = years.map((y) => `contributionsCollection${y}`);

      let totalCommits = 0;
      let totalPRs = 0;
      let totalIssues = 0;
      let totalReviews = 0;

      collections.forEach((key) => {
        const collection = node[key];
        if (collection && typeof collection === "object") {
          totalCommits += collection.totalCommitContributions || 0;
          totalPRs += collection.totalPullRequestContributions || 0;
          totalIssues += collection.totalIssueContributions || 0;
          totalReviews += collection.totalPullRequestReviewContributions || 0;
        }
      });

      return {
        totalCommits,
        totalPRs,
        totalIssues,
        totalReviews,
      };
    } catch (error) {
      console.error("[GitHub Service] Erro ao buscar contribuições via GraphQL:", error);
      throw error;
    }
  }

  /**
   * Obter estatísticas de atividade entre duas datas específicas
   */
  async getActivityByDateRange(
    username: string,
    startDate: string,
    endDate: string
  ): Promise<{ commits: number; prs: number; issues: number; reviews: number }> {
    const login = await this.ensureAuthenticatedLogin();
    const useViewer = !!login && login.toLowerCase() === username.toLowerCase();
    const query = `
      query($username: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $username) {
          contributionsCollection(from: $from, to: $to) {
            totalCommitContributions
            totalPullRequestContributions
            totalIssueContributions
            totalPullRequestReviewContributions
          }
        }
        viewer {
          contributionsCollection(from: $from, to: $to) {
            totalCommitContributions
            totalPullRequestContributions
            totalIssueContributions
            totalPullRequestReviewContributions
          }
        }
      }
    `;
    const response: Record<string, any> = await this.graphqlWithAuth(query, {
      username,
      from: startDate,
      to: endDate,
    });

    const collection = (useViewer ? response.viewer : response.user)?.contributionsCollection;

    if (!collection) {
      throw new Error("Dados de contribuição não encontrados");
    }

    return {
      commits: Number(collection.totalCommitContributions) || 0,
      prs: Number(collection.totalPullRequestContributions) || 0,
      issues: Number(collection.totalIssueContributions) || 0,
      reviews: Number(collection.totalPullRequestReviewContributions) || 0,
    };
  }

  /**
   * Busca XP semanal (últimos 7 dias) via GraphQL
   */
  async getWeeklyXp(username: string): Promise<{ commits: number; prs: number; issues: number; reviews: number }> {
    try {
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);

      const fromDate = startDate.toISOString();
      const toDate = now.toISOString();

      const login = await this.ensureAuthenticatedLogin();
      const useViewer = !!login && login.toLowerCase() === username.toLowerCase();
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
          viewer {
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

      const collection = (useViewer ? response.viewer : response.user)?.contributionsCollection;

      if (!collection) {
        throw new Error("Dados de contribuição não encontrados");
      }

      const commits = Number(collection.totalCommitContributions) || 0;
      const prs = Number(collection.totalPullRequestContributions) || 0;
      const issues = Number(collection.totalIssueContributions) || 0;
      const reviews = Number(collection.totalPullRequestReviewContributions) || 0;

      return { commits, prs, issues, reviews };
    } catch (error) {
      console.error("[GitHub Service] Erro ao buscar XP semanal via GraphQL:", error);
      throw error;
    }
  }

  /**
   * Busca atividades desde uma data específica via GraphQL
   * Útil para calcular XP apenas de atividades após o registro do usuário
   */
  async getActivitiesSince(
    username: string,
    startDate: Date
  ): Promise<{ commits: number; prs: number; issues: number; reviews: number }> {
    try {
      const fromDate = startDate.toISOString();
      const toDate = new Date().toISOString();

      const login = await this.ensureAuthenticatedLogin();
      const useViewer = !!login && login.toLowerCase() === username.toLowerCase();
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
          viewer {
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

      const collection = (useViewer ? response.viewer : response.user)?.contributionsCollection;

      if (!collection) {
        throw new Error("Dados de contribuição não encontrados");
      }

      const commits = Number(collection.totalCommitContributions) || 0;
      const prs = Number(collection.totalPullRequestContributions) || 0;
      const issues = Number(collection.totalIssueContributions) || 0;
      const reviews = Number(collection.totalPullRequestReviewContributions) || 0;

      return { commits, prs, issues, reviews };
    } catch (error) {
      console.error(`[GitHub Service] Erro ao buscar atividades desde ${startDate}:`, error);
      return { commits: 0, prs: 0, issues: 0, reviews: 0 };
    }
  }

  /**
   * Busca atividades entre duas datas específicas via GraphQL
   * Útil para calcular XP de um período customizado (ex: 7 dias antes do login)
   */
  async getActivitiesBetween(
    username: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ commits: number; prs: number; issues: number; reviews: number }> {
    try {
      const fromDate = startDate.toISOString();
      const toDate = endDate.toISOString();

      const login = await this.ensureAuthenticatedLogin();
      const useViewer = !!login && login.toLowerCase() === username.toLowerCase();
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
          viewer {
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

      const collection = (useViewer ? response.viewer : response.user)?.contributionsCollection;

      if (!collection) {
        throw new Error("Dados de contribuição não encontrados");
      }

      const commits = Number(collection.totalCommitContributions) || 0;
      const prs = Number(collection.totalPullRequestContributions) || 0;
      const issues = Number(collection.totalIssueContributions) || 0;
      const reviews = Number(collection.totalPullRequestReviewContributions) || 0;

      return { commits, prs, issues, reviews };
    } catch (error) {
      console.error(`[GitHub Service] Erro ao buscar atividades entre ${startDate} e ${endDate}:`, error);
      return { commits: 0, prs: 0, issues: 0, reviews: 0 };
    }
  }

  /**
   * Busca commits via GitHub Search API - MUITO mais confiável que Events API
   * Baseado em: https://github.com/isabellaherman/gitmon
   *
   * Vantagens:
   * ✅ Encontra TODOS os commits públicos (não só os 30 eventos recentes)
   * ✅ Filtragem por data confiável usando committer-date
   * ✅ Retorna dados reais de commit (SHA, mensagem, repositório)
   * ✅ Funciona em todos os repositórios que o usuário commitou
   * ✅ Rate limit melhor (5000/hora vs 1000/hora da Events API)
   *
   * @param username - Nome de usuário do GitHub
   * @param startDate - Data de início OU número de dias atrás
   * @param endDate - Data final (opcional, padrão é hoje)
   */
  async getCommitsViaSearch(
    username: string,
    startDate: Date | number = 7,
    endDate?: Date
  ): Promise<
    Array<{
      sha: string;
      message: string;
      repoName: string;
      timestamp: Date;
      url: string;
    }>
  > {
    try {
      // Se startDate é número, converter para data (dias atrás)
      let fromDate: Date;
      if (typeof startDate === "number") {
        fromDate = new Date(Date.now() - startDate * 24 * 60 * 60 * 1000);
      } else {
        fromDate = startDate;
      }

      const toDate = endDate || new Date();
      const fromDateStr = fromDate.toISOString().split("T")[0]; // YYYY-MM-DD
      const toDateStr = toDate.toISOString().split("T")[0]; // YYYY-MM-DD

      console.log(`[GitHub Search] Buscando commits de ${username} entre ${fromDateStr} e ${toDateStr}`);

      // Busca commits usando Search API com filtro de data
      const { data } = await this.octokit.rest.search.commits({
        q: `author:${username} committer-date:${fromDateStr}..${toDateStr}`,
        sort: "committer-date",
        order: "desc",
        per_page: 100,
      });

      console.log(`[GitHub Search] Encontrados ${data.items.length} commits para ${username}`);

      return data.items.map((commit: any) => ({
        sha: commit.sha,
        message: commit.commit.message.split("\n")[0], // Apenas primeira linha
        repoName: commit.repository?.full_name || "unknown",
        timestamp: new Date(commit.commit.committer?.date || commit.commit.author.date),
        url: commit.html_url,
      }));
    } catch (error) {
      console.error(`[GitHub Search] Erro ao buscar commits para ${username}:`, error);
      // Retorna array vazio em caso de falha ao invés de quebrar
      return [];
    }
  }

  /**
   * Busca rate limit atual da API do GitHub
   */
  async getRateLimit() {
    try {
      const { data } = await this.octokit.rest.rateLimit.get();
      return data.rate;
    } catch (error) {
      console.error("[GitHub Service] Erro ao verificar rate limit:", error);
      return null;
    }
  }
}

export default GitHubService;
