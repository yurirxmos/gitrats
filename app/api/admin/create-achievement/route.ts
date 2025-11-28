import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/auth-utils";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * POST - Criar novo achievement (apenas admin)
 */
export async function POST(request: NextRequest) {
  try {
    const adminUser = await getAdminUser();

    if (!adminUser) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { code, name, description, xp_reward, icon, color } = body;

    if (!code || !name) {
      return NextResponse.json({ error: "Código e nome são obrigatórios" }, { status: 400 });
    }

    // Usar admin client para criar achievement
    const adminSupabase = createAdminClient();

    // Verificar se já existe
    const { data: existing } = await adminSupabase.from("achievements").select("id").eq("code", code).maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Achievement com este código já existe" }, { status: 400 });
    }

    // Criar achievement
    const { data, error } = await adminSupabase
      .from("achievements")
      .insert({
        code,
        name,
        description: description || "",
        xp_reward: xp_reward || 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar achievement:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Atualizar achievement-metadata.ts automaticamente
    try {
      const metadataPath = path.join(process.cwd(), "lib", "achievement-metadata.ts");
      let fileContent = fs.readFileSync(metadataPath, "utf-8");

      const iconName = icon || "FaTrophy";
      const colorClass = color || "text-amber-500";

      // Adicionar ícone nos imports se não existir
      if (!fileContent.includes(iconName)) {
        const importMatch = fileContent.match(/import\s+{([^}]+)}\s+from\s+"react-icons\/fa6";/);
        if (importMatch) {
          const currentIcons = importMatch[1].split(",").map((i) => i.trim());
          if (!currentIcons.includes(iconName)) {
            currentIcons.push(iconName);
            const newImport = `import { ${currentIcons.join(", ")} } from "react-icons/fa6";`;
            fileContent = fileContent.replace(/import\s+{[^}]+}\s+from\s+"react-icons\/fa6";/, newImport);
          }
        }
      }

      // Adicionar achievement no objeto achievementMetadata
      const newEntry = `  ${code}: {
    icon: ${iconName},
    color: "${colorClass}",
  },`;

      // Inserir antes do fechamento do objeto
      fileContent = fileContent.replace(
        /};\n\nexport const getAchievementMetadata/,
        `  ${newEntry}\n};\n\nexport const getAchievementMetadata`
      );

      fs.writeFileSync(metadataPath, fileContent, "utf-8");
    } catch (fsError) {
      console.error("Erro ao atualizar achievement-metadata.ts:", fsError);
      // Não falhar a request por erro de escrita no arquivo
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Erro ao criar achievement:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
