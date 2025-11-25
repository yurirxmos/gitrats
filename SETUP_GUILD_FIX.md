# Como executar a correção dos triggers

Execute este comando no SQL Editor do Supabase:

```sql
-- Copie e cole todo o conteúdo do arquivo:
-- supabase/migrations/20251125000000_fix_guild_triggers.sql
```

Ou via linha de comando (se tiver supabase CLI configurado):

```bash
supabase db push
```

Isso vai:

1. Remover os triggers antigos que não funcionavam corretamente
2. Criar uma função unificada `update_guild_stats()` com SECURITY DEFINER
3. Criar triggers para INSERT e DELETE de membros
4. Atualizar imediatamente todas as guilds com as contagens corretas

Após executar, as contagens de membros e XP serão atualizadas automaticamente sempre que:

- Um membro entrar na guild (aceitar convite)
- Um membro sair da guild
