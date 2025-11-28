import { createClient } from "@/lib/supabase/server";

/**
 * Verifica se o usuário atual é admin
 */
export async function isUserAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    // Buscar role do usuário na tabela users
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    return userData?.role === "admin";
  } catch (error) {
    console.error("Erro ao verificar admin:", error);
    return false;
  }
}

/**
 * Retorna o usuário atual se for admin, caso contrário retorna null
 */
export async function getAdminUser() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    // Buscar role do usuário na tabela users
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData?.role !== "admin") return null;

    return user;
  } catch (error) {
    console.error("Erro ao buscar admin:", error);
    return null;
  }
}
