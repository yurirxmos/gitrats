"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as FA6 from "react-icons/fa6";

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
  const [showGrantAchievementDialog, setShowGrantAchievementDialog] = useState(false);
  const [achievements, setAchievements] = useState<
    Array<{ id: string; code: string; name: string; xp_reward: number }>
  >([]);
  const [selectedAchievement, setSelectedAchievement] = useState<string>("");
  const [targetUsername, setTargetUsername] = useState("");
  const [newAchievement, setNewAchievement] = useState({
    code: "",
    name: "",
    description: "",
    xp_reward: 0,
    icon: "FaTrophy",
    color: "text-amber-500",
  });
  const [iconSearchTerm, setIconSearchTerm] = useState("");

  const availableIcons = Object.keys(FA6)
    .filter((key) => key.startsWith("Fa"))
    .filter((key) => iconSearchTerm === "" || key.toLowerCase().includes(iconSearchTerm.toLowerCase()));

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
            // Carregar achievements
            const achievementsRes = await fetch("/api/admin/achievements");
            if (achievementsRes.ok) {
              const achievementsData = await achievementsRes.json();
              if (achievementsData.success) {
                setAchievements(achievementsData.data);
              }
            }
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

  const grantAchievement = async () => {
    if (!selectedAchievement || !targetUsername) {
      alert("Selecione um achievement e digite um username");
      return;
    }

    const achievement = achievements.find((a) => a.code === selectedAchievement);
    if (!achievement) return;

    if (!confirm(`Conceder "${achievement.name}" para ${targetUsername}?`)) {
      return;
    }

    setLoading(true);
    setAchievementResult(null);

    try {
      const res = await fetch("/api/admin/grant-achievement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: targetUsername, achievementType: achievement.name }),
      });
      const data = await res.json();
      setAchievementResult(data);
      setShowGrantAchievementDialog(false);
      setTargetUsername("");
      setSelectedAchievement("");
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
        body: JSON.stringify({
          code: newAchievement.code,
          name: newAchievement.name,
          description: newAchievement.description,
          xp_reward: newAchievement.xp_reward,
          icon: newAchievement.icon,
          color: newAchievement.color,
        }),
      });
      const data = await res.json();

      if (data.success) {
        alert("Achievement criado com sucesso!\n\n✅ Metadados visuais salvos automaticamente.");
        setShowCreateAchievementDialog(false);
        setNewAchievement({
          code: "",
          name: "",
          description: "",
          xp_reward: 0,
          icon: "FaTrophy",
          color: "text-amber-500",
        });
        setIconSearchTerm("");
        // Recarregar lista de achievements
        const achievementsRes = await fetch("/api/admin/achievements");
        if (achievementsRes.ok) {
          const achievementsData = await achievementsRes.json();
          if (achievementsData.success) {
            setAchievements(achievementsData.data);
          }
        }
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

        <div className="grid grid-cols-2 gap-5">
          <Card>
            <CardContent>
              <h2 className="text-xl font-bold mb-4">Ferramentas de Administração</h2>
              <div className="flex flex-col gap-4 flex-wrap">
                <Button
                  onClick={deleteUser}
                  disabled={loading}
                  variant="destructive"
                  className="bg-red-800 hover:bg-red-900"
                >
                  Deletar Usuário
                </Button>

                <div className="grid grid-cols-2 gap-5">
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
                    variant="outline"
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
                  >
                    Recalcular XP Usuário
                  </Button>
                </div>

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
              <h2 className="text-xl font-bold mb-4">Achievements</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Conceda achievements especiais para usuários que contribuíram de forma significativa.
              </p>

              <div className="flex gap-3 flex-wrap w-full">
                <Button
                  onClick={() => setShowGrantAchievementDialog(true)}
                  disabled={loading}
                  variant="outline"
                  className="flex-1"
                >
                  Conceder Achievement
                </Button>
                <Button
                  onClick={() => setShowCreateAchievementDialog(true)}
                  disabled={loading}
                  variant="default"
                  className="flex-1"
                >
                  + Novo Achievement
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

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
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Criar Novo Achievement</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
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
                <div className="space-y-1.5">
                  <label className="text-sm font-bold block">Ícone (React Icons FA6)</label>

                  <input
                    type="text"
                    placeholder="Buscar ícone..."
                    value={iconSearchTerm}
                    onChange={(e) => setIconSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border rounded bg-background"
                  />

                  <p className="text-xs text-muted-foreground">
                    Selecionado: <strong>{newAchievement.icon}</strong>
                  </p>

                  <ScrollArea className="h-64 border rounded p-3 bg-muted/20">
                    <div className="grid grid-cols-8 gap-2">
                      {availableIcons.map((iconName) => {
                        const IconComponent = FA6[iconName as keyof typeof FA6] as React.ComponentType<{
                          className?: string;
                        }>;
                        const isSelected = newAchievement.icon === iconName;
                        return (
                          <button
                            key={iconName}
                            type="button"
                            onClick={() => setNewAchievement({ ...newAchievement, icon: iconName })}
                            className={`p-3 rounded border-2 transition-all hover:bg-accent ${
                              isSelected ? "border-amber-500 bg-amber-500/10" : "border-transparent"
                            }`}
                            title={iconName}
                          >
                            <IconComponent className="w-6 h-6 mx-auto" />
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
                <div>
                  <label className="text-sm font-bold mb-1 block">Cor (Tailwind)</label>
                  <input
                    type="text"
                    placeholder="ex: text-amber-500"
                    value={newAchievement.color}
                    onChange={(e) => setNewAchievement({ ...newAchievement, color: e.target.value })}
                    className="w-full px-3 py-2 border rounded bg-background"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Padrão: text-amber-500</p>
                </div>
              </div>
            </ScrollArea>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={createAchievement}
                disabled={loading}
                className="flex-1"
              >
                Criar Achievement
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateAchievementDialog(false);
                  setIconSearchTerm("");
                }}
                disabled={loading}
              >
                Cancelar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showGrantAchievementDialog}
          onOpenChange={setShowGrantAchievementDialog}
        >
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Conceder Achievement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-bold mb-1 block">Username do GitHub *</label>
                <input
                  type="text"
                  placeholder="ex: yurirxmos"
                  value={targetUsername}
                  onChange={(e) => setTargetUsername(e.target.value)}
                  className="w-full px-3 py-2 border rounded bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-bold mb-2 block">Selecione o Achievement *</label>
                <ScrollArea className="h-64 border rounded p-3 bg-muted/20">
                  <div className="space-y-2">
                    {achievements.map((achievement) => (
                      <button
                        key={achievement.code}
                        type="button"
                        onClick={() => setSelectedAchievement(achievement.code)}
                        className={`w-full text-left p-3 rounded border-2 transition-all hover:bg-accent ${
                          selectedAchievement === achievement.code
                            ? "border-amber-500 bg-amber-500/10"
                            : "border-transparent bg-muted/50"
                        }`}
                      >
                        <div className="font-bold">{achievement.name}</div>
                        <div className="text-xs text-amber-500 mt-1">+{achievement.xp_reward} XP</div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={grantAchievement}
                  disabled={loading}
                  className="flex-1"
                >
                  Conceder Achievement
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowGrantAchievementDialog(false);
                    setTargetUsername("");
                    setSelectedAchievement("");
                  }}
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
