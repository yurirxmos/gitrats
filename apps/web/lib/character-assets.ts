import warriorLvl1 from "@/assets/warrior_lvl_1.png";
import warriorLvl5 from "@/assets/warrior_lvl_5.png";
import warriorLvl10 from "@/assets/warrior_lvl_10.png";
import mageLvl1 from "@/assets/mage_lvl_1.png";
import mageLvl5 from "@/assets/mage_lvl_5.png";
import mageLvl10 from "@/assets/mage_lvl_10.png";
import orcLvl1 from "@/assets/orc_lvl_1.png";
import orcLvl5 from "@/assets/orc_lvl_5.png";
import orcLvl10 from "@/assets/orc_lvl_10.png";
import { StaticImageData } from "next/image";

type CharacterClass = "warrior" | "mage" | "orc";

const characterAssets: Record<CharacterClass, Record<string, StaticImageData>> = {
  warrior: {
    lvl1: warriorLvl1,
    lvl5: warriorLvl5,
    lvl10: warriorLvl10,
  },
  mage: {
    lvl1: mageLvl1,
    lvl5: mageLvl5,
    lvl10: mageLvl10,
  },
  orc: {
    lvl1: orcLvl1,
    lvl5: orcLvl5,
    lvl10: orcLvl10,
  },
};

export function getCharacterAvatar(characterClass: string | CharacterClass, level: number): StaticImageData {
  // Normalizar classe para lowercase e validar
  const normalizedClass = characterClass?.toLowerCase() as CharacterClass;

  // Fallback para warrior se classe inválida
  const validClass: CharacterClass = ["warrior", "mage", "orc"].includes(normalizedClass) ? normalizedClass : "warrior";

  const assets = characterAssets[validClass];

  if (level >= 10) return assets.lvl10!;
  if (level >= 5) return assets.lvl5!;
  return assets.lvl1!;
}
