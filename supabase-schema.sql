-- GitRats - Migração: Sistema de Log de Atividades
-- Adiciona apenas a tabela activity_log que está faltando

-- Tabela de log de atividades (histórico de XP ganho)
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  character_id UUID REFERENCES public.characters(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT,
  xp_gained INTEGER DEFAULT 0,
  total_xp_after INTEGER,
  level_after INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_character_id ON public.activity_log(character_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Política: usuários podem ver apenas seus próprios logs
CREATE POLICY "Users podem ver seu próprio log"
  ON public.activity_log FOR SELECT
  USING (user_id IN (SELECT id FROM public.users WHERE github_id = current_setting('request.jwt.claims', true)::json->>'sub'));

-- Política: sistema pode inserir logs (service role)
CREATE POLICY "Sistema pode inserir logs"
  ON public.activity_log FOR INSERT
  WITH CHECK (true);

-- NOTA: Execute este SQL no Supabase SQL Editor
-- Se já existir a tabela, vai ignorar (IF NOT EXISTS)
