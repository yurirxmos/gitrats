"use client";

export const dynamic = "force-dynamic";

import { Navbar } from "@/components/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { XP_CONSTANTS, getXpForLevel } from "@/lib/xp-system";
import { CLASS_DESCRIPTIONS, CLASS_XP_MULTIPLIERS } from "@/lib/classes";
import { FaFire } from "react-icons/fa6";

export default function Docs() {
  const levelProgression = [
    { level: 1, xp: getXpForLevel(1), equivalent: "Começando", days: "0" },
    { level: 2, xp: getXpForLevel(2), equivalent: "Primeiros commits", days: "1" },
    { level: 3, xp: getXpForLevel(3), equivalent: "Contribuidor ativo", days: "2" },
    { level: 5, xp: getXpForLevel(5), equivalent: "Dev consistente", days: "4" },
    { level: 10, xp: getXpForLevel(10), equivalent: "Desenvolvedor experiente", days: "15" },
    { level: 15, xp: getXpForLevel(15), equivalent: "Senior developer", days: "34" },
    { level: 20, xp: getXpForLevel(20), equivalent: "Expert developer", days: "60" },
    { level: 30, xp: getXpForLevel(30), equivalent: "Tech lead", days: "135" },
    { level: 50, xp: getXpForLevel(50), equivalent: "Coding deity", days: "375" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 max-w-6xl mx-auto px-8 py-12 w-full">
        <div className="flex flex-row items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">/docs</h1>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 border border-orange-500/50 rounded-full">
            <FaFire className="text-orange-500" />
            <span className="text-sm font-bold text-orange-500">Sistema Anti-Exploit Ativo</span>
          </div>
        </div>

        <div className="space-y-5">
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
                <p className="text-sm font-bold text-blue-400 mb-2">Sistema Implementado</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>
                    <strong>Commits</strong> - 10 XP base × multiplicador de classe
                  </li>
                  <li>
                    <strong>Pull Requests (criados por você)</strong> - 50 XP base × multiplicador de classe
                  </li>
                  <li>
                    <strong>Issues Resolvidas</strong> - 25 XP base × multiplicador de classe
                  </li>
                </ul>
                <p className="text-sm font-bold text-orange-400 mt-3 mb-2">Em Desenvolvimento</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>
                    <strong>Code Reviews</strong> - Aguardando API do GitHub
                  </li>
                  <li>
                    <strong>Large Commits (&gt;100 linhas)</strong> - Bônus extra para commits grandes
                  </li>
                  <li>
                    <strong>Stars/Forks nos seus repos</strong> - Reconhecimento da comunidade
                  </li>
                  <li>
                    <strong>Releases</strong> - XP por publicar versões
                  </li>
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
                          Commits: {multipliers.commits}x
                        </div>
                        <div className="text-xs bg-green-500/10 p-2 rounded border border-green-500/30">
                          Pull Requests: {multipliers.pullRequests}x
                        </div>
                        <div className="text-xs bg-green-500/10 p-2 rounded border border-green-500/30">
                          Issues: {multipliers.issuesResolved}x
                        </div>

                        <h4 className="text-sm font-bold text-orange-500 mt-4">Em Desenvolvimento:</h4>
                        <div className="text-xs bg-muted/50 p-2 rounded opacity-50">
                          Code Reviews: {multipliers.codeReviews}x
                        </div>
                        <div className="text-xs bg-muted/50 p-2 rounded opacity-50">
                          Large Commits: {multipliers.largeCommits}x
                        </div>
                        <div className="text-xs bg-muted/50 p-2 rounded opacity-50">
                          Stars/Forks: {multipliers.starsAndForks}x
                        </div>
                        <div className="text-xs bg-muted/50 p-2 rounded opacity-50">
                          Releases: {multipliers.releases}x
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
                  <li>
                    <strong className="text-orange-500">XP Base Atual:</strong> 10 XP/commit, 50 XP/PR, 25 XP/issue
                  </li>
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
                      <th className="text-left py-3 px-4">Dias (~10 commits/dia)</th>
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
                  <span className="text-orange-500 font-bold">Fórmula Acelerada (v3.0):</span> XP = Level² × 15
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  Progressão rápida: Level 10 em 15 dias (~10 commits/dia)
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="space-y-4">
                <h2 className="text-xl font-bold">Commits</h2>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-green-500/10 border border-green-500/30 rounded">
                    <span className="text-sm font-bold text-green-400">XP Base</span>
                    <span className="font-bold text-2xl text-green-400">10 XP</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cada commit conta igualmente. Multiplicado pela classe do personagem.
                  </p>
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-orange-400 font-bold mb-1">Exemplo com Ogro (+25%):</p>
                    <p className="text-xs text-muted-foreground">1 commit = 10 × 1.25 = 12.5 XP</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4">
                <h2 className="text-xl font-bold">Pull Requests</h2>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                    <span className="text-sm font-bold text-blue-400">XP Base</span>
                    <span className="font-bold text-2xl text-blue-400">50 XP</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cada PR criado/aberto por você (não conta quem aprova ou faz merge). Multiplicado pela classe do
                    personagem.
                  </p>
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-orange-400 font-bold mb-1">Exemplo com Guerreiro (+25%):</p>
                    <p className="text-xs text-muted-foreground">1 PR = 50 × 1.25 = 62 XP</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4">
                <h2 className="text-xl font-bold">Issues Resolvidas</h2>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-purple-500/10 border border-purple-500/30 rounded">
                    <span className="text-sm font-bold text-purple-400">XP Base</span>
                    <span className="font-bold text-2xl text-purple-400">25 XP</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cada issue fechada. Multiplicado pela classe do personagem.
                  </p>
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-orange-400 font-bold mb-1">Exemplo com Mago (+30%):</p>
                    <p className="text-xs text-muted-foreground">1 issue = 25 × 1.3 = 32.5 XP</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="space-y-4">
              <h2 className="text-xl font-bold">Sistema de Baseline (XP Inicial)</h2>
              <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
                <p className="text-sm font-bold text-green-400 mb-2">Como Funciona</p>
                <ul className="text-xs text-muted-foreground space-y-2">
                  <li>
                    <strong>Primeira sincronização:</strong> Você recebe XP pelas atividades dos últimos 7 dias
                  </li>
                  <li>
                    <strong>Histórico anterior:</strong> Tudo antes dos últimos 7 dias vira "baseline" (não gera XP)
                  </li>
                  <li>
                    <strong>Syncs seguintes:</strong> Apenas atividades NOVAS após entrar na plataforma geram XP
                  </li>
                  <li>
                    <strong>Exemplo:</strong> Se você tem 500 commits totais e 10 nos últimos 7 dias, recebe XP pelos 10
                    commits. Os 490 anteriores viram baseline
                  </li>
                  <li>
                    <strong>Justo:</strong> Você começa com algum XP se foi ativo recentemente, mas não se beneficia de
                    todo o histórico
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <h2 className="text-xl font-bold">Sincronização Automática</h2>
              <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
                <p className="text-sm font-bold text-blue-400 mb-2">Auto-Sync</p>
                <ul className="text-xs text-muted-foreground space-y-2">
                  <li>
                    <strong>Intervalo:</strong> A cada 10 minutos em background
                  </li>
                  <li>
                    <strong>Silencioso:</strong> Não interrompe seu fluxo de trabalho
                  </li>
                  <li>
                    <strong>Eficiente:</strong> Só sincroniza se houver novas atividades
                  </li>
                  <li>
                    <strong>Cooldown:</strong> Previne spam de requisições ao GitHub
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <h2 className="text-2xl font-bold">Funcionalidades Futuras</h2>
              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-bold text-sm mb-2 text-orange-500">Em Desenvolvimento</h3>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>
                      <strong>Code Reviews:</strong> XP por revisar PRs de outros devs
                    </li>
                    <li>
                      <strong>Large Commits:</strong> Bônus extra para commits grandes (&gt;100 linhas)
                    </li>
                    <li>
                      <strong>Stars/Forks:</strong> Reconhecimento da comunidade nos seus repos
                    </li>
                    <li>
                      <strong>Releases:</strong> XP por publicar versões de projetos
                    </li>
                    <li>
                      <strong>Guilds:</strong> Sistema de grupos e competições entre times
                    </li>
                    <li>
                      <strong>Achievements:</strong> Conquistas especiais e badges
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <h2 className="text-2xl font-bold">Bônus de Streak (Em Desenvolvimento)</h2>
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
              <div className="bg-background rounded-lg p-4 space-y-3">
                <h3 className="font-bold text-sm mb-2">Sistema Anti-Exploit</h3>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>Commit SHA único (anti-duplicação)</li>
                  <li>PR número único (anti-duplicação)</li>
                  <li>Multiplicadores não acumulam</li>
                  <li>Caps por tipo de atividade</li>
                  <li>Validação em sync e webhook</li>
                  <li>Detecção de atividades duplicadas</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <h2 className="text-2xl font-bold">Sistema de Multiplicadores v2.0</h2>
              <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-4">
                <p className="text-sm font-bold text-orange-500 mb-2">Mudança Importante:</p>
                <p className="text-xs text-muted-foreground">
                  A fórmula foi simplificada drasticamente. Agora é <strong>Level² × 15</strong> ao invés de Level² ×
                  100 + Level × 50. Isso permite alcançar Level 10 em apenas 15 dias de atividade consistente (~10
                  commits/dia ou 2 PRs/dia).
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
              <h2 className="text-2xl font-bold">Ritmo de Progressão Esperado (v3.0 ACELERADO)</h2>
              <p className="text-sm text-muted-foreground">
                Progressão rápida baseada em ~100 XP/dia (~10 commits diários)
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-background rounded-lg">
                  <h3 className="font-bold mb-2">Usuário Casual</h3>
                  <p className="text-sm text-muted-foreground mb-3">~50 XP/dia</p>
                  <p className="text-lg font-bold">Level 10 em ~30 dias</p>
                  <p className="text-xs text-muted-foreground mt-1">5 commits/dia</p>
                </div>
                <div className="p-4 bg-background rounded-lg">
                  <h3 className="font-bold mb-2">Usuário Ativo</h3>
                  <p className="text-sm text-muted-foreground mb-3">~100 XP/dia</p>
                  <p className="text-lg font-bold">Level 10 em ~15 dias</p>
                  <p className="text-xs text-muted-foreground mt-1">10 commits/dia</p>
                </div>
                <div className="p-4 bg-background rounded-lg">
                  <h3 className="font-bold mb-2">Power User</h3>
                  <p className="text-sm text-muted-foreground mb-3">~200 XP/dia</p>
                  <p className="text-lg font-bold">Level 20 em ~30 dias</p>
                  <p className="text-xs text-muted-foreground mt-1">20 commits/dia + PRs</p>
                </div>
              </div>
              <div className="bg-background rounded-lg p-4 space-y-2">
                <h3 className="font-bold text-sm">Marcos de Progressão Acelerada:</h3>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Level 5: ~4 dias (375 XP) - Contribuidor ativo</li>
                  <li>• Level 10: ~15 dias (1.500 XP) - Desenvolvedor experiente</li>
                  <li>• Level 20: ~60 dias (6.000 XP) - Expert developer</li>
                  <li>• Level 50: ~1 ano (37.500 XP) - Coding deity</li>
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
