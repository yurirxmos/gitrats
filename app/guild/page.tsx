"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Navbar } from "@/components/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useGuild } from "@/hooks/use-guild";
import GuildMemberLeaderboard from "@/components/guild-member-leaderboard";
import { useUserContext } from "@/contexts/user-context";
import { getCharacterAvatar } from "@/lib/character-assets";
import { getCurrentRank } from "@/lib/class-evolution";
import {
  FaUsers,
  FaPlus,
  FaTrophy,
  FaRightFromBracket,
  FaTrash,
  FaCheck,
  FaXmark,
  FaCrown,
  FaBell,
  FaShare,
  FaUserPlus,
  FaStar,
} from "react-icons/fa6";
import { DialogTitle } from "@radix-ui/react-dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { TooltipContent, TooltipProvider, TooltipTrigger } from "@radix-ui/react-tooltip";

export default function GuildPage() {
  const { user, hasCharacter } = useUserContext();
  const {
    guild,
    membership,
    members,
    invites,
    loading,
    isOwner,
    createGuild,
    inviteMember,
    acceptInvite,
    declineInvite,
    leaveGuild,
    deleteGuild,
    refreshInvites,
    cancelInvite,
  } = useGuild();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [guildName, setGuildName] = useState("");
  const [guildDescription, setGuildDescription] = useState("");
  const [guildTag, setGuildTag] = useState("");
  const [inviteUsername, setInviteUsername] = useState("");
  const [showInviteDialog, setShowInviteDialog] = useState(false); // dialog para convidar membro
  const [showDeleteDialog, setShowDeleteDialog] = useState(false); // dialog para confirmar deleção
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleCreateGuild = async () => {
    if (!guildName.trim()) {
      setError("Nome da guilda é obrigatório");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await createGuild(guildName, guildDescription, guildTag);
      setSuccess("Guilda criada com sucesso!");
      setShowCreateDialog(false);
      setGuildName("");
      setGuildDescription("");
      setGuildTag("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteUsername.trim()) {
      setError("Username do GitHub é obrigatório");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await inviteMember(inviteUsername);
      setSuccess(`Convite enviado para @${inviteUsername}`);
      setInviteUsername("");
      await refreshInvites(); // Atualiza lista de convites pendentes
      setShowInviteDialog(false); // fecha dialog após envio
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptInvite = async (inviteId: string) => {
    setError("");
    try {
      await acceptInvite(inviteId);
      setSuccess("Convite aceito! Bem-vindo à guilda!");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    setError("");
    try {
      await declineInvite(inviteId);
      refreshInvites();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    setError("");
    try {
      await cancelInvite(inviteId);
      setSuccess("Convite cancelado");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLeaveGuild = async () => {
    if (!confirm("Tem certeza que deseja sair da guilda?")) return;

    setError("");
    try {
      await leaveGuild();
      setSuccess("Você saiu da guilda");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteGuild = async () => {
    setError("");
    try {
      await deleteGuild();
      setSuccess("Guilda deletada");
      setShowDeleteDialog(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!user || !hasCharacter) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1 flex items-center justify-center p-8">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Você precisa criar um personagem para acessar guildas</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1 max-w-6xl mx-auto w-full p-8">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="grid md:grid-rows-2 gap-6">
            <Skeleton className="h-60" />
            <Skeleton className="h-60" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background relative bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px]">
      <main className="flex-1 max-w-6xl mx-auto w-full p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <FaUsers className="text-3xl" />
            <h1 className="text-3xl font-black">/GUILD</h1>
          </div>
        </div>

        {success && (
          <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4 mb-6">
            <p className="text-green-500 text-sm">{success}</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {/* Guilda Atual ou Criar Guilda */}
          {/* Convites recebidos quando usuário não está em guilda */}
          {!guild && invites.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Convites Recebidos ({invites.length})</h2>
                  <Button
                    variant="secondary"
                    onClick={refreshInvites}
                  >
                    <FaBell className="mr-2" /> Atualizar
                  </Button>
                </div>
                <div className="space-y-3">
                  {invites.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex flex-col">
                        <p className="font-bold text-sm">
                          {invite.guild_name}{" "}
                          {invite.guild_tag ? (
                            <span className="text-xs text-muted-foreground">[{invite.guild_tag}]</span>
                          ) : null}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Convidado por @{invite.invited_by_username} em{" "}
                          {new Date(invite.created_at).toLocaleDateString()}{" "}
                          {new Date(invite.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleAcceptInvite(invite.id)}
                        >
                          <FaCheck className="mr-1" /> Aceitar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeclineInvite(invite.id)}
                        >
                          <FaXmark className="mr-1" /> Recusar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {guild ? (
            <Card>
              <CardContent>
                <div className="flex flex-row gap-2 items-center w-full">
                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex flex-row items-center gap-2">
                      <h2 className="text-2xl font-black">{guild.name}</h2>
                      <p>
                        {guild.tag && <span className="text-xs font-bold text-muted-foreground">[{guild.tag}]</span>}
                      </p>
                      {isOwner && <FaCrown className="text-yellow-500 text-sm" />}
                    </div>

                    {guild.description && <p className="text-sm text-muted-foreground">{guild.description}</p>}
                  </div>

                  <div className="flex flex-row items-center gap-3">
                    {isOwner && (
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => setShowInviteDialog(true)}
                        title="Convidar membro"
                      >
                        <FaUserPlus />
                      </Button>
                    )}
                    <Tooltip>
                      <TooltipProvider>
                        <TooltipTrigger>
                          <Button
                            className="hover:cursor-help"
                            variant="secondary"
                          >
                            <FaUsers />
                            <p className="text-xs">{guild.total_members} membros</p>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <div className="p-3 bg-secondary rounded-lg mt-1.5 transition-all shadow-sm">
                            <p className="text-xs">Total de membros na guilda</p>
                          </div>
                        </TooltipContent>
                      </TooltipProvider>
                    </Tooltip>
                    <Tooltip>
                      <TooltipProvider>
                        <TooltipTrigger>
                          <Button
                            className="hover:cursor-help"
                            variant="secondary"
                          >
                            <FaStar />
                            <p className="text-xs">{guild.total_xp.toLocaleString()} XP</p>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <div className="p-3 bg-secondary rounded-lg mt-1.5 transition-all shadow-sm">
                            <p className="text-xs">XP Total da guilda</p>
                          </div>
                        </TooltipContent>
                      </TooltipProvider>
                    </Tooltip>

                    <div className="flex gap-2">
                      {!isOwner && (
                        <Button
                          size={"icon"}
                          variant="outline"
                          onClick={handleLeaveGuild}
                        >
                          <FaRightFromBracket />
                        </Button>
                      )}
                      {isOwner && (
                        <Button
                          size={"icon"}
                          variant="destructive"
                          onClick={() => setShowDeleteDialog(true)}
                        >
                          <FaTrash />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {isOwner &&
                  invites.filter((invite) => invite.status === "pending" && invite.guild_id === guild.id).length >
                    0 && (
                    <div className="space-y-3 mb-6">
                      <h3 className="font-bold text-sm">Convites Pendentes</h3>
                      <div className="space-y-3">
                        {invites
                          .filter((invite) => invite.status === "pending" && invite.guild_id === guild.id)
                          .map((invite) => (
                            <div
                              key={invite.id}
                              className="flex items-center justify-between p-3 bg-muted rounded-lg"
                            >
                              <div>
                                <p className="font-bold text-sm">
                                  {(invite as any).invited_username || invite.invited_user_id}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Enviado em {new Date(invite.created_at).toLocaleDateString()}{" "}
                                  {new Date(invite.created_at).toLocaleTimeString()}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancelInvite(invite.id)}
                              >
                                <FaXmark />
                              </Button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <FaUsers className="text-6xl mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-bold mb-2">Você não está em uma guilda</h2>
                <p className="text-sm text-muted-foreground mb-6">Crie sua própria guilda ou aguarde um convite</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <FaPlus className="mr-2" />
                  Criar Guilda
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Ranking interno da guilda */}
          {guild && members.length > 0 && <GuildMemberLeaderboard members={members} />}

          {/* Membros (lista bruta) */}
          {guild && (
            <Card className="md:col-span-2">
              <CardContent>
                <h2 className="text-xl font-bold mb-4">Membros ({guild.total_members})</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {members.map((member) => (
                    <div
                      key={member.user_id}
                      className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                    >
                      <div className="relative w-16 h-16 bg-background rounded-lg overflow-hidden shrink-0">
                        {member.character_class && (
                          <Image
                            src={getCharacterAvatar(member.character_class, member.level || 1)}
                            alt={member.character_name || ""}
                            fill
                            className="object-contain"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="font-bold text-sm truncate">{member.character_name}</p>
                          {member.role === "owner" && <FaCrown className="text-yellow-500 text-xs shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {member.character_class && getCurrentRank(member.character_class, member.level || 1)}
                        </p>
                        <p className="text-xs text-muted-foreground">@{member.github_username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Dialog Criar Guilda */}
      <Dialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      >
        <DialogContent>
          <div className="space-y-4 py-4">
            <h2 className="text-2xl font-bold">Criar Guilda</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-bold mb-1 block">Nome da Guilda *</label>
                <Input
                  placeholder="Nome da guilda"
                  value={guildName}
                  onChange={(e) => setGuildName(e.target.value)}
                  maxLength={50}
                />
              </div>
              <div>
                <label className="text-sm font-bold mb-1 block">Tag (opcional)</label>
                <Input
                  placeholder="TAG (máx 6 caracteres)"
                  value={guildTag}
                  onChange={(e) => setGuildTag(e.target.value.toUpperCase())}
                  maxLength={6}
                />
              </div>
              <div>
                <label className="text-sm font-bold mb-1 block">Descrição (opcional)</label>
                <Input
                  placeholder="Descrição da guilda"
                  value={guildDescription}
                  onChange={(e) => setGuildDescription(e.target.value)}
                  maxLength={200}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCreateGuild}
                disabled={isSubmitting}
                className="flex-1"
              >
                Criar Guilda
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Convidar Membro */}
      <Dialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
      >
        <DialogContent>
          <DialogTitle>
            <h2 className="text-xl font-bold">Convidar Membro</h2>
          </DialogTitle>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Input
                placeholder="insira o username do GitHub aqui"
                value={inviteUsername}
                onChange={(e) => setInviteUsername(e.target.value)}
                disabled={isSubmitting}
                maxLength={64}
              />
            </div>
            <Button
              onClick={handleInvite}
              disabled={isSubmitting}
              className="flex-1 w-full"
            >
              Enviar Convite
            </Button>
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                <p className="text-red-500 text-sm">{error}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Deletar Guilda */}
      <Dialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      >
        <DialogContent>
          <DialogTitle>
            <h2 className="text-xl font-bold text-red-600">Deletar Guilda</h2>
          </DialogTitle>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja deletar a guilda <strong>{guild?.name}</strong>? Esta ação não pode ser desfeita e
              todos os membros serão removidos.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteGuild}
                disabled={isSubmitting}
                className="flex-1"
              >
                Deletar Guilda
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
