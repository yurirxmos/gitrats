"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FaChartLine, FaCodeBranch, FaCodeCommit, FaCircleInfo } from "react-icons/fa6";
import { getClassXpMultiplier } from "@/lib/classes";
import { Skeleton } from "@/components/ui/skeleton";

interface XpBreakdownDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  username: string;
  characterClass: string;
  totalXp: number;
}

interface XpAnalysis {
  total_commits: number;
  total_prs: number;
  total_issues: number;
  baseline_commits: number;
  baseline_prs: number;
  baseline_issues: number;
  commits_after_join: number;
  prs_after_join: number;
  issues_after_join: number;
  commit_multiplier: number;
  pr_multiplier: number;
  issue_multiplier: number;
  xp_from_commits: number;
  xp_from_prs: number;
  xp_from_issues: number;
  xp_from_achievements: number;
  achievements: Array<{ code: string; name: string; xp_reward: number }>;
  total_xp_calculated: number;
}

export function XpBreakdownDialog({
  isOpen,
  onClose,
  userId,
  username,
  characterClass,
  totalXp,
}: XpBreakdownDialogProps) {
  const [analysis, setAnalysis] = useState<XpAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resetar analysis quando userId mudar
  useEffect(() => {
    setAnalysis(null);
    setError(null);
  }, [userId]);

  const loadAnalysis = async () => {
    if (analysis) return; // Já carregou

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/user/xp-analysis?userId=${userId}`);

      if (!response.ok) {
        throw new Error("Erro ao carregar análise de XP");
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar análise");
    } finally {
      setLoading(false);
    }
  };

  // Carregar quando abrir o dialog
  if (isOpen && !analysis && !loading) {
    loadAnalysis();
  }

  const commitMultiplier = getClassXpMultiplier(characterClass as any, "commits");
  const prMultiplier = getClassXpMultiplier(characterClass as any, "pullRequests");
  const issueMultiplier = getClassXpMultiplier(characterClass as any, "issuesResolved");

  return (
    <Dialog
      open={isOpen}
      onOpenChange={onClose}
    >
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FaChartLine className="text-blue-500" />
            Análise de XP
          </DialogTitle>
          <DialogDescription>
            <span className="text-xs text-muted-foreground">GitHub @{username}</span>
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="space-y-4 py-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {error && (
          <div className="py-8 text-center">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {!loading && !error && analysis && (
          <div className="space-y-6 py-2">
            {/* Total XP */}
            <div className="bg-primary/10 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">XP Total</p>
              <p className="text-3xl font-black">{totalXp.toLocaleString()}</p>
            </div>

            {/* Resumo de Atividades */}
            <div>
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <FaCodeCommit />
                Atividades Pós-Registro
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Commits</p>
                  <p className="text-2xl font-bold">{analysis.commits_after_join}</p>
                  <p className="text-xs text-muted-foreground">de {analysis.total_commits} totais</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Pull Requests</p>
                  <p className="text-2xl font-bold">{analysis.prs_after_join}</p>
                  <p className="text-xs text-muted-foreground">de {analysis.total_prs} totais</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Issues</p>
                  <p className="text-2xl font-bold">{analysis.issues_after_join}</p>
                  <p className="text-xs text-muted-foreground">de {analysis.total_issues} totais</p>
                </div>
              </div>
            </div>

            {/* Multiplicadores de Classe */}
            <div>
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <FaCodeBranch />
                Multiplicadores da Classe {characterClass.charAt(0).toUpperCase() + characterClass.slice(1)}
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-muted rounded-lg p-3">
                  <span className="text-sm">Commits</span>
                  <span className="font-bold text-green-500">×{commitMultiplier.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between bg-muted rounded-lg p-3">
                  <span className="text-sm">Pull Requests</span>
                  <span className="font-bold text-blue-500">×{prMultiplier.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between bg-muted rounded-lg p-3">
                  <span className="text-sm">Issues</span>
                  <span className="font-bold text-purple-500">×{issueMultiplier.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Cálculo Detalhado */}
            <div>
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <FaCircleInfo />
                Cálculo do XP
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between bg-muted rounded-lg p-3">
                  <span>
                    {analysis.commits_after_join} commits × 10 XP × {commitMultiplier.toFixed(2)}
                  </span>
                  <span className="font-bold text-green-500">{analysis.xp_from_commits.toLocaleString()} XP</span>
                </div>
                <div className="flex items-center justify-between bg-muted rounded-lg p-3">
                  <span>
                    {analysis.prs_after_join} PRs × 25 XP × {prMultiplier.toFixed(2)}
                  </span>
                  <span className="font-bold text-blue-500">{analysis.xp_from_prs.toLocaleString()} XP</span>
                </div>
                <div className="flex items-center justify-between bg-muted rounded-lg p-3">
                  <span>
                    {analysis.issues_after_join} issues × 35 XP × {issueMultiplier.toFixed(2)}
                  </span>
                  <span className="font-bold text-purple-500">{analysis.xp_from_issues.toLocaleString()} XP</span>
                </div>
                {analysis.achievements && analysis.achievements.length > 0 && (
                  <div className="flex items-center justify-between bg-muted rounded-lg p-3">
                    <span>Achievements ({analysis.achievements.length})</span>
                    <span className="font-bold text-amber-500">
                      {analysis.xp_from_achievements.toLocaleString()} XP
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between bg-primary/20 rounded-lg p-4 font-bold">
                  <span>Total</span>
                  <span className="text-lg">{analysis.total_xp_calculated.toLocaleString()} XP</span>
                </div>
              </div>
            </div>

            {/* Nota sobre Baseline */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-xs">
              <p className="font-bold mb-1">Sobre o Baseline:</p>
              <p className="text-muted-foreground">
                O baseline ({analysis.baseline_commits} commits, {analysis.baseline_prs} PRs, {analysis.baseline_issues}{" "}
                issues) representa suas atividades anteriores ao registro na plataforma. Apenas atividades após o
                registro (incluindo 7 dias retroativos) geram XP.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
