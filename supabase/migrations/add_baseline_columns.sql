-- Adiciona colunas de baseline para rastrear o ponto de partida do usuário
-- baseline = histórico GitHub ignorado (antes de entrar na plataforma)

ALTER TABLE github_stats 
ADD COLUMN IF NOT EXISTS baseline_commits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS baseline_prs INTEGER DEFAULT 0;

-- Migrar dados existentes: total_commits/prs atuais viram baseline
-- (porque já estão no sistema e não devem gerar XP retroativo)
UPDATE github_stats
SET 
  baseline_commits = total_commits,
  baseline_prs = total_prs
WHERE baseline_commits IS NULL OR baseline_prs IS NULL;
