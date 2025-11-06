-- SCRIPT DE CORREÇÃO MANUAL (OPCIONAL)
-- Execute este script no Supabase SQL Editor para corrigir TODOS os usuários antigos de uma vez
-- IMPORTANTE: Este script NÃO adiciona XP retroativo, apenas ajusta os baselines
-- Para adicionar XP retroativo, os usuários devem usar o botão "Receber XP Inicial" no leaderboard

-- Identificar usuários que precisam de correção
-- (baseline_commits = total_commits indica que não receberam XP inicial)
SELECT 
  u.id,
  u.github_username,
  gs.total_commits,
  gs.baseline_commits,
  gs.total_prs,
  gs.baseline_prs,
  CASE 
    WHEN gs.baseline_commits = gs.total_commits THEN 'PRECISA CORREÇÃO'
    ELSE 'JÁ CORRIGIDO'
  END as status
FROM users u
INNER JOIN github_stats gs ON gs.user_id = u.id
WHERE gs.baseline_commits = gs.total_commits
  OR gs.baseline_prs = gs.total_prs
ORDER BY u.created_at DESC;

-- ATENÇÃO: Este update apenas marca que precisa correção
-- O XP retroativo será dado quando o usuário clicar no botão
-- ou quando executar a próxima sincronização

-- Se quiser apenas marcar para processamento posterior, execute:
-- UPDATE github_stats 
-- SET baseline_commits = 0, baseline_prs = 0, baseline_issues = 0
-- WHERE baseline_commits = total_commits;
