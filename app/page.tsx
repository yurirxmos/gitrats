"use client";

import Image from "next/image";
import logo from "@/assets/github.png";
import { FaGithub, FaUser, FaTrophy, FaArrowRight, FaMoon, FaCode } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { OnboardingModal } from "@/components/onboarding-modal";
import { Navbar } from "@/components/navbar";
import { useUserContext } from "@/contexts/user-context";
import { useAutoSync } from "@/hooks/use-auto-sync";
import { useRouter } from "next/navigation";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const { user, hasCharacter, loading } = useUserContext();
  const router = useRouter();

  // Sync automático a cada 10 minutos (só se tiver personagem)
  useAutoSync(hasCharacter);

  useEffect(() => {
    // Verificar se estava no onboarding antes do login
    const onboardingInProgress = localStorage.getItem("onboarding_in_progress");
    if (onboardingInProgress === "true") {
      setIsOnboardingOpen(true);
      localStorage.removeItem("onboarding_in_progress");
    }
  }, []);

  useEffect(() => {
    // Evitar full reload em SPA
    if (!loading && user && hasCharacter) router.replace("/leaderboard");
  }, [user, hasCharacter, loading, router]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const PIXEL_SIZE = 8;
    const NUM_PIXELS = 30;

    class Pixel {
      x: number;
      y: number;
      velocityY: number;
      gravity: number;
      bounce: number;
      opacity: number;
      opacityDirection: number;

      constructor(canvasWidth: number, canvasHeight: number) {
        this.x = Math.random() * canvasWidth;
        this.y = Math.random() * canvasHeight;
        this.velocityY = Math.random() * 2 - 4;
        this.gravity = 0.3;
        this.bounce = 0.85;
        this.opacity = Math.random();
        this.opacityDirection = Math.random() > 0.5 ? 0.01 : -0.01;
      }

      update(canvasHeight: number) {
        this.velocityY += this.gravity;
        this.y += this.velocityY;

        if (this.y + PIXEL_SIZE >= canvasHeight) {
          this.y = canvasHeight - PIXEL_SIZE;
          this.velocityY = -Math.abs(this.velocityY) * this.bounce;

          // Mantém energia mínima para continuar pulando
          if (Math.abs(this.velocityY) < 2) {
            this.velocityY = -4;
          }
        }

        // Variar opacidade
        this.opacity += this.opacityDirection;
        if (this.opacity >= 1) {
          this.opacity = 1;
          this.opacityDirection = -0.01;
        } else if (this.opacity <= 0.2) {
          this.opacity = 0.2;
          this.opacityDirection = 0.01;
        }
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = `rgba(34, 197, 94, ${this.opacity})`; // Verde (green-500)
        ctx.fillRect(this.x, this.y, PIXEL_SIZE, PIXEL_SIZE);
      }
    }

    const pixels = Array.from({ length: NUM_PIXELS }, () => new Pixel(canvas.width, canvas.height));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      pixels.forEach((pixel) => {
        pixel.update(canvas.height);
        pixel.draw(ctx);
      });

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background relative bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px] animate-[grid-move_2s_linear_infinite]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 opacity-50 pointer-events-none hidden md:block"
      />
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-8">
        <div className="max-w-4xl w-full text-center space-y-8">
          <div className="flex flex-row items-center gap-1 justify-center">
            <Image
              src={logo}
              alt="Gitrats Logo"
              className="w-15 h-15 dark:invert"
            />
            <h1 className="text-5xl md:text-7xl font-black text-foreground">GITRATS</h1>
          </div>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Transforme seus commits e pull requests em experiência. Crie seu personagem e domine o leaderboard.
          </p>

          <div className="flex flex-row items-stretch justify-center gap-8 mt-12 flex-wrap">
            {/* Card 1: Login GitHub */}
            <div className="flex flex-col items-center gap-4 p-6 rounded-lg hover:border-foreground transition-colors flex-1 max-w-xs">
              <div className="w-16 h-16 flex items-center justify-center bg-foreground/10 rounded-full">
                <FaGithub className="text-3xl text-foreground" />
              </div>
              <h3 className="text-lg font-bold">Conecte seu GitHub</h3>
              <p className="text-sm text-muted-foreground">Faça login com sua conta GitHub e comece sua jornada</p>
            </div>

            <FaArrowRight className="hidden md:block self-center text-4xl text-muted-foreground shrink-0" />

            {/* Card 2: Crie Personagem */}
            <div className="flex flex-col items-center gap-4 p-6 rounded-lg hover:border-foreground transition-colors flex-1 max-w-xs">
              <div className="w-16 h-16 flex items-center justify-center bg-foreground/10 rounded-full">
                <FaUser className="text-3xl text-foreground" />
              </div>
              <h3 className="text-lg font-bold">Crie seu Personagem</h3>
              <p className="text-sm text-muted-foreground">Customize seu personagem e prepare-se para evoluir</p>
            </div>

            <FaArrowRight className="hidden md:block self-center text-4xl text-muted-foreground shrink-0" />

            {/* Card 3: Suba no Ranking */}
            <div className="flex flex-col items-center gap-4 p-6 rounded-lg hover:border-foreground transition-colors flex-1 max-w-xs">
              <div className="w-16 h-16 flex items-center justify-center bg-foreground/10 rounded-full">
                <FaTrophy className="text-3xl text-foreground" />
              </div>
              <h3 className="text-lg font-bold">Domine o Leaderboard</h3>
              <p className="text-sm text-muted-foreground">Ganhe XP com seus commits e conquiste o topo</p>
            </div>
          </div>

          {!hasCharacter && (
            <div className="flex flex-col gap-4 items-center">
              <Button
                onClick={() => setIsOnboardingOpen(true)}
                disabled={hasCharacter || loading}
              >
                <FaGithub className="text-xl" />
                Quero jogar!
              </Button>
            </div>
          )}
        </div>
      </main>

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />
    </div>
  );
}
