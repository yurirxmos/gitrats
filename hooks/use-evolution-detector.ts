"use client";

import { useEffect, useRef, useState } from "react";
import { getCurrentRank } from "@/lib/class-evolution";

interface CharacterState {
  level: number;
  class: string;
  name: string;
}

interface EvolutionEvent {
  character: {
    name: string;
    class: string;
    level: number;
    previousLevel: number;
  };
}

/**
 * Hook para detectar evoluções de personagem (level up e evolução de classe)
 * Compara o estado anterior com o novo estado e dispara eventos de evolução
 */
export function useEvolutionDetector(character: CharacterState | null) {
  const [evolutionEvent, setEvolutionEvent] = useState<EvolutionEvent | null>(null);
  const previousStateRef = useRef<CharacterState | null>(null);

  useEffect(() => {
    if (!character) {
      previousStateRef.current = null;
      return;
    }

    const previousState = previousStateRef.current;

    // Se não há estado anterior, apenas armazena o atual
    if (!previousState) {
      previousStateRef.current = character;
      return;
    }

    // Detecta mudanças
    const levelChanged = character.level > previousState.level;
    const classChanged = character.class !== previousState.class;

    // Detecta apenas evoluções de classe (quando o rank muda)
    const currentRank = getCurrentRank(character.class, character.level);
    const previousRank = getCurrentRank(previousState.class, previousState.level);
    const rankChanged = currentRank !== previousRank;

    // Se houve evolução de classe
    if (rankChanged) {
      setEvolutionEvent({
        character: {
          name: character.name,
          class: character.class,
          level: character.level,
          previousLevel: previousState.level,
        },
      });
    }

    // Atualiza o estado anterior
    previousStateRef.current = character;
  }, [character]);

  // Função para limpar o evento após ser consumido
  const clearEvolutionEvent = () => {
    setEvolutionEvent(null);
  };

  return {
    evolutionEvent,
    clearEvolutionEvent,
  };
}
