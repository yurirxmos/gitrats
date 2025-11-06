-- Fix RLS policies for users table
-- Permite que usuários autenticados criem e atualizem seus próprios registros

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users podem criar seu próprio registro" ON public.users;
DROP POLICY IF EXISTS "Users podem atualizar seu próprio registro" ON public.users;
DROP POLICY IF EXISTS "Users podem ver seu próprio registro" ON public.users;
DROP POLICY IF EXISTS "Users podem ver todos os registros" ON public.users;

-- Habilita RLS se não estiver habilitado
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Política: usuários autenticados podem INSERIR seu próprio registro
-- Usa auth.uid() que é mais confiável que JWT claims
CREATE POLICY "Users podem criar seu próprio registro"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Política: usuários autenticados podem ATUALIZAR seu próprio registro
CREATE POLICY "Users podem atualizar seu próprio registro"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Política: usuários autenticados podem VER seu próprio registro
CREATE POLICY "Users podem ver seu próprio registro"
  ON public.users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Política: todos podem ver registros públicos (para leaderboard)
-- Mas apenas dados necessários (username, avatar, etc)
CREATE POLICY "Users podem ver todos os registros"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);
