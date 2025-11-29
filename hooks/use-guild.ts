"use client";

import { useEffect, useState } from "react";
import { useUserContext } from "@/contexts/user-context";
import type { Guild, GuildMember, GuildInvite } from "@/lib/types";

export function useGuild() {
  const { user } = useUserContext();
  const [guild, setGuild] = useState<Guild | null>(null);
  const [membership, setMembership] = useState<any>(null);
  const [members, setMembers] = useState<GuildMember[]>([]);
  const [invites, setInvites] = useState<GuildInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    if (!user) {
      setGuild(null);
      setMembership(null);
      setMembers([]);
      setInvites([]);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/guild/summary");
      const data = await response.json();

      setGuild(data.guild || null);
      setMembership(data.membership || null);
      setMembers(data.members || []);
      setInvites(data.invites || []);
    } catch (error) {
      console.error("Erro ao buscar resumo da guilda:", error);
    } finally {
      setLoading(false);
    }
  };

  const createGuild = async (name: string, description: string, tag: string) => {
    const response = await fetch("/api/guild/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, tag }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erro ao criar guilda");
    }

    await fetchSummary();
    return response.json();
  };

  const inviteMember = async (githubUsername: string) => {
    const response = await fetch("/api/guild/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ github_username: githubUsername }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erro ao enviar convite");
    }

    return response.json();
  };

  const acceptInvite = async (inviteId: string) => {
    const response = await fetch("/api/guild/accept-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite_id: inviteId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erro ao aceitar convite");
    }

    await fetchSummary();
    return response.json();
  };

  const declineInvite = async (inviteId: string) => {
    const response = await fetch("/api/guild/decline-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite_id: inviteId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erro ao recusar convite");
    }

    await fetchSummary();
    return response.json();
  };

  const cancelInvite = async (inviteId: string) => {
    const response = await fetch("/api/guild/invite/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite_id: inviteId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erro ao cancelar convite");
    }

    await fetchSummary();
    return response.json();
  };

  const leaveGuild = async () => {
    const response = await fetch("/api/guild/leave", {
      method: "POST",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erro ao sair da guilda");
    }

    await fetchSummary();
    return response.json();
  };

  const deleteGuild = async () => {
    const response = await fetch("/api/guild/delete", {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erro ao deletar guilda");
    }

    await fetchSummary();
    return response.json();
  };

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return {
    guild,
    membership,
    members,
    invites,
    loading,
    isOwner: membership?.role === "owner",
    createGuild,
    inviteMember,
    acceptInvite,
    declineInvite,
    leaveGuild,
    deleteGuild,
    refreshGuild: fetchSummary,
    refreshInvites: fetchSummary,
    cancelInvite,
  };
}
