-- Migração: Sistema de Achievements + Relação Usuário
-- Comentários explicam o PORQUÊ (em português) e código está em inglês
-- Escolha por tabela relacional user_achievements ao invés de JSONB em users para:
-- 1) Evitar crescimento descontrolado de array
-- 2) Permitir histórico (awarded_at, granted_by)
-- 3) Facilitar queries (JOIN, contagens, ranking por achievements)

-- Tabela principal de achievements
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE, -- identificador estável sem espaços
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 0 CHECK (xp_reward >= 0),
  category TEXT NOT NULL DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para updated_at (evita esquecer em updates manuais)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_achievements_updated_at ON public.achievements;
CREATE TRIGGER trg_achievements_updated_at
BEFORE UPDATE ON public.achievements
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Índices
CREATE INDEX IF NOT EXISTS idx_achievements_code ON public.achievements(code);
CREATE INDEX IF NOT EXISTS idx_achievements_active ON public.achievements(is_active);

-- Tabela relacional: achievements concedidos ao usuário
CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by TEXT, -- armazena origem (admin, sistema, script)
  PRIMARY KEY (user_id, achievement_id)
);

-- Índices adicionais para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement ON public.user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_awarded_at ON public.user_achievements(awarded_at DESC);

-- RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Policies achievements
DROP POLICY IF EXISTS "Public can select active achievements" ON public.achievements;
CREATE POLICY "Public can select active achievements"
  ON public.achievements FOR SELECT
  USING (is_active = TRUE);

-- Policies user_achievements
DROP POLICY IF EXISTS "User can view own achievements" ON public.user_achievements;
CREATE POLICY "User can view own achievements"
  ON public.user_achievements FOR SELECT
  USING (user_id = auth.uid());

-- Achievement inicial (exemplo). ON CONFLICT garante idempotência.
INSERT INTO public.achievements (code, name, description, xp_reward, category, is_active)
VALUES ('contribuidor_da_tavola', 'Contribuidor da Távola', 'Esse usuário contribuiu reportando bugs/exploits', 10, 'contribution', TRUE)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  xp_reward = EXCLUDED.xp_reward,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active;

-- NOTA: Se existir coluna JSONB achievements em users, pode ser mantida temporariamente para compatibilidade;
-- futura migração pode remover após portar dados para user_achievements.
