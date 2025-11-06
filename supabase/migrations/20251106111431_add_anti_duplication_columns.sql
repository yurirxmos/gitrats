-- Migração: Adicionar colunas para anti-duplicação de XP
-- Data: 2025-11-06

-- Adicionar colunas para identificação única (se não existirem)
ALTER TABLE activity_log
ADD COLUMN IF NOT EXISTS commit_sha TEXT,
ADD COLUMN IF NOT EXISTS pr_number INTEGER;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_activity_log_commit_sha 
ON activity_log(user_id, commit_sha) 
WHERE commit_sha IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_log_pr_number 
ON activity_log(user_id, pr_number) 
WHERE pr_number IS NOT NULL;

-- Criar índice para queries de XP diário por tipo
CREATE INDEX IF NOT EXISTS idx_activity_log_daily_xp 
ON activity_log(user_id, activity_type, created_at);
