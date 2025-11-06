-- Adiciona colunas para rastrear issues e code reviews
ALTER TABLE github_stats 
ADD COLUMN IF NOT EXISTS baseline_issues INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS baseline_reviews INTEGER DEFAULT 0;

-- Migrar dados existentes
UPDATE github_stats
SET 
  baseline_issues = total_issues,
  baseline_reviews = total_reviews
WHERE baseline_issues IS NULL OR baseline_reviews IS NULL;
