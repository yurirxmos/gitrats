-- Resetar conta do usuário para testar sistema de XP do zero
-- Mantém o personagem mas zera XP e ajusta baseline para o total atual do GitHub

-- Zerar XP do personagem
UPDATE characters 
SET 
  level = 1,
  current_xp = 0,
  total_xp = 0
WHERE user_id = '74c946f5-4e49-4fef-8879-b28e7975755a';

-- Ajustar baseline para commits/PRs atuais (615 commits, 2 PRs)
-- A partir de agora, só novos commits/PRs vão gerar XP
UPDATE github_stats 
SET 
  baseline_commits = 615,
  baseline_prs = 2,
  total_commits = 615,
  total_prs = 2
WHERE user_id = '74c946f5-4e49-4fef-8879-b28e7975755a';
