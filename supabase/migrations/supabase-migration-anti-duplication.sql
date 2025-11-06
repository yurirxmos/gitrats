-- Migração: Adicionar proteção contra duplicação de XP
-- Data: 2025-01-06

-- 1. Adicionar colunas para identificação única de atividades
ALTER TABLE activity_log
ADD COLUMN IF NOT EXISTS commit_sha VARCHAR(40),
ADD COLUMN IF NOT EXISTS pr_number INTEGER,
ADD COLUMN IF NOT EXISTS metadata_hash VARCHAR(64);

-- 2. Criar índices para performance em queries de duplicação
CREATE INDEX IF NOT EXISTS idx_activity_log_commit_sha 
ON activity_log(commit_sha) 
WHERE commit_sha IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_log_pr_number 
ON activity_log(user_id, pr_number) 
WHERE pr_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_log_metadata_hash 
ON activity_log(metadata_hash) 
WHERE metadata_hash IS NOT NULL;

-- 3. Criar índice composto para verificação diária de XP por tipo
CREATE INDEX IF NOT EXISTS idx_activity_log_daily_xp 
ON activity_log(user_id, activity_type, created_at);

-- 4. Comentários explicativos
COMMENT ON COLUMN activity_log.commit_sha IS 'SHA único do commit do GitHub (40 chars). Usado para prevenir duplicação de XP de commits.';
COMMENT ON COLUMN activity_log.pr_number IS 'Número da Pull Request no repositório. Combinado com user_id previne duplicação de XP de PRs.';
COMMENT ON COLUMN activity_log.metadata_hash IS 'Hash MD5 de metadados da atividade (tipo + descrição + data). Fallback para prevenir duplicação quando commit_sha/pr_number não estão disponíveis.';

-- 5. Função auxiliar para calcular XP diário por tipo de atividade
CREATE OR REPLACE FUNCTION get_daily_xp_by_type(
  p_user_id UUID,
  p_activity_type VARCHAR,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_xp INTEGER;
BEGIN
  SELECT COALESCE(SUM(xp_gained), 0)
  INTO v_total_xp
  FROM activity_log
  WHERE user_id = p_user_id
    AND activity_type = p_activity_type
    AND DATE(created_at) = p_date;
  
  RETURN v_total_xp;
END;
$$;

-- 6. Função para verificar se commit já foi processado
CREATE OR REPLACE FUNCTION is_commit_processed(
  p_user_id UUID,
  p_commit_sha VARCHAR
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM activity_log
    WHERE user_id = p_user_id
      AND commit_sha = p_commit_sha
  ) INTO v_exists;
  
  RETURN v_exists;
END;
$$;

-- 7. Função para verificar se PR já foi processado
CREATE OR REPLACE FUNCTION is_pr_processed(
  p_user_id UUID,
  p_pr_number INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM activity_log
    WHERE user_id = p_user_id
      AND pr_number = p_pr_number
  ) INTO v_exists;
  
  RETURN v_exists;
END;
$$;

-- 8. Adicionar RLS policies para as novas funções (se RLS estiver habilitado)
-- Usuários podem consultar apenas seus próprios dados
CREATE POLICY IF NOT EXISTS "Users can read own activity logs"
  ON activity_log FOR SELECT
  USING (auth.uid() = user_id);
