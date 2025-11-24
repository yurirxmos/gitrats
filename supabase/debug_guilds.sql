-- Script de Debug para Sistema de Guildas
-- Execute no SQL Editor do Supabase para verificar o estado

-- 1. Verificar se as tabelas existem
SELECT 
  tablename, 
  schemaname
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('guilds', 'guild_members', 'guild_invites');

-- 2. Ver todas as guildas
SELECT * FROM guilds;

-- 3. Ver todos os membros
SELECT * FROM guild_members;

-- 4. Ver RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('guilds', 'guild_members', 'guild_invites');

-- 5. Testar inserção direta (substitua USER_ID_AQUI pelo seu user.id)
-- INSERT INTO guilds (name, owner_id, tag) 
-- VALUES ('Test Guild', 'USER_ID_AQUI', 'TEST');

-- 6. Verificar triggers
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('guilds', 'guild_members', 'guild_invites');
