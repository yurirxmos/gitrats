import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getAchievementMetadata } from "@/lib/achievement-metadata";
import { useAchievementDefinitions } from "@/hooks/use-achievement-definitions";
import { useMemo } from "react";

interface AchievementBadgeProps {
  code: string;
  size?: "sm" | "md" | "lg";
}

export const AchievementBadge = ({ code, size = "sm" }: AchievementBadgeProps) => {
  const metadata = getAchievementMetadata(code);
  const { definitions, isLoading } = useAchievementDefinitions();
  const def = definitions[code];
  const Icon = metadata.icon;

  // Fallbacks enquanto carregamos definições (apenas visual) - comentário: evita quebra caso ainda não tenha chegado dado
  const title = def?.name || code;
  const description = def?.description || (isLoading ? "Carregando..." : "Descrição indisponível");
  const xp = def?.xp_reward ?? 0;

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2",
  };

  const iconSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`inline-flex items-center gap-1.5 font-semibold rounded bg-muted text-muted-foreground hover:bg-muted/80 transition-colors cursor-help ${sizeClasses[size]}`}
        >
          <Icon className={`${iconSizes[size]} ${metadata.color}`} />
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-2xs"
      >
        <div className="space-y-3 p-2">
          <p className="font-bold text-sm flex items-center gap-2 bg-secondary justify-center p-2 rounded-md text-foreground">
            <Icon className={metadata.color} />
            {title}
          </p>
          <p className="text-xs text-center text-muted-background min-h-5">{description}</p>
          <div className="bg-green-100 px-2 py-1 font-bold text-green-400 rounded border border-green-200 shadow-xs w-fit mx-auto">
            +{xp} XP
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
