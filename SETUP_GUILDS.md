# Setup do Sistema de Guildas

## 📋 Passo a Passo

### 1. Acessar o Supabase

1. Acesse [https://supabase.com](https://supabase.com)
2. Entre no seu projeto GitRats
3. Vá em **SQL Editor** (ícone de banco de dados na sidebar)

### 2. Executar a Migration

1. Clique em **New Query**
2. Copie TODO o conteúdo do arquivo `supabase/migrations/20251124000000_create_guilds_system.sql`
3. Cole no editor SQL
4. Clique em **Run** (ou pressione Ctrl/Cmd + Enter)

### 3. Verificar se funcionou

Execute esta query para verificar:

```sql
SELECT * FROM guilds LIMIT 1;
```

Se não der erro, está tudo certo! ✅

### 4. Testar no App

1. Acesse `http://localhost:3000/guild`
2. Tente criar uma guilda
3. Se funcionar, o sistema está pronto! 🎮

## ⚠️ Troubleshooting

### Erro: "relation guilds does not exist"

- A migration não foi executada
- Execute novamente o passo 2

### Erro: "duplicate key value violates unique constraint"

- Tabela já existe
- Tudo certo, pode usar!

### Erro: "permission denied"

- Verifique se está usando o service role no SQL Editor
- Tente executar como admin

## 🔄 Resetar Sistema de Guildas (se necessário)

Se quiser resetar tudo:

```sql
DROP TABLE IF EXISTS public.guild_invites CASCADE;
DROP TABLE IF EXISTS public.guild_members CASCADE;
DROP TABLE IF EXISTS public.guilds CASCADE;
DROP FUNCTION IF EXISTS update_guild_total_xp() CASCADE;
DROP FUNCTION IF EXISTS update_guild_total_xp_on_leave() CASCADE;
```

Depois execute a migration novamente.
