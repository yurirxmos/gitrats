"use client";

import { useState } from "react";
import { FaArrowRight, FaFire, FaStar } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import warriorLvl1 from "@/assets/warrior_lvl_1.png";
import warriorLvl5 from "@/assets/warrior_lvl_5.png";
import warriorLvl10 from "@/assets/warrior_lvl_10.png";
import mageLvl1 from "@/assets/mage_lvl_1.png";
import mageLvl5 from "@/assets/mage_lvl_5.png";
import mageLvl10 from "@/assets/mage_lvl_10.png";
import orcLvl1 from "@/assets/orc_lvl_1.png";
import orcLvl5 from "@/assets/orc_lvl_5.png";
import orcLvl10 from "@/assets/orc_lvl_10.png";
import { Card, CardContent } from "../ui/card";
import { GiSwordsPower } from "react-icons/gi";
import { CLASS_DESCRIPTIONS } from "@/lib/classes";

type CharacterClass = "warrior" | "mage" | "orc";

interface CharacterCreationStepProps {
  onNext: (characterData: { name: string; class: CharacterClass }) => void;
  isLoading?: boolean;
}

const classes = [
  {
    id: "warrior" as CharacterClass,
    name: "Guerreiro",
    image: warriorLvl1,
    evolution: {
      lvl1: warriorLvl1,
      lvl5: warriorLvl5,
      lvl10: warriorLvl10,
    },
  },
  {
    id: "mage" as CharacterClass,
    name: "Mago",
    image: mageLvl1,
    evolution: {
      lvl1: mageLvl1,
      lvl5: mageLvl5,
      lvl10: mageLvl10,
    },
  },
  {
    id: "orc" as CharacterClass,
    name: "Ogro",
    image: orcLvl1,
    evolution: {
      lvl1: orcLvl1,
      lvl5: orcLvl5,
      lvl10: orcLvl10,
    },
  },
];

export function CharacterCreationStep({ onNext, isLoading = false }: CharacterCreationStepProps) {
  const [characterName, setCharacterName] = useState("");
  const [selectedClass, setSelectedClass] = useState<CharacterClass>("warrior");

  const handleNext = () => {
    if (characterName.trim()) {
      onNext({ name: characterName.trim(), class: selectedClass });
    }
  };

  const currentClass = classes.find((c) => c.id === selectedClass)!;

  return (
    <div className="space-y-0">
      <div className="flex flex-col items-center gap-2 mb-3">
        <div className="w-10 h-10 bg-foreground/10 rounded-full text-3xl flex items-center justify-center">
          <GiSwordsPower />
        </div>
        <h2 className="text-lg font-black text-center uppercase font-mono">personagem</h2>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold">/nome</label>
            <span className="text-xs text-muted-foreground">{characterName.length}/64</span>
          </div>
          <Input
            type="text"
            placeholder="digite o nome do seu personagem"
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value.slice(0, 64))}
            maxLength={64}
            className="w-full"
          />
        </div>

        <div>
          <label className="text-sm font-bold mb-2 block">/escolha sua classe</label>
          <div className="grid grid-cols-3 gap-3">
            {classes.map((cls) => (
              <Card
                key={cls.id}
                onClick={() => setSelectedClass(cls.id)}
                className={`p-2 border rounded-lg transition-all text-center hover:cursor-pointer ${
                  selectedClass === cls.id
                    ? "border-foreground bg-foreground/10 scale-105"
                    : "border-border hover:border-foreground/50"
                }`}
              >
                <CardContent>
                  <div className="relative w-15 h-15 mx-auto mb-2 bg-muted rounded-lg overflow-hidden">
                    <Image
                      src={cls.image}
                      alt={cls.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <p className="font-bold text-sm">{cls.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Character Preview with Evolution */}

        <div className="flex flex-row items-center justify-center gap-4 mt-6">
          <div className="text-center relative">
            <div className="relative w-15 h-15 mx-auto bg-muted rounded-lg overflow-hidden">
              <Image
                src={currentClass.evolution.lvl1}
                alt="Level 1"
                fill
                className="object-contain"
              />
            </div>
            <p className="absolute bottom-[-15] left-1/2 transform -translate-x-1/2 text-foreground bg-secondary text-[9px] px-2 py-1 rounded-full w-fit border border-green-200">
              1
            </p>
          </div>
          <FaArrowRight className="self-center justify-self-center text-sm text-muted-foreground animate-caret-blink" />
          <div className="text-center relative">
            <div className="relative w-15 h-15 mx-auto bg-muted rounded-lg overflow-hidden">
              <Image
                src={currentClass.evolution.lvl5}
                alt="Level 5"
                fill
                className="object-contain"
              />
            </div>
            <p className="absolute bottom-[-15] left-1/2 transform -translate-x-1/2 text-foreground bg-secondary text-[9px] px-2 py-1 rounded-full w-fit border border-amber-500">
              5
            </p>
          </div>
          <FaArrowRight className="self-center justify-self-center text-sm text-muted-foreground animate-caret-blink" />
          <div className="text-center relative">
            <div className="relative w-15 h-15 mx-auto bg-muted rounded-lg overflow-hidden">
              <Image
                src={currentClass.evolution.lvl10}
                alt="Level 10"
                fill
                className="object-contain"
              />
            </div>
            <p className="absolute bottom-[-15] left-1/2 transform -translate-x-1/2 text-foreground bg-secondary text-[9px] px-2 py-1 rounded-full w-fit border border-red-500">
              10
            </p>
          </div>
        </div>

        {/* Bônus de Classe */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-2 border-b border-border/50 pb-2">
            <FaFire className="text-orange-500" />
            <h3 className="font-bold text-sm uppercase">Bônus de XP</h3>
          </div>

          <p className="text-[10px] text-muted-foreground mb-2 italic">{CLASS_DESCRIPTIONS[selectedClass].playstyle}</p>

          <p className="text-xs text-muted-foreground mb-3">{CLASS_DESCRIPTIONS[selectedClass].description}</p>

          <div className="space-y-1">
            {CLASS_DESCRIPTIONS[selectedClass].strengths.map((strength, index) => {
              const isActive = !strength.includes("EM BREVE");
              return (
                <div
                  key={index}
                  className={`flex items-start gap-2 text-xs ${isActive ? "" : "opacity-50"}`}
                >
                  <FaStar
                    className={`${isActive ? "text-green-500" : "text-yellow-500/50"} text-[10px] mt-0.5 shrink-0`}
                  />
                  <span className="text-foreground/90">{strength}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-border/50">
            <p className="text-[9px] text-muted-foreground">
              <strong className="text-blue-400">XP Base:</strong> 10/commit · 50/PR · 25/issue
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end mt-2">
        <Button
          onClick={handleNext}
          disabled={!characterName.trim() || isLoading}
          className="w-20 bg-foreground hover:opacity-90 text-background font-bold"
        >
          {isLoading ? "..." : <FaArrowRight />}
        </Button>
      </div>
    </div>
  );
}
