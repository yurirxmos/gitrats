"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DebugPage() {
  const [status, setStatus] = useState<any>(null);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const checkStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/debug/sync-status");
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      console.error("Erro ao verificar status:", error);
      setStatus({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const forceSync = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/github/sync", { method: "POST" });
      const data = await res.json();
      setSyncResult(data);
      // Atualizar status após sync
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
      // Atualizar status após fix
      await checkStatus();
    } catch (error) {
      console.error("Erro ao corrigir sync:", error);
      setSyncResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-black">🔧 DEBUG - Sincronização GitHub</h1>

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
            🔧 Corrigir Sync (Resetar last_sync_at)
          </Button>
          <Button
            onClick={() => router.push("/leaderboard")}
            variant="secondary"
          >
            ← Voltar ao Leaderboard
          </Button>
        </div>

        {status?.diff && (
          <Card className="border-yellow-500">
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold mb-2">⚠️ Análise Rápida</h2>
              {status.diff.commits_diff > 0 || status.diff.prs_diff > 0 ? (
                <div className="space-y-2">
                  <p className="text-yellow-500 font-bold">❌ Dados NÃO sincronizados!</p>
                  <p className="text-sm">
                    Faltam <strong>{status.diff.commits_diff} commits</strong> e{" "}
                    <strong>{status.diff.prs_diff} PRs</strong> para serem salvos no banco.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {status.github_stats_db?.last_sync_at
                      ? "✅ last_sync_at está preenchido → Use o botão '🔧 Corrigir Sync' e depois 'Forçar Sincronização'"
                      : "⏳ last_sync_at está null → Use o botão 'Forçar Sincronização'"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-green-500 font-bold">✅ Dados sincronizados!</p>
                  <p className="text-sm">
                    Banco: <strong>{status.github_stats_db.total_commits} commits</strong>,{" "}
                    <strong>{status.github_stats_db.total_prs} PRs</strong>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Agora você vai ganhar XP apenas por NOVAS atividades. Faça novos commits e aguarde a sincronização
                    automática!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {status && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold mb-4">📊 Status Atual</h2>
              <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(status, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {syncResult && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold mb-4">🔄 Resultado da Sincronização</h2>
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
