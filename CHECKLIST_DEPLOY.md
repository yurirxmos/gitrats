# 🎮 GitRats - Checklist de Deploy Completo

## ✅ Pré-requisitos
- [ ] Conta no Supabase criada
- [ ] Conta no Vercel criada
- [ ] OAuth App do GitHub configurado
- [ ] Repositório no GitHub

---

## 📦 1. Database (Supabase)

### 1.1 Executar Migration
```sql
-- Execute no Supabase SQL Editor
-- Arquivo: supabase-schema.sql

CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  character_id UUID REFERENCES public.characters(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT,
  xp_gained INTEGER DEFAULT 0,
  total_xp_after INTEGER,
  level_after INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_character_id ON public.activity_log(character_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log(created_at DESC);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
```

### 1.2 Verificar Tabelas Existentes
- [ ] `users` - com colunas: `id`, `github_id`, `github_username`, `github_avatar_url`
- [ ] `characters` - com colunas: `id`, `user_id`, `name`, `class`, `level`, `total_xp`, `current_xp`
- [ ] `github_stats` - com colunas: `user_id`, `total_commits`, `total_prs`
- [ ] `activity_log` - recém criada

---

## 🚀 2. Deploy (Vercel)

### 2.1 Variáveis de Ambiente
No Vercel Dashboard → Settings → Environment Variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# GitHub OAuth
GITHUB_CLIENT_ID=Ov...
GITHUB_CLIENT_SECRET=...

# Webhook Security (opcional mas recomendado)
GITHUB_WEBHOOK_SECRET=sua-string-aleatoria-segura
```

### 2.2 Deploy
```bash
git add .
git commit -m "feat: sistema de XP por classe com webhook"
git push origin main
```

### 2.3 Verificar Deploy
- [ ] Deploy concluído sem erros
- [ ] Aplicação acessível: `https://seu-dominio.vercel.app`
- [ ] Endpoint de teste funcionando: `https://seu-dominio.vercel.app/api/github/webhook/test`

---

## 🔗 3. GitHub Webhook

### 3.1 Configurar Webhook

**Opção A: Por Repositório** (Recomendado para testes)
1. Vá em: `github.com/yurirxmos/seu-repo/settings/hooks`
2. Add webhook
3. Configure:
   - Payload URL: `https://seu-dominio.vercel.app/api/github/webhook`
   - Content type: `application/json`
   - Secret: (mesmo de `GITHUB_WEBHOOK_SECRET`)
   - Events: Push, Pull requests, Pull request reviews, Issues, Stars, Forks
4. Save webhook

**Opção B: GitHub App** (Para múltiplos repos)
1. Vá em: `github.com/settings/apps`
2. New GitHub App
3. Configure conforme `WEBHOOK_SETUP.md`

### 3.2 Testar Webhook
```bash
# Faça um commit de teste
git commit --allow-empty -m "test: webhook integration"
git push
```

### 3.3 Verificar Funcionamento

**No GitHub:**
- [ ] Settings → Webhooks → Recent Deliveries
- [ ] Última entrega com status 200 OK
- [ ] Response body mostra `"success": true`

**No Vercel:**
- [ ] Logs mostram requisição recebida
- [ ] Sem erros de execução

**No Supabase:**
```sql
-- Deve retornar pelo menos 1 registro
SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 5;
```

---

## 🎯 4. Testar Sistema Completo

### 4.1 Criar Personagem
1. Acesse `https://seu-dominio.vercel.app`
2. Login com GitHub
3. Complete onboarding
4. Escolha classe (Orc, Warrior ou Mage)
5. Crie personagem

### 4.2 Verificar Bônus de Classe

**Orc ganha mais XP com:**
- Commits normais (+50%)
- Commits grandes (+75%)
- Releases (+25%)

**Warrior ganha mais XP com:**
- Pull Requests (+50%)
- Code Reviews (+50%)
- Repos externos (+25%)

**Mage ganha mais XP com:**
- Issues resolvidas (+75%)
- Stars/Forks (+100%)
- Achievements (+50%)

### 4.3 Testar Ganho de XP

**Teste 1: Commit**
```bash
echo "test" >> README.md
git add README.md
git commit -m "test: xp gain test"
git push
```

Aguarde ~30s e verifique:
```sql
SELECT 
  al.description,
  al.xp_gained,
  al.total_xp_after,
  c.class
FROM activity_log al
JOIN characters c ON al.character_id = c.id
ORDER BY al.created_at DESC
LIMIT 1;
```

**Teste 2: Pull Request**
1. Crie branch: `git checkout -b test-pr`
2. Faça commit e push
3. Abra PR no GitHub
4. Verifique XP no leaderboard

### 4.4 Verificar Leaderboard
- [ ] Acesse `/leaderboard`
- [ ] Seu personagem aparece
- [ ] XP está correto
- [ ] Bônus de classe aparece no card

---

## 🐛 5. Troubleshooting

### Webhook não funciona?

**Checklist:**
1. [ ] Deploy concluído no Vercel
2. [ ] URL do webhook correta (sem `/` no final)
3. [ ] Events corretos selecionados no GitHub
4. [ ] Usuário existe na tabela `users` com `github_username` correto
5. [ ] Personagem criado para o usuário

**Ver logs detalhados:**
```bash
# Vercel CLI
vercel logs --follow

# Ou no dashboard
# vercel.com/yurirxmos/gitrats/logs
```

**Testar manualmente:**
```bash
curl -X POST https://seu-dominio.vercel.app/api/github/webhook \
  -H "Content-Type: application/json" \
  -H "x-github-event: push" \
  -d '{
    "sender": {"login": "SEU_GITHUB_USERNAME"},
    "commits": [{"added": 50, "removed": 10, "modified": 5}],
    "repository": {"name": "test", "owner": {"login": "SEU_GITHUB_USERNAME"}}
  }'
```

### XP não atualiza?

**Verificar:**
```sql
-- Ver se usuário existe
SELECT * FROM users WHERE github_username = 'SEU_USERNAME';

-- Ver se personagem existe
SELECT * FROM characters WHERE user_id = (
  SELECT id FROM users WHERE github_username = 'SEU_USERNAME'
);

-- Ver logs de erro
SELECT * FROM activity_log WHERE description LIKE '%erro%';
```

### Bônus de classe não aparece?

**Verificar:**
1. [ ] Classe está correta: `'orc'`, `'warrior'` ou `'mage'` (minúsculas)
2. [ ] Componente `ClassBonusIndicator` importado no leaderboard
3. [ ] Props `characterClass` sendo passado corretamente

---

## 📊 6. Monitoramento

### Queries Úteis

```sql
-- Leaderboard completo
SELECT 
  u.github_username,
  c.name,
  c.class,
  c.level,
  c.total_xp,
  gs.total_commits,
  gs.total_prs
FROM characters c
JOIN users u ON c.user_id = u.id
LEFT JOIN github_stats gs ON c.user_id = gs.user_id
ORDER BY c.total_xp DESC;

-- Atividades recentes
SELECT 
  u.github_username,
  al.activity_type,
  al.description,
  al.xp_gained,
  al.created_at
FROM activity_log al
JOIN users u ON al.user_id = u.id
ORDER BY al.created_at DESC
LIMIT 20;

-- XP ganho por classe
SELECT 
  c.class,
  COUNT(*) as total_characters,
  AVG(c.total_xp) as avg_xp,
  MAX(c.total_xp) as max_xp
FROM characters c
GROUP BY c.class
ORDER BY avg_xp DESC;
```

---

## ✨ Tudo Pronto!

Se todos os checkboxes acima estão marcados, seu sistema está funcionando perfeitamente! 🎉

**Próximos passos:**
1. Compartilhe com amigos desenvolvedores
2. Configure webhooks em mais repos
3. Acompanhe o leaderboard
4. Evolua seu personagem!

🚀 **Happy coding and level up!**
