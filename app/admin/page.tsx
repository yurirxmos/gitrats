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
  const [status, setStatus] = useState<any>(null);
  const [syncResult, setSyncResult] = useState<any>(null);
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

  const checkStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/debug/sync-status");
      const data = await res.json();
      setStatus(data);
      setSyncResult(null);
    } catch (error) {
      console.error("Erro ao verificar status:", error);
    } finally {
      setLoading(false);
    }
  };

  const forceSync = async () => {
    if (!confirm("Isso vai forçar uma sincronização manual. Continuar?")) {
      return;
    }

    setLoading(true);
    try {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch("/api/github/sync", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      const data = await res.json();
      setSyncResult(data);
      await checkStatus();
    } catch (error) {
      console.error("Erro ao sincronizar:", error);
      setSyncResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const fixSync = async () => {
    if (!confirm("Isso vai resetar o last_sync_at e permitir re-sincronização. Continuar?")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/debug/fix-sync", { method: "POST" });
      const data = await res.json();
      setSyncResult(data);
      await checkStatus();
    } catch (error) {
      console.error("Erro ao corrigir sync:", error);
      setSyncResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const fixAllUsers = async () => {
    if (
      !confirm(
        "Isso vai corrigir XP inicial para TODOS os usuários que precisam. Pode levar alguns minutos. Continuar?"
      )
    ) {
      return;
    }

    setLoading(true);
    setSyncResult(null);

    try {
      const res = await fetch("/api/debug/fix-all-users", { method: "POST" });
      const data = await res.json();
      console.log("[Admin] Resultado da correção em massa:", data);
      setSyncResult(data);
    } catch (error) {
      console.error("Erro ao corrigir todos usuários:", error);
      setSyncResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const fixSpecificUsers = async () => {
    const usernames = prompt("Digite os usernames separados por vírgula (ex: yurirxmos,kayossouza):");

    if (!usernames) return;

    const usernameArray = usernames
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean);

    if (usernameArray.length === 0) {
      alert("Nenhum username válido fornecido");
      return;
    }

    if (!confirm(`Corrigir XP inicial para: ${usernameArray.join(", ")}?`)) {
      return;
    }

    setLoading(true);
    setSyncResult(null);

    try {
      const res = await fetch("/api/debug/fix-specific-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: usernameArray }),
      });
      const data = await res.json();
      console.log("[Admin] Resultado da correção específica:", data);
      setSyncResult(data);
    } catch (error) {
      console.error("Erro ao corrigir usuários específicos:", error);
      setSyncResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const resetUser = async () => {
    const username = prompt("Digite o username para RESETAR completamente:");

    if (!username) return;

    if (
      !confirm(`⚠️ ATENÇÃO: Isso vai RESETAR COMPLETAMENTE os dados de ${username} baseado no GitHub real. Continuar?`)
    ) {
      return;
    }

    setLoading(true);
    setSyncResult(null);

    try {
      const res = await fetch("/api/debug/reset-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      console.log("[Admin] Resultado do reset:", data);
      setSyncResult(data);
    } catch (error) {
      console.error("Erro ao resetar usuário:", error);
      setSyncResult({ error: String(error) });
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
          <h1 className="text-4xl font-bold">⚙️ Admin Panel</h1>
          <Button
            onClick={() => router.push("/leaderboard")}
            variant="outline"
          >
            Voltar ao Leaderboard
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-bold mb-4">🛠️ Ferramentas de Administração</h2>
            <div className="flex gap-4 flex-wrap">
              <Button
                onClick={checkStatus}
                disabled={loading}
              >
                Verificar Status
              </Button>
              <Button
                onClick={forceSync}
                disabled={loading}
                variant="destructive"
              >
                Forçar Sincronização
              </Button>
              <Button
                onClick={fixSync}
                disabled={loading}
                variant="outline"
              >
                Corrigir Sync (Resetar last_sync_at)
              </Button>
              <Button
                onClick={fixAllUsers}
                disabled={loading}
                variant="default"
                className="bg-purple-600 hover:bg-purple-700"
              >
                Corrigir TODOS Usuários
              </Button>
              <Button
                onClick={fixSpecificUsers}
                disabled={loading}
                variant="default"
                className="bg-orange-600 hover:bg-orange-700"
              >
                Corrigir Usuários Específicos
              </Button>
              <Button
                onClick={resetUser}
                disabled={loading}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
              >
                RESETAR Usuário
              </Button>
            </div>
          </CardContent>
        </Card>

        {status?.diff && (
          <Card className="border-yellow-500">
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold mb-2">📊 Análise Rápida</h2>
              {status.diff.commits_diff > 0 || status.diff.prs_diff > 0 ? (
                <div className="space-y-2">
                  <p className="text-yellow-500 font-bold">Dados desatualizados detectados!</p>
                  <p className="text-sm">
                    GitHub: <strong>{status.github_stats.totalCommits} commits</strong>,{" "}
                    <strong>{status.github_stats.totalPRs} PRs</strong>
                  </p>
                  <p className="text-sm">
                    Banco: <strong>{status.github_stats_db?.total_commits || 0} commits</strong>,{" "}
                    <strong>{status.github_stats_db?.total_prs || 0} PRs</strong>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {status.github_stats_db?.last_sync_at
                      ? "last_sync_at está preenchido → Use o botão 'Corrigir Sync' e depois 'Forçar Sincronização'"
                      : "last_sync_at está null → Use o botão 'Forçar Sincronização'"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-green-500 font-bold">✅ Dados sincronizados!</p>
                  <p className="text-sm">
                    Banco: <strong>{status.github_stats_db.total_commits} commits</strong>,{" "}
                    <strong>{status.github_stats_db.total_prs} PRs</strong>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {status && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold mb-4">📊 Status Detalhado</h2>
              <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(status, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {syncResult && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold mb-4">🔄 Resultado da Operação</h2>
              <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(syncResult, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
