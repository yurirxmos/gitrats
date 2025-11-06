import { FaTrophy } from "react-icons/fa6";
import { Button } from "@/components/ui/button";

interface ReadyStepProps {
  onFinish: () => void;
}

export function ReadyStep({ onFinish }: ReadyStepProps) {
  return (
    <div className="space-y-6 text-center">
      <div className="w-20 h-20 bg-foreground/10 rounded-full flex items-center justify-center mx-auto">
        <FaTrophy className="text-5xl text-foreground" />
      </div>
      <h2 className="text-3xl font-black">Tudo Pronto!</h2>
      <p className="text-muted-foreground">
        Agora é só começar a codar! A cada commit você ganha XP e sobe no leaderboard.
      </p>

      <div className="bg-muted/50 border border-border rounded-lg p-6 space-y-3 text-left">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-foreground/20 rounded-full flex items-center justify-center shrink-0 mt-1">
            <span className="text-foreground font-bold">1</span>
          </div>
          <div>
            <p className="font-bold">Faça Commits</p>
            <p className="text-sm text-muted-foreground">
              Cada commit vale XP. Quanto melhor o commit, mais XP você ganha!
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-foreground/20 rounded-full flex items-center justify-center shrink-0 mt-1">
            <span className="text-foreground font-bold">2</span>
          </div>
          <div>
            <p className="font-bold">Abra Pull Requests</p>
            <p className="text-sm text-muted-foreground">PRs aprovados te dão ainda mais XP!</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-foreground/20 rounded-full flex items-center justify-center shrink-0 mt-1">
            <span className="text-foreground font-bold">3</span>
          </div>
          <div>
            <p className="font-bold">Suba no Ranking</p>
            <p className="text-sm text-muted-foreground">Compete com outros devs e chegue ao topo!</p>
          </div>
        </div>
      </div>

      <Button
        onClick={onFinish}
        className="w-full bg-foreground hover:opacity-90 text-background font-bold"
      >
        Começar a Jogar!
        <FaTrophy />
      </Button>
    </div>
  );
}
