import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// Endpoint temporário para forçar atualização das contagens
export async function POST() {
  try {
    const adminClient = createAdminClient();

    // Buscar todas as guildas
    const { data: guilds } = await adminClient.from("guilds").select("id");

    if (!guilds) {
      return NextResponse.json({ error: "Nenhuma guilda encontrada" }, { status: 404 });
    }

    // Atualizar cada guilda
    for (const guild of guilds) {
      // Calcular total_xp
      const { data: members } = await adminClient.from("guild_members").select("user_id").eq("guild_id", guild.id);

      let totalXp = 0;
      if (members && members.length > 0) {
        const userIds = members.map((m) => m.user_id);
        const { data: characters } = await adminClient.from("characters").select("total_xp").in("user_id", userIds);

        totalXp = characters?.reduce((sum, char) => sum + (char.total_xp || 0), 0) || 0;
      }

      // Atualizar guilda
      await adminClient
        .from("guilds")
        .update({
          total_members: members?.length || 0,
          total_xp: totalXp,
          updated_at: new Date().toISOString(),
        })
        .eq("id", guild.id);
    }

    return NextResponse.json({ message: "Contagens atualizadas com sucesso" });
  } catch (error) {
    console.error("Erro ao atualizar contagens:", error);
    return NextResponse.json({ error: "Erro ao atualizar contagens" }, { status: 500 });
  }
}
