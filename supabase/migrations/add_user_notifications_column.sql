-- Adiciona coluna de notificações por e-mail aos usuários
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'notifications_enabled'
  ) THEN
    ALTER TABLE public.users
    ADD COLUMN notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;

  -- Garantir que todos existentes fiquem com true
  UPDATE public.users SET notifications_enabled = TRUE WHERE notifications_enabled IS NULL;
END $$;

-- Índice opcional para filtros futuros (se a base crescer)
CREATE INDEX IF NOT EXISTS idx_users_notifications_enabled ON public.users(notifications_enabled);
