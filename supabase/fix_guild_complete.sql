-- FIX: Corrigir Trigger de XP das Guildas
-- Execute este script no SQL Editor do Supabase

-- 1. Remover triggers e funções antigas
DROP TRIGGER IF EXISTS trigger_update_guild_xp_on_member_join ON public.guild_members;
DROP TRIGGER IF EXISTS trigger_update_guild_xp_on_member_leave ON public.guild_members;
DROP FUNCTION IF EXISTS update_guild_total_xp() CASCADE;
DROP FUNCTION IF EXISTS update_guild_total_xp_on_leave() CASCADE;

-- 2. Criar função corrigida - XP vem de characters, não users
CREATE OR REPLACE FUNCTION update_guild_total_xp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.guilds
  SET total_xp = (
    SELECT COALESCE(SUM(c.total_xp), 0)
    FROM public.guild_members gm
    JOIN public.characters c ON c.user_id = gm.user_id
    WHERE gm.guild_id = NEW.guild_id
  ),
  total_members = (
    SELECT COUNT(*)
    FROM public.guild_members
    WHERE guild_id = NEW.guild_id
  ),
  updated_at = NOW()
  WHERE id = NEW.guild_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Criar função para quando membro sai
CREATE OR REPLACE FUNCTION update_guild_total_xp_on_leave()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.guilds
  SET total_xp = (
    SELECT COALESCE(SUM(c.total_xp), 0)
    FROM public.guild_members gm
    JOIN public.characters c ON c.user_id = gm.user_id
    WHERE gm.guild_id = OLD.guild_id
  ),
  total_members = (
    SELECT COUNT(*)
    FROM public.guild_members
    WHERE guild_id = OLD.guild_id
  ),
  updated_at = NOW()
  WHERE id = OLD.guild_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 4. Recriar triggers
CREATE TRIGGER trigger_update_guild_xp_on_member_join
AFTER INSERT ON public.guild_members
FOR EACH ROW
EXECUTE FUNCTION update_guild_total_xp();

CREATE TRIGGER trigger_update_guild_xp_on_member_leave
AFTER DELETE ON public.guild_members
FOR EACH ROW
EXECUTE FUNCTION update_guild_total_xp_on_leave();

-- 5. Agora sim, corrigir as policies RLS
DROP POLICY IF EXISTS "Sistema pode inserir membros" ON public.guild_members;

CREATE POLICY "Usuarios autenticados podem inserir membros" 
  ON public.guild_members FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

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

-- 6. Adicionar o owner da guilda UFJ DEVS como membro
INSERT INTO guild_members (guild_id, user_id, role)
VALUES (
  '4f03317f-8a4a-4a78-a366-73e732539a90',
  '74c946f5-4e49-4fef-8879-b28e7975755a',
  'owner'
)
ON CONFLICT DO NOTHING;

-- 7. Verificar se está tudo ok
SELECT 
  g.name,
  g.total_members,
  g.total_xp,
  (SELECT COUNT(*) FROM guild_members gm WHERE gm.guild_id = g.id) as member_count_real
FROM guilds g;
