"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getCharacterAvatar } from "@/lib/character-assets";
import { getCurrentRank, getNextRank } from "@/lib/class-evolution";
import { GiUpgrade } from "react-icons/gi";
import { FaStar } from "react-icons/fa";

interface EvolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: {
    name: string;
    class: string;
    level: number;
    previousLevel: number;
  };
}

export function EvolutionModal({ isOpen, onClose, character }: EvolutionModalProps) {
  const [animationStep, setAnimationStep] = useState(0);
  const [showSparkles, setShowSparkles] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setAnimationStep(0);
      setShowSparkles(false);
      return;
    }

    // Sequência de animação
    const timeouts = [
      setTimeout(() => setAnimationStep(1), 500), // Aparecer modal
      setTimeout(() => setShowSparkles(true), 1000), // Iniciar partículas
      setTimeout(() => setAnimationStep(2), 2000), // Mostrar nova forma
      setTimeout(() => setAnimationStep(3), 3500), // Mostrar stats
    ];

    return () => timeouts.forEach(clearTimeout);
  }, [isOpen]);

  const currentRank = getCurrentRank(character.class, character.level);
  const previousRank = getCurrentRank(character.class, character.previousLevel);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md text-center bg-linear-to-br from-purple-900/90 to-blue-900/90 border-purple-500/50">
        <DialogTitle className="sr-only">Evolução de classe — {character.name}</DialogTitle>
        <div className="relative overflow-hidden">
          {/* Partículas de fundo */}
          {showSparkles && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute animate-ping"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${1 + Math.random()}s`,
                  }}
                >
                  <FaStar className="text-yellow-400 text-xs opacity-60" />
                </div>
              ))}
            </div>
          )}

          {/* Ícone de upgrade */}
          <div className="flex justify-center mb-4">
            <div className={`p-4 rounded-full bg-linear-to-r from-yellow-400 to-orange-500 transition-all duration-1000 ${
              animationStep >= 1 ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
            }`}>
              <GiUpgrade className="text-white text-3xl" />
            </div>
          </div>

          {/* Título */}
          <h2 className={`text-2xl font-bold text-white mb-2 transition-all duration-500 ${
            animationStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            EVOLUÇÃO DE CLASSE!
          </h2>

          {/* Nome do personagem */}
          <p className={`text-lg text-purple-200 mb-6 transition-all duration-500 delay-200 ${
            animationStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            {character.name}
          </p>

          {/* Imagens de evolução */}
          <div className="flex justify-center items-center gap-4 mb-6">
            {/* Forma anterior */}
            <div className={`transition-all duration-1000 ${
              animationStep >= 2 ? 'opacity-50 scale-75 -translate-x-8' : 'opacity-100 scale-100'
            }`}>
              <div className="text-xs text-gray-400 mb-2">
                {previousRank}
              </div>
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-600">
                <img
                  src={getCharacterAvatar(character.class, character.previousLevel).src}
                  alt="Previous form"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Seta de evolução */}
            <div className={`transition-all duration-1000 ${
              animationStep >= 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
            }`}>
              <div className="text-2xl text-yellow-400 animate-pulse">→</div>
            </div>

            {/* Nova forma */}
            <div className={`transition-all duration-1000 ${
              animationStep >= 2 ? 'opacity-100 scale-110 translate-x-8' : 'opacity-0 scale-0'
            }`}>
              <div className="text-xs text-yellow-400 mb-2 font-semibold">
                {currentRank}
              </div>
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-yellow-400 shadow-lg shadow-yellow-400/50">
                <img
                  src={getCharacterAvatar(character.class, character.level).src}
                  alt="New form"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Stats de evolução */}
          <div className={`space-y-2 transition-all duration-500 delay-500 ${
            animationStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <div className="bg-yellow-800/50 rounded-lg p-3">
              <p className="text-sm text-yellow-200">Classe Evoluída!</p>
              <p className="text-lg font-bold text-white">
                {previousRank} → {currentRank}
              </p>
            </div>
            <div className="bg-purple-800/50 rounded-lg p-3">
              <p className="text-sm text-purple-200">Novo Level!</p>
              <p className="text-lg font-bold text-white">
                Level {character.level}
              </p>
            </div>
          </div>

          {/* Botão de fechar */}
          <div className={`mt-6 transition-all duration-500 delay-1000 ${
            animationStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <Button
              onClick={onClose}
              className="w-full bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold"
            >
              Continuar Jornada
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}