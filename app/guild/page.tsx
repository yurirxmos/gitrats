"use client";

import { useState } from "react";
import Image from "next/image";
import { Navbar } from "@/components/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useGuild } from "@/hooks/use-guild";
import { useUserContext } from "@/contexts/user-context";
import { getCharacterAvatar } from "@/lib/character-assets";
import { getCurrentRank } from "@/lib/class-evolution";
import { FaUsers, FaPlus, FaTrophy, FaRightFromBracket, FaTrash, FaCheck, FaXmark, FaCrown } from "react-icons/fa6";

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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (!confirm("Tem certeza que deseja deletar a guilda? Esta ação não pode ser desfeita.")) return;

    setError("");
    try {
      await deleteGuild();
      setSuccess("Guilda deletada");
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!user || !hasCharacter) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
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
        <Navbar />
        <main className="flex-1 max-w-6xl mx-auto w-full p-8">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background relative bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px]">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <FaUsers className="text-3xl" />
            <h1 className="text-3xl font-black">GUILDAS</h1>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4 mb-6">
            <p className="text-green-500 text-sm">{success}</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {/* Guilda Atual ou Criar Guilda */}
          {guild ? (
            <Card>
              <CardContent>
                <div className="flex flex-row gap-2 items-center w-full">
                  <div className="flex items-start gap-2 w-full">
                    <div>
                      <h2 className="text-2xl font-black">
                        {guild.name} {guild.tag && <span className="text-lg text-muted-foreground">[{guild.tag}]</span>}
                      </h2>
                      {guild.description && <p className="text-sm text-muted-foreground mt-1">{guild.description}</p>}
                    </div>
                    {isOwner && <FaCrown className="text-yellow-500 text-2xl" />}
                  </div>

                  <div className="flex flex-row items-center gap-4">
                    <div className="bg-muted rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold">{guild.total_members}</p>
                      <p className="text-xs text-muted-foreground">Membros</p>
                    </div>
                    <div className="bg-muted rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold">{guild.total_xp.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">XP Total</p>
                    </div>
                  </div>
                </div>

                {isOwner && (
                  <div className="space-y-4 mb-6">
                    {/* Convites Pendentes dentro do card da guilda usando invites do hook */}
                    {isOwner && invites.filter(
                      (invite) => invite.status === "pending" && invite.guild_id === guild.id
                    ).length > 0 && (
                      <div className="space-y-3">
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
                                  <p className="font-bold">{(invite as any).invited_username || invite.invited_user_id}</p>
                                  <p className="text-xs text-muted-foreground">Enviado em {new Date(invite.created_at).toLocaleString()}</p>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleCancelInvite(invite.id)}
                                  >
                                    <FaXmark />
                                  </Button>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                    <div className="space-y-3">
                      <h3 className="font-bold text-sm">Convidar Membro</h3>
                      <div className="flex gap-2">
                        <Input
                          placeholder="GitHub username ou nick do personagem"
                          value={inviteUsername}
                          onChange={(e) => setInviteUsername(e.target.value)}
                          disabled={isSubmitting}
                        />
                        <Button
                          onClick={handleInvite}
                          disabled={isSubmitting}
                        >
                          <FaPlus />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {!isOwner && (
                    <Button
                      variant="outline"
                      onClick={handleLeaveGuild}
                      className="w-full"
                    >
                      <FaRightFromBracket className="ml-auto w-fit text-xs" />
                      Sair da Guilda
                    </Button>
                  )}
                  {isOwner && (
                    <Button
                      variant="destructive"
                      onClick={handleDeleteGuild}
                      className="ml-auto w-fit text-xs"
                    >
                      <FaTrash />
                      Deletar Guilda
                    </Button>
                  )}
                </div>
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

          {/* Membros */}
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
    </div>
  );
}
