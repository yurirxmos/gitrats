-- Migração: Remover tabela activity_log (não mais necessária)
-- Data: 2024-11-06
-- Motivo: Sistema simplificado usando apenas github_stats

-- 1. Remover tabela activity_log (não é mais usada)
DROP TABLE IF EXISTS activity_log CASCADE;

-- 2. Garantir que github_stats tenha os campos corretos
-- (Se a tabela já existe, apenas adiciona campos que faltam)
ALTER TABLE github_stats
ADD COLUMN IF NOT EXISTS total_stars INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_repos INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;

-- 3. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_github_stats_user_id 
ON github_stats(user_id);

-- 4. Comentários explicativos
COMMENT ON TABLE github_stats IS 'Única fonte de verdade para estatísticas do GitHub. Atualizada a cada 10 minutos via sync automático.';
COMMENT ON COLUMN github_stats.total_commits IS 'Total de commits do usuário (lifetime) - fonte: GitHub GraphQL API';
COMMENT ON COLUMN github_stats.total_prs IS 'Total de PRs do usuário (lifetime) - fonte: GitHub GraphQL API';
COMMENT ON COLUMN github_stats.total_stars IS 'Total de stars recebidas em todos repos - fonte: GitHub REST API';
COMMENT ON COLUMN github_stats.total_repos IS 'Total de repositórios públicos - fonte: GitHub REST API';
COMMENT ON COLUMN github_stats.last_sync_at IS 'Timestamp do último sync com GitHub API';
