-- Sistema de achievements otimizado
-- Primeiro, vamos verificar e ajustar a estrutura da tabela achievements existente

-- Adicionar coluna code se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'achievements' AND column_name = 'code') THEN
    ALTER TABLE public.achievements ADD COLUMN code TEXT;
  END IF;
END $$;

-- Atualizar valores existentes para ter um code único baseado no name
UPDATE public.achievements
SET code = LOWER(REPLACE(REPLACE(REPLACE(name, ' ', '_'), 'ã', 'a'), 'é', 'e'))
WHERE code IS NULL;

-- Tornar code NOT NULL e UNIQUE após popular
ALTER TABLE public.achievements ALTER COLUMN code SET NOT NULL;
ALTER TABLE public.achievements ADD CONSTRAINT achievements_code_unique UNIQUE (code);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'achievements' AND column_name = 'xp_reward') THEN
    ALTER TABLE public.achievements ADD COLUMN xp_reward INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'achievements' AND column_name = 'category') THEN
    ALTER TABLE public.achievements ADD COLUMN category TEXT DEFAULT 'special';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'achievements' AND column_name = 'is_active') THEN
    ALTER TABLE public.achievements ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Adicionar coluna achievements na tabela users (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'users' AND column_name = 'achievements') THEN
    ALTER TABLE public.users ADD COLUMN achievements JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_achievements_code ON public.achievements(code);
CREATE INDEX IF NOT EXISTS idx_achievements_active ON public.achievements(is_active);
CREATE INDEX IF NOT EXISTS idx_users_achievements ON public.users USING GIN(achievements);

-- Garantir que RLS está habilitado
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- Políticas (atualizar se necessário)
DROP POLICY IF EXISTS "Todos podem ver achievements ativos" ON public.achievements;
CREATE POLICY "Todos podem ver achievements ativos"
  ON public.achievements FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Sistema pode gerenciar achievements" ON public.achievements;
CREATE POLICY "Sistema pode gerenciar achievements"
  ON public.achievements FOR ALL
  USING (true);

-- Inserir o achievement inicial (ou atualizar se já existir)
INSERT INTO public.achievements (code, name, description, xp_reward, category, is_active)
VALUES ('contribuidor_da_taboa', 'Contribuidor da Távola', 'Esse guerreiro contribuiu para o sucesso do GitRats reportando bugs/exploits', 10, 'contribution', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  xp_reward = EXCLUDED.xp_reward,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active;