"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminPage() {
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [achievementResult, setAchievementResult] = useState<any>(null);
  const [analyzeResult, setAnalyzeResult] = useState<any>(null);
  const [resetResult, setResetResult] = useState<any>(null);
  const [deleteResult, setDeleteResult] = useState<any>(null);
  const [resyncResult, setResyncResult] = useState<any>(null);
  const [recalcResult, setRecalcResult] = useState<any>(null);
  const [singleRecalcResult, setSingleRecalcResult] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, totalGuilds: 0, totalXp: 0 });
  const [showUsersDialog, setShowUsersDialog] = useState(false);
  const [usersList, setUsersList] = useState<Array<{ github_username: string; created_at: string }>>([]);
  const [showCreateAchievementDialog, setShowCreateAchievementDialog] = useState(false);
  const [newAchievement, setNewAchievement] = useState({ code: "", name: "", description: "", xp_reward: 0 });

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setChecking(false);
        setIsAuthorized(false);
        return;
      }

      // Verificar role na tabela users
      try {
        const res = await fetch("/api/admin/stats");
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setStats(data.data);
            setIsAuthorized(true);
          } else {
            setIsAuthorized(false);
          }
        } else {
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error("Erro ao verificar admin:", error);
        setIsAuthorized(false);
      }

      setChecking(false);
    };

    checkAdmin();
  }, [user]);

  const loadUsersList = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setUsersList(data.data);
          setShowUsersDialog(true);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar lista de usuários:", error);
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
    setResetResult(null);

    try {
      const res = await fetch("/api/debug/reset-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
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

      if (!res.ok) {
        const errorData = await res.json();
        setDeleteResult({ error: errorData.error || "Erro desconhecido" });
        return;
      }

      const data = await res.json();
      setDeleteResult(data);
    } catch (error) {
      console.error("Erro ao deletar usuário:", error);
      setDeleteResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const createAchievement = async () => {
    if (!newAchievement.code || !newAchievement.name) {
      alert("Código e nome são obrigatórios");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/create-achievement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAchievement),
      });
      const data = await res.json();

      if (data.success) {
        alert("Achievement criado com sucesso!");
        setShowCreateAchievementDialog(false);
        setNewAchievement({ code: "", name: "", description: "", xp_reward: 0 });
      } else {
        alert(data.error || "Erro ao criar achievement");
      }
    } catch (error) {
      console.error("Erro ao criar achievement:", error);
      alert("Erro ao criar achievement");
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
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold">/ADMIN</h1>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={loadUsersList}
          >
            <CardContent>
              <h2 className="text-xl font-bold mb-4">Usuários</h2>
              <p className="text-3xl">{stats.totalUsers}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h2 className="text-xl font-bold mb-4">Guildas</h2>
              <p className="text-3xl">{stats.totalGuilds}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h2 className="text-xl font-bold mb-4">XP Total</h2>
              <p className="text-3xl">{stats.totalXp.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent>
            <h2 className="text-xl font-bold mb-4">Ferramentas de Administração</h2>
            <div className="flex gap-4 flex-wrap">
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
                  if (
                    !confirm(
                      "🔄 RECALCULAR XP DE TODOS: Isso vai recalcular o XP de TODOS os usuários do zero usando os multiplicadores ATUALIZADOS das classes. Continuar?"
                    )
                  ) {
                    return;
                  }

                  setLoading(true);
                  setRecalcResult(null);

                  try {
                    const res = await fetch("/api/admin/recalculate-all-xp", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                    });
                    const data = await res.json();
                    setRecalcResult(data);
                  } catch (error) {
                    console.error("Erro ao recalcular XP:", error);
                    setRecalcResult({ error: String(error) });
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                variant="default"
                className="bg-blue-600 hover:bg-blue-700"
              >
                Recalcular XP de Todos
              </Button>
              <Button
                onClick={async () => {
                  const username = prompt("Username para RECALCULAR XP específico:");
                  if (!username) return;
                  if (!confirm(`Recalcular XP apenas de ${username}?`)) return;
                  setLoading(true);
                  setSingleRecalcResult(null);
                  try {
                    const res = await fetch("/api/admin/recalculate-user-xp", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ username }),
                    });
                    const data = await res.json();
                    setSingleRecalcResult(data);
                  } catch (err) {
                    console.error("Erro ao recalcular XP usuário:", err);
                    setSingleRecalcResult({ error: String(err) });
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                Recalcular XP Usuário
              </Button>
              <Button
                onClick={async () => {
                  const username = prompt("Digite o username para analisar XP:");
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
          <CardContent>
            <h2 className="text-xl font-bold mb-4">🏆 Conceder Achievements</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Conceda achievements especiais para usuários que contribuíram de forma significativa.
            </p>

            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={() => grantAchievement("Contribuidor da Távola")}
                disabled={loading}
                variant="default"
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                Contribuidor da Távola (+10 XP)
              </Button>
              <Button
                onClick={() => grantAchievement("Game Master")}
                disabled={loading}
                variant="default"
                className="bg-purple-600 hover:bg-purple-700"
              >
                Game Master (0 XP)
              </Button>
              <Button
                onClick={() => setShowCreateAchievementDialog(true)}
                disabled={loading}
                variant="outline"
                className="border-green-600 text-green-600 hover:bg-green-50"
              >
                + Criar Novo Achievement
              </Button>
            </div>
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
        {recalcResult && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold mb-4">Resultado do Recálculo de XP</h2>
              <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(recalcResult, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
        {singleRecalcResult && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold mb-4">Resultado do Recálculo de XP (Usuário)</h2>
              <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(singleRecalcResult, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        <Dialog
          open={showUsersDialog}
          onOpenChange={setShowUsersDialog}
        >
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Lista de Usuários ({usersList.length})</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {usersList.map((user, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-3 border rounded hover:bg-accent"
                >
                  <span className="font-mono font-semibold">{user.github_username}</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showCreateAchievementDialog}
          onOpenChange={setShowCreateAchievementDialog}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Achievement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-bold mb-1 block">Código *</label>
                <input
                  type="text"
                  placeholder="ex: game_master"
                  value={newAchievement.code}
                  onChange={(e) => setNewAchievement({ ...newAchievement, code: e.target.value })}
                  className="w-full px-3 py-2 border rounded bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-bold mb-1 block">Nome *</label>
                <input
                  type="text"
                  placeholder="ex: Game Master"
                  value={newAchievement.name}
                  onChange={(e) => setNewAchievement({ ...newAchievement, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-bold mb-1 block">Descrição</label>
                <input
                  type="text"
                  placeholder="ex: Mestre do jogo"
                  value={newAchievement.description}
                  onChange={(e) => setNewAchievement({ ...newAchievement, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-bold mb-1 block">XP Reward</label>
                <input
                  type="number"
                  placeholder="0"
                  value={newAchievement.xp_reward}
                  onChange={(e) => setNewAchievement({ ...newAchievement, xp_reward: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded bg-background"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={createAchievement}
                  disabled={loading}
                  className="flex-1"
                >
                  Criar Achievement
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateAchievementDialog(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
