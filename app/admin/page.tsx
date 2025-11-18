"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";

export default function AdminPage() {
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [achievementResult, setAchievementResult] = useState<any>(null);
  const [analyzeResult, setAnalyzeResult] = useState<any>(null);
  const [resetResult, setResetResult] = useState<any>(null);
  const [deleteResult, setDeleteResult] = useState<any>(null);
  const [resyncResult, setResyncResult] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setChecking(false);
        setIsAuthorized(false);
        return;
      }

      const githubUsername = user.user_metadata?.user_name;

      if (githubUsername !== "yurirxmos") {
        setChecking(false);
        setIsAuthorized(false);
        return;
      }

      setIsAuthorized(true);
      setChecking(false);
    };

    checkAdmin();
  }, [user]);

  const resetUser = async () => {
    const username = prompt("Digite o username para RESETAR completamente:");

    if (!username) return;

    if (
      !confirm(`⚠️ ATENÇÃO: Isso vai RESETAR COMPLETAMENTE os dados de ${username} baseado no GitHub real. Continuar?`)
    ) {
      return;
    }

    setLoading(true);
    setResetResult(null);

    try {
      const res = await fetch("/api/debug/reset-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      console.log("[Admin] Resultado do reset:", data);
      setResetResult(data);
    } catch (error) {
      console.error("Erro ao resetar usuário:", error);
      setResetResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const grantAchievement = async (achievementType: string) => {
    const username = prompt(`Digite o username para conceder "${achievementType}":`);

    if (!username) return;

    if (!confirm(`Conceder achievement "${achievementType}" para ${username}?`)) {
      return;
    }

    setLoading(true);
    setAchievementResult(null);

    try {
      const res = await fetch("/api/admin/grant-achievement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, achievementType }),
      });
      const data = await res.json();
      console.log("[Admin] Resultado do achievement:", data);
      setAchievementResult(data);
    } catch (error) {
      console.error("Erro ao conceder achievement:", error);
      setAchievementResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async () => {
    const username = prompt("Digite o username do GitHub para DELETAR (irreversível):");

    if (!username) return;

    if (
      !confirm(
        `⚠️ ATENÇÃO: Isso vai DELETAR PERMANENTEMENTE a conta do usuário ${username}. Esta ação é irreversível. Continuar?`
      )
    ) {
      return;
    }

    setLoading(true);
    setDeleteResult(null);

    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubUsername: username }),
      });
      const data = await res.json();
      console.log("[Admin] Resultado da deleção:", data);
      setDeleteResult(data);
    } catch (error) {
      console.error("Erro ao deletar usuário:", error);
      setDeleteResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Verificando permissões...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-4xl font-bold">🚫 Acesso Negado</h1>
        <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
        <Button onClick={() => router.push("/leaderboard")}>Voltar ao Leaderboard</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold">Admin Panel</h1>
          <Button
            onClick={() => router.push("/leaderboard")}
            variant="outline"
          >
            Voltar ao Leaderboard
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-4">Ferramentas de Administração</h2>
            <div className="flex gap-4 flex-wrap">
              <Button
                onClick={resetUser}
                disabled={loading}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
              >
                Resetar Usuário
              </Button>
              <Button
                onClick={deleteUser}
                disabled={loading}
                variant="destructive"
                className="bg-red-800 hover:bg-red-900"
              >
                Deletar Usuário
              </Button>
              <Button
                onClick={async () => {
                  if (
                    !confirm(
                      "⚠️ ATENÇÃO: Executar resincronização de TODOS os usuários (apenas ambiente local). Continuar?"
                    )
                  ) {
                    return;
                  }

                  setLoading(true);
                  setResyncResult(null);

                  try {
                    const res = await fetch("/api/debug/fix-all-users", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                    });
                    const data = await res.json();
                    console.log("[Admin] Resultado resincronização geral:", data);
                    setResyncResult(data);
                  } catch (error) {
                    console.error("Erro ao resincronizar todos:", error);
                    setResyncResult({ error: String(error) });
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
              >
                Resincronizar Todos
              </Button>
              <Button
                onClick={async () => {
                  const username = prompt("Digite o username para analisar XP (ex: yurirxmos):");
                  if (!username) return;
                  setLoading(true);
                  setAnalyzeResult(null);
                  try {
                    const res = await fetch("/api/admin/analyze-xp", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ username }),
                    });
                    const data = await res.json();
                    setAnalyzeResult(data);
                  } catch (err) {
                    console.error("Erro ao analisar XP:", err);
                    setAnalyzeResult({ error: String(err) });
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                variant="outline"
              >
                Analisar XP
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-4">🏆 Conceder Achievements</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Conceda achievements especiais para usuários que contribuíram de forma significativa.
            </p>

            <Button
              onClick={() => grantAchievement("Contribuidor da Távola")}
              disabled={loading}
              variant="default"
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Contribuidor da Távola (+10 XP)
            </Button>
          </CardContent>
        </Card>

        {achievementResult && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold mb-4">Resultado do Achievement</h2>
              <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(achievementResult, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
        {analyzeResult && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold mb-4">Análise de XP</h2>
              <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(analyzeResult, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
        {resetResult && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold mb-4">Resultado do Reset</h2>
              <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(resetResult, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
        {deleteResult && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold mb-4">Resultado da Deleção</h2>
              <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(deleteResult, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
        {resyncResult && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold mb-4">Resultado da Resincronização</h2>
              <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(resyncResult, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
