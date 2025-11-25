-- Verificar membros das guildas
SELECT 
  g.name as guild_name,
  g.total_members,
  COUNT(gm.user_id) as actual_members
FROM guilds g
LEFT JOIN guild_members gm ON g.id = gm.guild_id
GROUP BY g.id, g.name, g.total_members;

-- Verificar membros individualmente
SELECT 
  g.name as guild_name,
  u.github_username,
  c.character_name,
  gm.role,
  gm.joined_at
FROM guild_members gm
JOIN guilds g ON gm.guild_id = g.id
JOIN users u ON gm.user_id = u.id
LEFT JOIN characters c ON u.id = c.user_id
ORDER BY g.name, gm.joined_at;
