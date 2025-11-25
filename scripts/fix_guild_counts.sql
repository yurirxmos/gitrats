-- Verificar se os triggers existem
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_timing
FROM information_schema.triggers 
WHERE event_object_table IN ('guild_members', 'guilds')
ORDER BY event_object_table, trigger_name;

-- Forçar atualização manual de todas as guildas
UPDATE guilds
SET 
  total_xp = (
    SELECT COALESCE(SUM(c.total_xp), 0)
    FROM guild_members gm
    JOIN characters c ON c.user_id = gm.user_id
    WHERE gm.guild_id = guilds.id
  ),
  total_members = (
    SELECT COUNT(*)
    FROM guild_members
    WHERE guild_id = guilds.id
  ),
  updated_at = NOW();

-- Verificar resultado
SELECT 
  g.name,
  g.tag,
  g.total_members,
  g.total_xp,
  COUNT(gm.user_id) as actual_members,
  COALESCE(SUM(c.total_xp), 0) as actual_total_xp
FROM guilds g
LEFT JOIN guild_members gm ON g.id = gm.guild_id
LEFT JOIN characters c ON c.user_id = gm.user_id
GROUP BY g.id, g.name, g.tag, g.total_members, g.total_xp;
