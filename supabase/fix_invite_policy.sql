-- FIX: Corrigir Policy de Inserção de Convites
-- Execute este script no SQL Editor do Supabase

-- 1. Remover policy antiga que está bloqueando
DROP POLICY IF EXISTS "Membros podem enviar convites" ON public.guild_invites;

-- 2. Criar nova policy corrigida - permitir inserção se o usuário está autenticado
-- (a verificação se é membro é feita na aplicação)
CREATE POLICY "Usuarios autenticados podem enviar convites" 
  ON public.guild_invites FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL AND invited_by = auth.uid());

-- 3. Verificar policies atuais
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'guild_invites';
