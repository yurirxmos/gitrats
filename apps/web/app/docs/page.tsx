"use client";

import { Navbar } from "@/components/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { XP_CONSTANTS, getXpForLevel } from "@/lib/xp-system";

export default function Docs() {
  const levelProgression = [
    { level: 1, xp: 0, equivalent: "Primeira semana" },
    { level: 2, xp: 100, equivalent: "Workflow básico Git" },
    { level: 3, xp: 250, equivalent: "Primeiro PR" },
    { level: 5, xp: 700, equivalent: "Contribuidor regular" },
    { level: 10, xp: 3800, equivalent: "Senior contributor" },
    { level: 15, xp: 9800, equivalent: "Expert developer" },
    { level: 20, xp: 22500, equivalent: "GitHub power user" },
    { level: 30, xp: 85000, equivalent: "Community leader" },
    { level: 50, xp: 400000, equivalent: "Coding deity" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto px-8 py-12 w-full">
        <div className="space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-black">COMO FUNCIONA</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Sistema de XP balanceado que recompensa contribuições significativas e previne exploração fácil.
            </p>
          </div>

          <Card>
            <CardContent className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-4">Filosofia de Design</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-bold mb-2">Qualidade sobre Quantidade</h3>
                    <p className="text-sm text-muted-foreground">
                      Contribuições significativas valem mais que spam de commits.
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-bold mb-2">Anti-Cheat</h3>
                    <p className="text-sm text-muted-foreground">
                      Sistema com caps diários e penalidades para prevenir exploração.
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-bold mb-2">Diversidade</h3>
                    <p className="text-sm text-muted-foreground">
                      Incentiva diferentes tipos de atividades: commits, PRs, reviews, etc.
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-bold mb-2">Progressão Satisfatória</h3>
                    <p className="text-sm text-muted-foreground">
                      Sistema inspirado em Pokémon mantém engajamento a longo prazo.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-6">
              <h2 className="text-2xl font-bold">Progressão de Níveis</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4">Nível</th>
                      <th className="text-left py-3 px-4">XP Total</th>
                      <th className="text-left py-3 px-4">XP Necessário</th>
                      <th className="text-left py-3 px-4">Equivalente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {levelProgression.map((item, idx) => (
                      <tr
                        key={item.level}
                        className="border-b border-border/50"
                      >
                        <td className="py-3 px-4 font-bold">{item.level}</td>
                        <td className="py-3 px-4">{item.xp.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          {idx < levelProgression.length - 1
                            ? (levelProgression[idx + 1].xp - item.xp).toLocaleString()
                            : "-"}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{item.equivalent}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Fórmula: XP = Level³ × 4 - 15 × Level² + 100 × Level - 140
              </p>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="space-y-4">
                <h2 className="text-xl font-bold">Commits</h2>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm">Small (menos de 10 linhas)</span>
                    <span className="font-bold">{XP_CONSTANTS.COMMIT.SMALL} XP</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm">Medium (10-100 linhas)</span>
                    <span className="font-bold">{XP_CONSTANTS.COMMIT.MEDIUM} XP</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm">Large (100-500 linhas)</span>
                    <span className="font-bold">{XP_CONSTANTS.COMMIT.LARGE} XP</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm">Mega (500+ linhas)</span>
                    <span className="font-bold">{XP_CONSTANTS.COMMIT.MEGA} XP</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-border">
                  <h3 className="font-bold text-sm mb-2">Anti-Cheat</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>Máximo 50 XP por dia de commits</li>
                    <li>Commits vazios = 0 XP</li>
                    <li>Repos externos: +50% XP</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4">
                <h2 className="text-xl font-bold">Pull Requests</h2>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm">PR aberto</span>
                    <span className="font-bold">{XP_CONSTANTS.PULL_REQUEST.OPENED} XP</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm">PR merged (total)</span>
                    <span className="font-bold">
                      {XP_CONSTANTS.PULL_REQUEST.OPENED + XP_CONSTANTS.PULL_REQUEST.MERGED} XP
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm">PR fechado sem merge</span>
                    <span className="font-bold">{XP_CONSTANTS.PULL_REQUEST.CLOSED} XP</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-border space-y-4">
                  <div>
                    <h3 className="font-bold text-sm mb-2">Bônus por Popularidade</h3>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>Repo com 1k+ stars: +50% XP</li>
                      <li>Repo com 10k+ stars: +100% XP</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm mb-2">Penalidades</h3>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>Repos próprios: -50% XP</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4">
                <h2 className="text-xl font-bold">Stars Recebidas</h2>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm">Primeira star no repo</span>
                    <span className="font-bold">{XP_CONSTANTS.STARS.FIRST} XP</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm">Cada star adicional</span>
                    <span className="font-bold">{XP_CONSTANTS.STARS.ADDITIONAL} XP</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4">
                <h2 className="text-xl font-bold">Code Reviews</h2>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm">Review submetido</span>
                    <span className="font-bold">{XP_CONSTANTS.CODE_REVIEW.SUBMITTED} XP</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm">Review com mudanças</span>
                    <span className="font-bold">{XP_CONSTANTS.CODE_REVIEW.WITH_CHANGES} XP</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-border">
                  <h3 className="font-bold text-sm mb-2">Bônus</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>Review em repo popular: +30% XP</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4">
                <h2 className="text-xl font-bold">Issues</h2>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm">Issue criada</span>
                    <span className="font-bold">{XP_CONSTANTS.ISSUES.CREATED} XP</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm">Resolvida pelo autor</span>
                    <span className="font-bold">{XP_CONSTANTS.ISSUES.RESOLVED_BY_AUTHOR} XP</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm">Resolvida pela comunidade</span>
                    <span className="font-bold">{XP_CONSTANTS.ISSUES.RESOLVED_BY_COMMUNITY} XP</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm">Bug report levou a fix</span>
                    <span className="font-bold">{XP_CONSTANTS.ISSUES.BUG_FIX} XP</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4">
                <h2 className="text-xl font-bold">Releases</h2>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm">Primeiro release</span>
                    <span className="font-bold">{XP_CONSTANTS.RELEASE.FIRST} XP</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm">Major version (v1.0)</span>
                    <span className="font-bold">{XP_CONSTANTS.RELEASE.MAJOR} XP</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm">Minor version (v1.1)</span>
                    <span className="font-bold">{XP_CONSTANTS.RELEASE.MINOR} XP</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm">Patch version (v1.1.1)</span>
                    <span className="font-bold">{XP_CONSTANTS.RELEASE.PATCH} XP</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="space-y-4">
              <h2 className="text-2xl font-bold">Bônus de Streak</h2>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold">+10%</p>
                  <p className="text-sm text-muted-foreground">7 dias consecutivos</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold">+25%</p>
                  <p className="text-sm text-muted-foreground">30 dias consecutivos</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold">+50%</p>
                  <p className="text-sm text-muted-foreground">100 dias consecutivos</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold">+100%</p>
                  <p className="text-sm text-muted-foreground">365 dias consecutivos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <h2 className="text-2xl font-bold">Limites Anti-Spam</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-bold mb-2">Limite Diário Total</p>
                  <p className="text-3xl font-black">{XP_CONSTANTS.MAX_XP_PER_DAY} XP</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Previne grinding excessivo e mantém competição justa
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-bold mb-2">Limite de Commits/Dia</p>
                  <p className="text-3xl font-black">{XP_CONSTANTS.MAX_COMMIT_XP_PER_DAY} XP</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Força diversificação de atividades além de commits
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <h2 className="text-2xl font-bold">Multiplicadores de Repositório</h2>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-sm">Repos próprios (privados)</span>
                  <span className="font-bold">0.5x</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-sm">Repos próprios (públicos)</span>
                  <span className="font-bold">1x</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-sm">Repos externos</span>
                  <span className="font-bold">1.5x</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-sm">Repos populares (100+ stars)</span>
                  <span className="font-bold">2x</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-sm">Repos trending</span>
                  <span className="font-bold">3x</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-500/10 border-blue-500/50">
            <CardContent className="space-y-4">
              <h2 className="text-2xl font-bold">Ritmo de Progressão Esperado</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-background rounded-lg">
                  <h3 className="font-bold mb-2">Usuário Casual</h3>
                  <p className="text-sm text-muted-foreground mb-3">1 hora por dia</p>
                  <p className="text-lg font-bold">~1 nível/semana</p>
                  <p className="text-xs text-muted-foreground mt-1">(níveis 1-10)</p>
                </div>
                <div className="p-4 bg-background rounded-lg">
                  <h3 className="font-bold mb-2">Usuário Ativo</h3>
                  <p className="text-sm text-muted-foreground mb-3">3 horas por dia</p>
                  <p className="text-lg font-bold">~2-3 níveis/semana</p>
                  <p className="text-xs text-muted-foreground mt-1">(início do jogo)</p>
                </div>
                <div className="p-4 bg-background rounded-lg">
                  <h3 className="font-bold mb-2">Power User</h3>
                  <p className="text-sm text-muted-foreground mb-3">6+ horas por dia</p>
                  <p className="text-lg font-bold">Progressão constante</p>
                  <p className="text-xs text-muted-foreground mt-1">(atinge caps diários)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-muted-foreground space-y-2 pt-8">
            <p>As atividades do GitHub são sincronizadas automaticamente a cada 1 hora.</p>
            <p>Sistema balanceado para recompensar contribuições reais e prevenir exploração.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
