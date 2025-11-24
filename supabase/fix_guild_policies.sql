-- FIX: Corrigir Policies RLS do Sistema de Guildas
-- Execute este script no SQL Editor do Supabase

-- 1. Remover policy antiga problemática
DROP POLICY IF EXISTS "Sistema pode inserir membros" ON public.guild_members;

-- 2. Criar nova policy corrigida
CREATE POLICY "Usuarios autenticados podem inserir membros" 
  ON public.guild_members FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Atualizar policy de DELETE para permitir que usuário saia da própria guilda
DROP POLICY IF EXISTS "Owner/Admin podem remover membros" ON public.guild_members;

CREATE POLICY "Owner/Admin podem remover membros" 
  ON public.guild_members FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.guild_members gm 
      WHERE gm.guild_id = guild_members.guild_id 
      AND gm.user_id = auth.uid() 
      AND gm.role IN ('owner', 'admin')
    )
    OR user_id = auth.uid()
  );

-- 4. Adicionar o owner da guilda UFJ DEVS como membro
INSERT INTO guild_members (guild_id, user_id, role)
VALUES (
  '4f03317f-8a4a-4a78-a366-73e732539a90',
  '74c946f5-4e49-4fef-8879-b28e7975755a',
  'owner'
)
ON CONFLICT DO NOTHING;

-- 5. Atualizar total_members da guilda
UPDATE guilds 
SET total_members = (
  SELECT COUNT(*) 
  FROM guild_members 
  WHERE guild_id = '4f03317f-8a4a-4a78-a366-73e732539a90'
)
WHERE id = '4f03317f-8a4a-4a78-a366-73e732539a90';

-- 6. Verificar se está tudo ok
SELECT 
  g.name,
  g.total_members,
  (SELECT COUNT(*) FROM guild_members gm WHERE gm.guild_id = g.id) as member_count_real
FROM guilds g;
