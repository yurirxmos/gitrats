-- Adiciona campo created_at na tabela users se não existir
-- Este campo será usado como baseline para calcular XP apenas de atividades após o registro

DO $$ 
BEGIN
  -- Adicionar coluna created_at se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.users 
    ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    
    -- Para usuários existentes que não têm created_at,
    -- usar a data de criação mais antiga encontrada nos stats ou characters
    UPDATE public.users u
    SET created_at = COALESCE(
      (SELECT MIN(gs.last_sync_at) FROM public.github_stats gs WHERE gs.user_id = u.id),
      (SELECT MIN(c.created_at) FROM public.characters c WHERE c.user_id = u.id),
      NOW()
    )
    WHERE u.created_at IS NULL;
  END IF;
END $$;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);
