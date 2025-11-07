-- Sistema de Achievements para GitRats
-- Adiciona tabelas para gerenciar achievements e progresso dos usuários

-- Tabela de achievements disponíveis
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT, -- URL ou nome do ícone
  xp_reward INTEGER DEFAULT 0,
  type TEXT NOT NULL, -- 'one_time', 'progress', 'streak', etc.
  category TEXT, -- 'contribution', 'social', 'milestone', etc.
  requirements JSONB, -- Requisitos específicos em JSON
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de achievements conquistados pelos usuários
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  xp_granted INTEGER DEFAULT 0,
  progress_data JSONB, -- Dados adicionais sobre como foi conquistado
  UNIQUE(user_id, achievement_id) -- Um usuário só pode conquistar um achievement uma vez
);

-- Tabela opcional para progresso em achievements que têm progresso
CREATE TABLE IF NOT EXISTS public.achievement_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE,
  current_progress INTEGER DEFAULT 0,
  target_progress INTEGER DEFAULT 1,
  progress_data JSONB, -- Dados específicos do progresso
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id) -- Um progresso por usuário/achievement
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_achievements_type ON public.achievements(type);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON public.achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_active ON public.achievements(is_active);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON public.user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked_at ON public.user_achievements(unlocked_at DESC);

CREATE INDEX IF NOT EXISTS idx_achievement_progress_user_id ON public.achievement_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_achievement_progress_achievement_id ON public.achievement_progress(achievement_id);

-- RLS (Row Level Security)
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_progress ENABLE ROW LEVEL SECURITY;

-- Políticas para achievements (todos podem ver)
CREATE POLICY "Todos podem ver achievements ativos"
  ON public.achievements FOR SELECT
  USING (is_active = true);

-- Políticas para user_achievements
CREATE POLICY "Usuários podem ver seus próprios achievements"
  ON public.user_achievements FOR SELECT
  USING (user_id IN (SELECT id FROM public.users WHERE github_id = current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Sistema pode inserir achievements conquistados"
  ON public.user_achievements FOR INSERT
  WITH CHECK (true);

-- Políticas para achievement_progress
CREATE POLICY "Usuários podem ver seu próprio progresso"
  ON public.achievement_progress FOR SELECT
  USING (user_id IN (SELECT id FROM public.users WHERE github_id = current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY "Sistema pode gerenciar progresso"
  ON public.achievement_progress FOR ALL
  USING (true);

-- Trigger para atualizar updated_at em achievements
CREATE OR REPLACE FUNCTION update_achievements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_achievements_updated_at
  BEFORE UPDATE ON public.achievements
  FOR EACH ROW
  EXECUTE FUNCTION update_achievements_updated_at();

-- Trigger para atualizar last_updated em achievement_progress
CREATE OR REPLACE FUNCTION update_achievement_progress_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_achievement_progress_last_updated
  BEFORE UPDATE ON public.achievement_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_achievement_progress_last_updated();</content>
<parameter name="filePath">/home/yurirxmos/Documents/gitrats/supabase/migrations/add_achievements_system.sql
