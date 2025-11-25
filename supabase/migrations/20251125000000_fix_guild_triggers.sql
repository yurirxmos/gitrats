-- Remover triggers e funções antigas
DROP TRIGGER IF EXISTS trigger_update_guild_xp_on_member_join ON guild_members;
DROP TRIGGER IF EXISTS trigger_update_guild_xp_on_member_leave ON guild_members;
DROP FUNCTION IF EXISTS update_guild_total_xp();
DROP FUNCTION IF EXISTS update_guild_total_xp_on_leave();

-- Criar função unificada para atualizar guild
CREATE OR REPLACE FUNCTION update_guild_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_guild_id UUID;
BEGIN
  -- Determinar qual guild_id usar
  IF TG_OP = 'DELETE' THEN
    v_guild_id := OLD.guild_id;
  ELSE
    v_guild_id := NEW.guild_id;
  END IF;

  -- Atualizar estatísticas da guild
  UPDATE guilds
  SET 
    total_members = (
      SELECT COUNT(*)
      FROM guild_members
      WHERE guild_id = v_guild_id
    ),
    total_xp = (
      SELECT COALESCE(SUM(c.total_xp), 0)
      FROM guild_members gm
      JOIN characters c ON c.user_id = gm.user_id
      WHERE gm.guild_id = v_guild_id
    ),
    updated_at = NOW()
  WHERE id = v_guild_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar triggers
CREATE TRIGGER trigger_update_guild_stats_on_insert
AFTER INSERT ON guild_members
FOR EACH ROW
EXECUTE FUNCTION update_guild_stats();

CREATE TRIGGER trigger_update_guild_stats_on_delete
AFTER DELETE ON guild_members
FOR EACH ROW
EXECUTE FUNCTION update_guild_stats();

-- Forçar atualização imediata de todas as guilds
UPDATE guilds
SET 
  total_members = (
    SELECT COUNT(*)
    FROM guild_members
    WHERE guild_id = guilds.id
  ),
  total_xp = (
    SELECT COALESCE(SUM(c.total_xp), 0)
    FROM guild_members gm
    JOIN characters c ON c.user_id = gm.user_id
    WHERE gm.guild_id = guilds.id
  ),
  updated_at = NOW();
