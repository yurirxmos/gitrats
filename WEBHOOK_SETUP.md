# 🔧 Configuração do Webhook do GitHub

## 1️⃣ Deploy da Aplicação

Primeiro, faça commit e push das mudanças:

```bash
git add .
git commit -m "feat: adiciona sistema de XP por classe com webhook do GitHub"
git push origin main
```

Aguarde o deploy no Vercel terminar.

## 2️⃣ Configurar Webhook no GitHub

### Opção A: Webhook Global (Organizacional)
Se você quer rastrear TODOS os repos de um usuário:

1. Vá em: `https://github.com/settings/apps`
2. Clique em **"New GitHub App"**
3. Preencha:
   - **GitHub App name**: `GitRats XP Tracker`
   - **Homepage URL**: `https://seu-dominio.vercel.app`
   - **Webhook URL**: `https://seu-dominio.vercel.app/api/github/webhook`
   - **Webhook secret**: (opcional, mas recomendado - anote!)

4. **Permissions** (Repository permissions):
   - Contents: Read-only
   - Pull requests: Read-only
   - Issues: Read-only
   - Metadata: Read-only

5. **Subscribe to events**:
   - [x] Push
   - [x] Pull request
   - [x] Pull request review
   - [x] Issues
   - [x] Star
   - [x] Fork

6. Clique em **"Create GitHub App"**
7. **Instale o App** na sua conta/organização

### Opção B: Webhook por Repositório
Se você quer rastrear apenas repos específicos:

1. Vá no repositório: `https://github.com/yurirxmos/SEU-REPO`
2. Settings → Webhooks → Add webhook
3. Preencha:
   - **Payload URL**: `https://seu-dominio.vercel.app/api/github/webhook`
   - **Content type**: `application/json`
   - **Secret**: (opcional)
   - **SSL verification**: Enable

4. **Which events**:
   - [x] Pushes
   - [x] Pull requests
   - [x] Pull request reviews
   - [x] Issues
   - [x] Stars
   - [x] Forks

5. Clique em **"Add webhook"**

## 3️⃣ Testar o Webhook

### Teste Manual
Faça um commit em qualquer repo configurado:

```bash
git commit --allow-empty -m "test: webhook test"
git push
```

### Verificar Logs
1. **GitHub**: Settings → Webhooks → Recent Deliveries
2. **Vercel**: Logs em tempo real
3. **Supabase**: Verifique a tabela `activity_log`

```sql
SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 10;
```

## 4️⃣ Variáveis de Ambiente (Opcional)

Se você configurou um **Webhook Secret**, adicione no Vercel:

```env
GITHUB_WEBHOOK_SECRET=seu_secret_aqui
```

E adicione validação no webhook:

```typescript
// No início do POST em webhook/route.ts
const signature = request.headers.get("x-hub-signature-256");
const secret = process.env.GITHUB_WEBHOOK_SECRET;

if (secret && signature) {
  // Validar signature
  // Implementar crypto.createHmac validation
}
```

## 5️⃣ Debugging

Se não funcionar, verifique:

### ✅ Checklist
- [ ] Deploy no Vercel concluído
- [ ] Rota acessível: `https://seu-dominio.vercel.app/api/github/webhook`
- [ ] Webhook configurado no GitHub
- [ ] Eventos corretos selecionados
- [ ] Usuário existe na tabela `users` com `github_username` correto
- [ ] Personagem criado para o usuário

### 🔍 Ver Logs
```bash
# Vercel CLI (se instalado)
vercel logs

# Ou no dashboard do Vercel:
# https://vercel.com/yurirxmos/gitrats/logs
```

### 🧪 Teste de Payload Manual
Use o GitHub webhook para reenviar payloads anteriores ou use curl:

```bash
curl -X POST https://seu-dominio.vercel.app/api/github/webhook \
  -H "Content-Type: application/json" \
  -H "x-github-event: push" \
  -d '{
    "sender": {"login": "yurirxmos"},
    "commits": [{"added": 50, "removed": 10, "modified": 5}],
    "repository": {"name": "test-repo", "owner": {"login": "yurirxmos"}}
  }'
```

## 📊 Monitorar XP

Após configurar, você verá XP sendo ganho automaticamente em:
- Dashboard: `https://seu-dominio.vercel.app/leaderboard`
- Tabela `activity_log` no Supabase
- Tabela `characters` (total_xp, level)

---

## 🎮 Bônus por Classe

Lembre-se que cada classe ganha XP diferente:

- **ORC**: +50% commits, +75% commits grandes
- **WARRIOR**: +50% PRs, +50% code reviews  
- **MAGE**: +75% issues, +100% stars/forks

Escolha a classe que combina com seu estilo de desenvolvimento! 🚀
