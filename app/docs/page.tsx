"use client";

import { Navbar } from "@/components/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { XP_CONSTANTS, getXpForLevel } from "@/lib/xp-system";
import { CLASS_DESCRIPTIONS, CLASS_XP_MULTIPLIERS } from "@/lib/classes";
import { FaFire } from "react-icons/fa6";

export default function Docs() {
  const levelProgression = [
    { level: 1, xp: getXpForLevel(1), equivalent: "Primeira semana", days: "0" },
    { level: 2, xp: getXpForLevel(2), equivalent: "Workflow básico Git", days: "1" },
    { level: 3, xp: getXpForLevel(3), equivalent: "Primeiro PR", days: "3" },
    { level: 5, xp: getXpForLevel(5), equivalent: "Contribuidor regular", days: "7" },
    { level: 10, xp: getXpForLevel(10), equivalent: "Senior contributor", days: "52" },
    { level: 15, xp: getXpForLevel(15), equivalent: "Expert developer", days: "117" },
    { level: 20, xp: getXpForLevel(20), equivalent: "GitHub power user", days: "205" },
    { level: 30, xp: getXpForLevel(30), equivalent: "Community leader", days: "457" },
    { level: 50, xp: getXpForLevel(50), equivalent: "Coding deity", days: "1,262" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto px-8 py-12 w-full">
        <div className="space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-black">COMO FUNCIONA</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Sistema de XP v2.0 balanceado que recompensa contribuições significativas e previne exploits.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 border border-orange-500/50 rounded-full">
              <FaFire className="text-orange-500" />
              <span className="text-sm font-bold text-orange-500">Sistema Anti-Exploit Ativo</span>
            </div>
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

          {/* NOVO: Bônus de Classes */}
          <Card className="bg-orange-500/10 border-orange-500/50">
            <CardContent className="space-y-6">
              <div className="flex items-center gap-2">
                <FaFire className="text-orange-500 text-2xl" />
                <h2 className="text-2xl font-bold">Bônus de XP por Classe</h2>
              </div>
              <p className="text-muted-foreground">
                Cada classe tem multiplicadores únicos de XP baseados em seu estilo de desenvolvimento.
              </p>

              <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 mb-4">
                <p className="text-sm font-bold text-blue-400 mb-2">✅ Sistema Implementado</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>✅ <strong>Commits</strong> - Multiplicador funcionando</li>
                  <li>✅ <strong>Pull Requests</strong> - Multiplicador funcionando</li>
                  <li>✅ <strong>Issues Resolvidas</strong> - Multiplicador funcionando</li>
                  <li>⏳ <strong>Code Reviews</strong> - EM DESENVOLVIMENTO (API GitHub limitada)</li>
                  <li>⏳ <strong>Stars/Forks</strong> - EM DESENVOLVIMENTO</li>
                  <li>⏳ <strong>Large Commits (>100 linhas)</strong> - EM DESENVOLVIMENTO</li>
                  <li>⏳ <strong>Releases</strong> - EM DESENVOLVIMENTO</li>
                </ul>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {(["orc", "warrior", "mage"] as const).map((characterClass) => {
                  const classInfo = CLASS_DESCRIPTIONS[characterClass];
                  const multipliers = CLASS_XP_MULTIPLIERS[characterClass];

                  return (
                    <div
                      key={characterClass}
                      className="p-4 bg-background rounded-lg border-2 border-border"
                    >
                      <h3 className="text-xl font-bold mb-1">{classInfo.name}</h3>
                      <p className="text-sm text-blue-400 mb-3">{classInfo.title}</p>
                      <p className="text-xs text-muted-foreground mb-4">{classInfo.description}</p>

                      <div className="space-y-2">
                        <h4 className="text-sm font-bold text-green-500">Bônus Ativos:</h4>
                        <div className="text-xs bg-green-500/10 p-2 rounded border border-green-500/30">
                          Commits: {multipliers.commits}x ✅
                        </div>
                        <div className="text-xs bg-green-500/10 p-2 rounded border border-green-500/30">
                          Pull Requests: {multipliers.pullRequests}x ✅
                        </div>
                        <div className="text-xs bg-green-500/10 p-2 rounded border border-green-500/30">
                          Issues: {multipliers.issuesResolved}x ✅
                        </div>
                        
                        <h4 className="text-sm font-bold text-orange-500 mt-4">Em Desenvolvimento:</h4>
                        <div className="text-xs bg-muted/50 p-2 rounded opacity-50">
                          Code Reviews: {multipliers.codeReviews}x ⏳
                        </div>
                        <div className="text-xs bg-muted/50 p-2 rounded opacity-50">
                          Stars/Forks: {multipliers.starsAndForks}x ⏳
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-xs italic text-muted-foreground">Estilo: {classInfo.playstyle}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-background rounded-lg p-4 space-y-3">
                <h3 className="font-bold text-sm">Como funcionam os multiplicadores:</h3>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Os bônus são aplicados APÓS o cálculo base de XP</li>
                  <li>Multiplicadores acima de 1.0 aumentam o XP ganho</li>
                  <li>Multiplicadores abaixo de 1.0 reduzem o XP ganho</li>
                  <li>Escolha a classe que combina com seu estilo de desenvolvimento!</li>
                  <li><strong className="text-orange-500">XP Base Atual:</strong> 5 XP/commit, 40 XP/PR, 15 XP/issue</li>
                </ul>
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
                      <th className="text-left py-3 px-4">Dias (~200 XP/dia)</th>
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
                        <td className="py-3 px-4 text-sm">
                          <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-mono">
                            {item.days}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{item.equivalent}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p className="text-xs text-center font-mono">
                  <span className="text-orange-500 font-bold">Nova Fórmula (v2.0):</span> XP = Level² × 100 + Level × 50
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  Progressão linear e balanceada para manter engajamento a longo prazo
                </p>
              </div>
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
                  <h3 className="font-bold text-sm mb-2 text-orange-500">Sistema Anti-Exploit</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>✅ Cap diário: {XP_CONSTANTS.MAX_COMMIT_XP_PER_DAY} XP/dia</li>
                    <li>✅ Commits vazios = 0 XP</li>
                    <li>✅ Multiplicadores não acumulam</li>
                    <li>✅ SHA único previne duplicação</li>
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
                      <li>Repo com 1k+ stars: +30% XP (reduzido)</li>
                      <li>Repo com 10k+ stars: +50% XP (reduzido)</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm mb-2 text-orange-500">Sistema Anti-Exploit</h3>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>✅ Cap diário: {XP_CONSTANTS.MAX_PR_XP_PER_DAY} XP/dia</li>
                      <li>✅ Repos próprios: -50% XP</li>
                      <li>✅ PR número único previne duplicação</li>
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
                <div className="pt-4 border-t border-border">
                  <h3 className="font-bold text-sm mb-2 text-orange-500">Sistema Anti-Farming</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>✅ Cap diário: {XP_CONSTANTS.MAX_STARS_XP_PER_DAY} XP/dia</li>
                    <li>✅ Impossível farmar milhares de XP</li>
                  </ul>
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
                  <h3 className="font-bold text-sm mb-2 text-orange-500">Sistema Anti-Exploit</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>✅ Cap diário: {XP_CONSTANTS.MAX_REVIEWS_XP_PER_DAY} XP/dia</li>
                    <li>✅ Reviews spam não geram XP extra</li>
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
                <div className="pt-4 border-t border-border">
                  <h3 className="font-bold text-sm mb-2 text-orange-500">Sistema Anti-Exploit</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>✅ Cap diário: {XP_CONSTANTS.MAX_ISSUES_XP_PER_DAY} XP/dia</li>
                  </ul>
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

          <Card className="bg-orange-500/10 border-orange-500/50">
            <CardContent className="space-y-6">
              <div className="flex items-center gap-2">
                <FaFire className="text-orange-500 text-2xl" />
                <h2 className="text-2xl font-bold">Sistema Anti-Exploit v2.0</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Caps inteligentes por tipo de atividade previnem farming e mantém competição justa
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-background rounded-lg border border-orange-500/30">
                  <p className="font-bold mb-2 text-orange-500">Cap Geral Diário</p>
                  <p className="text-3xl font-black">{XP_CONSTANTS.MAX_XP_PER_DAY} XP</p>
                  <p className="text-xs text-muted-foreground mt-2">Reduzido de 1000 XP (-50%)</p>
                </div>
                <div className="p-4 bg-background rounded-lg border border-border">
                  <p className="font-bold mb-2">Commits</p>
                  <p className="text-2xl font-black">{XP_CONSTANTS.MAX_COMMIT_XP_PER_DAY} XP/dia</p>
                  <p className="text-xs text-muted-foreground mt-2">40% do cap total</p>
                </div>
                <div className="p-4 bg-background rounded-lg border border-border">
                  <p className="font-bold mb-2">Pull Requests</p>
                  <p className="text-2xl font-black">{XP_CONSTANTS.MAX_PR_XP_PER_DAY} XP/dia</p>
                  <p className="text-xs text-muted-foreground mt-2">30% do cap total</p>
                </div>
                <div className="p-4 bg-background rounded-lg border border-border">
                  <p className="font-bold mb-2">Code Reviews</p>
                  <p className="text-2xl font-black">{XP_CONSTANTS.MAX_REVIEWS_XP_PER_DAY} XP/dia</p>
                  <p className="text-xs text-muted-foreground mt-2">20% do cap total</p>
                </div>
                <div className="p-4 bg-background rounded-lg border border-border">
                  <p className="font-bold mb-2">Issues</p>
                  <p className="text-2xl font-black">{XP_CONSTANTS.MAX_ISSUES_XP_PER_DAY} XP/dia</p>
                  <p className="text-xs text-muted-foreground mt-2">20% do cap total</p>
                </div>
                <div className="p-4 bg-background rounded-lg border border-border">
                  <p className="font-bold mb-2">Stars/Forks</p>
                  <p className="text-2xl font-black">{XP_CONSTANTS.MAX_STARS_XP_PER_DAY} XP/dia</p>
                  <p className="text-xs text-muted-foreground mt-2">10% do cap total</p>
                </div>
              </div>
              <div className="bg-background rounded-lg p-4 space-y-2">
                <h3 className="font-bold text-sm">Proteções Ativas:</h3>
                <ul className="text-xs text-muted-foreground space-y-1 grid md:grid-cols-2 gap-2">
                  <li>✅ Commit SHA único (anti-duplicação)</li>
                  <li>✅ PR número único (anti-duplicação)</li>
                  <li>✅ Multiplicadores não acumulam</li>
                  <li>✅ Caps por tipo de atividade</li>
                  <li>✅ Validação em sync e webhook</li>
                  <li>✅ Detecção de atividades duplicadas</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <h2 className="text-2xl font-bold">Sistema de Multiplicadores v2.0</h2>
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-4">
                <p className="text-sm font-bold text-orange-500 mb-2">⚠️ Mudança Importante:</p>
                <p className="text-xs text-muted-foreground">
                  Multiplicadores agora usam apenas o MAIOR valor aplicável, ao invés de acumular. Isso previne exploits
                  de XP exponencial.
                </p>
              </div>
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
                  <span className="font-bold">1.5x (max)</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-sm">Bônus de classe (varia)</span>
                  <span className="font-bold">0.85x - 1.4x</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic">
                Exemplo: Commit externo com bônus de classe usa o MAIOR entre 1.5x (externo) ou 1.3x (classe), não 1.95x
                (1.5 × 1.3).
              </p>
            </CardContent>
          </Card>

          <Card className="bg-blue-500/10 border-blue-500/50">
            <CardContent className="space-y-4">
              <h2 className="text-2xl font-bold">Ritmo de Progressão Esperado (v2.0)</h2>
              <p className="text-sm text-muted-foreground">
                Progressão balanceada baseada em ~200 XP/dia com atividades diversificadas
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-background rounded-lg">
                  <h3 className="font-bold mb-2">Usuário Casual</h3>
                  <p className="text-sm text-muted-foreground mb-3">~100 XP/dia</p>
                  <p className="text-lg font-bold">Level 10 em ~3 meses</p>
                  <p className="text-xs text-muted-foreground mt-1">Contribuições esporádicas</p>
                </div>
                <div className="p-4 bg-background rounded-lg">
                  <h3 className="font-bold mb-2">Usuário Ativo</h3>
                  <p className="text-sm text-muted-foreground mb-3">~200 XP/dia</p>
                  <p className="text-lg font-bold">Level 10 em ~52 dias</p>
                  <p className="text-xs text-muted-foreground mt-1">Contribuições diárias</p>
                </div>
                <div className="p-4 bg-background rounded-lg">
                  <h3 className="font-bold mb-2">Power User</h3>
                  <p className="text-sm text-muted-foreground mb-3">~500 XP/dia (cap)</p>
                  <p className="text-lg font-bold">Level 20 em ~6 meses</p>
                  <p className="text-xs text-muted-foreground mt-1">Atinge caps diários</p>
                </div>
              </div>
              <div className="bg-background rounded-lg p-4 space-y-2">
                <h3 className="font-bold text-sm">Marcos de Progressão:</h3>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Level 10: ~52 dias (antes era 12 dias) - Mais desafiador ✅</li>
                  <li>• Level 20: ~205 dias (antes era 97 dias) - Mais engajamento de longo prazo ✅</li>
                  <li>• Level 50: ~3.5 anos (antes era 6 anos) - Alcançável para jogadores dedicados ✅</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <div className="text-xs text-center text-muted-foreground space-y-2">
            <p>As atividades do GitHub são sincronizadas automaticamente quando você acessa o leaderboard.</p>
            <p>Cooldown de 5 minutos entre syncs. Sistema anti-duplicação e caps inteligentes ativos.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
