import { createAdminClient } from "./supabase/server";

// Recalcula o total_xp das guildas onde o usuário participa
// Porquê: manter guilds.total_xp consistente sempre que o XP de um membro muda
export async function recalculateGuildTotalsForUser(supabase: ReturnType<typeof createAdminClient>, userId: string) {
  const { data: userGuilds, error: userGuildsError } = await supabase
    .from("guild_members")
    .select("guild_id")
    .eq("user_id", userId);

  if (userGuildsError) throw new Error(userGuildsError.message);

  if (!userGuilds || userGuilds.length === 0) return;

  for (const gm of userGuilds as Array<{ guild_id: string }>) {
    const { data: guildMembers, error: guildMembersError } = await supabase
      .from("guild_members")
      .select("user_id")
      .eq("guild_id", gm.guild_id);

    if (guildMembersError) throw new Error(guildMembersError.message);

    const memberIds = (guildMembers || []).map((m: { user_id: string }) => m.user_id);
    if (memberIds.length === 0) {
      await supabase.from("guilds").update({ total_xp: 0 }).eq("id", gm.guild_id);
      continue;
    }

    const { data: memberCharacters, error: memberCharactersError } = await supabase
      .from("characters")
      .select("total_xp, user_id")
      .in("user_id", memberIds);

    if (memberCharactersError) throw new Error(memberCharactersError.message);

    const guildTotalXp = (memberCharacters || []).reduce((sum, c) => sum + (c.total_xp || 0), 0);

    const { error: updateGuildError } = await supabase
      .from("guilds")
      .update({ total_xp: guildTotalXp })
      .eq("id", gm.guild_id)
      .select();

    if (updateGuildError) throw new Error(updateGuildError.message);
  }
}
