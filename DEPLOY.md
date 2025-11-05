# Gitrats - Deploy Guide

## ⚠️ IMPORTANTE: Deploy Unificado

Este projeto faz deploy **apenas do Next.js** (`apps/web`). A API do Fastify (`apps/api`) **não será usada em produção** - vamos migrar toda lógica para Next.js API Routes.

## 1️⃣ Aplicar Migration no Supabase

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá em **SQL Editor**
3. Cole e execute:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_access_token TEXT;
CREATE INDEX IF NOT EXISTS idx_users_github_username ON users(github_username);
```

## 2️⃣ Configurar Variáveis de Ambiente na Vercel

No [Vercel Dashboard](https://vercel.com), adicione em **Settings > Environment Variables**:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://dgiesgnvmrxxedbokejh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=seu-anon-key
SUPABASE_SERVICE_ROLE_KEY=seu-service-role-key

# GitHub OAuth
GITHUB_CLIENT_ID=seu-github-client-id
GITHUB_CLIENT_SECRET=seu-github-client-secret

# Webhook Security
GITHUB_WEBHOOK_SECRET=gere-uma-string-aleatoria-segura
```

## 3️⃣ Deploy na Vercel

### Opção A: Via GitHub Integration (Recomendado)
1. Acesse [vercel.com](https://vercel.com)
2. Clique em **Add New > Project**
3. Importe seu repositório `gitrats`
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
5. Adicione as variáveis de ambiente acima
6. Clique em **Deploy**

### Opção B: Via CLI
```bash
npm i -g vercel
cd apps/web
vercel --prod
```

## 4️⃣ Configurar GitHub Webhook

1. Vá em **Settings** do repositório que deseja monitorar
2. **Webhooks > Add webhook**
3. Configure:
   - **Payload URL**: `https://seu-dominio.vercel.app/api/github/webhook`
   - **Content type**: `application/json`
   - **Secret**: mesmo valor de `GITHUB_WEBHOOK_SECRET`
   - **Events**: Push, Pull requests, Issues, Pull request reviews
4. Salve

## 5️⃣ Atualizar GitHub OAuth

1. **GitHub Settings > Developer settings > OAuth Apps**
2. Edite sua aplicação:
   - **Homepage URL**: `https://seu-dominio.vercel.app`
   - **Callback URL**: `https://dgiesgnvmrxxedbokejh.supabase.co/auth/v1/callback`

## ✅ Testar

1. Acesse `https://seu-dominio.vercel.app`
2. Login com GitHub
3. Crie personagem
4. Faça commit → XP atualiza automaticamente

## 🔧 Troubleshooting

- **Webhook falha**: Verifique secret no GitHub e Vercel
- **OAuth error**: Confirme callback URL
- **API não funciona**: Verifique se migrou rotas para `apps/web/app/api`
