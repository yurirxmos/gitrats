-- Corrigir baseline para o valor correto
-- Você tinha 613 commits quando entrou (615 atual - 2 que geraram os 10 XP)
UPDATE github_stats 
SET 
  baseline_commits = 613,
  baseline_prs = 2
WHERE user_id = '74c946f5-4e49-4fef-8879-b28e7975755a';
