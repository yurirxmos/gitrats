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

  const fetchGuild = async () => {
    if (!user) {
      setGuild(null);
      setMembership(null);
      setMembers([]);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/guild");
      const data = await response.json();

      setGuild(data.guild || null);
      setMembership(data.membership || null);

      if (data.guild) {
        await fetchMembers(data.guild.id);
      } else {
        setMembers([]);
      }
    } catch (error) {
      console.error("Erro ao buscar guilda:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (guildId: string) => {
    try {
      console.log("🔍 Fetching members for guild:", guildId);
      const response = await fetch(`/api/guild/members?guild_id=${guildId}`);
      const data = await response.json();
      console.log("🔍 Members data:", data);
      setMembers(data.members || []);
    } catch (error) {
      console.error("Erro ao buscar membros:", error);
    }
  };

  const fetchInvites = async () => {
    if (!user) {
      setInvites([]);
      return;
    }

    try {
      const response = await fetch("/api/guild/invite");
      const data = await response.json();
      setInvites(data.invites || []);
    } catch (error) {
      console.error("Erro ao buscar convites:", error);
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

    await fetchGuild();
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

    await fetchGuild();
    await fetchInvites();
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

    await fetchInvites();
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

    await fetchGuild();
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

    await fetchGuild();
    return response.json();
  };

  useEffect(() => {
    fetchGuild();
    fetchInvites();
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
    refreshGuild: fetchGuild,
    refreshInvites: fetchInvites,
  };
}
