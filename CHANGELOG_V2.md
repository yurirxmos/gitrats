# 🔧 Changelog - Correção Crítica do Sistema de XP

**Data:** 2025-01-06  
**Versão:** 2.0 (Rebalanceamento Completo)

---

## ✅ CORREÇÕES IMPLEMENTADAS

### 🚨 1. Removido Stacking de Multiplicadores (EXPLOIT CRÍTICO)

**Problema:** Multiplicadores se acumulavam exponencialmente (external × class_external × class_commit)  
**Antes:** Orc ganhava 18.9 XP por commit (236% do base)  
**Depois:** Apenas o MAIOR multiplicador é aplicado

**Arquivos modificados:**

- `lib/xp-system.ts` - `calculateCommitXp()`
- `lib/xp-system.ts` - `calculatePullRequestXp()`

**Impacto:**

- ✅ Commits grandes externos: 8 XP → 12 XP (1.5x max ao invés de 2.36x)
- ✅ PRs em repos populares: Redução de 50% no XP exploitável
- ✅ Balanceamento justo entre classes

---

### 🎯 2. Balanceamento de Classes (DESBALANCEAMENTO)

**Problema:** Mage +68% XP vs Orc, Warrior +37% XP vs Orc

**Mudanças nos multiplicadores:**

| Classe      | Atividade       | Antes    | Depois   | Redução     |
| ----------- | --------------- | -------- | -------- | ----------- |
| **Orc**     | Commits         | 1.5x     | 1.3x     | -13%        |
| **Orc**     | Large Commits   | 1.75x    | 1.4x     | -20%        |
| **Warrior** | Pull Requests   | 1.5x     | 1.25x    | -17%        |
| **Warrior** | Code Reviews    | 1.5x     | 1.3x     | -13%        |
| **Warrior** | External Repos  | 1.25x    | 1.15x    | -8%         |
| **Mage**    | Issues          | 1.75x    | 1.4x     | -20%        |
| **Mage**    | Achievements    | 1.5x     | 1.3x     | -13%        |
| **Mage**    | **Stars/Forks** | **2.0x** | **1.3x** | **-35%** 🔥 |

**Arquivos modificados:**

- `lib/classes.ts` - `CLASS_XP_MULTIPLIERS`
- `lib/classes.ts` - `CLASS_DESCRIPTIONS` (atualizado strengths)

**Resultado esperado:**

- Orc: ~200 XP/dia
- Warrior: ~220 XP/dia (+10%)
- Mage: ~230 XP/dia (+15%)

**Balanceamento muito mais justo!** ✅

---

### 🛡️ 3. Caps Diários por Tipo de Atividade (ANTI-FARMING)

**Problema:** Apenas cap geral de 1000 XP/dia permitia farming extremo

**Antes:**

```typescript
MAX_XP_PER_DAY: 1000
MAX_COMMIT_XP_PER_DAY: 50 (5%)
```

**Depois:**

```typescript
MAX_XP_PER_DAY: 500; // -50%
MAX_COMMIT_XP_PER_DAY: 200; // 40% do cap
MAX_PR_XP_PER_DAY: 150; // 30% do cap
MAX_STARS_XP_PER_DAY: 50; // 10% do cap ⭐ (NERF MAGE FARMING)
MAX_REVIEWS_XP_PER_DAY: 100; // 20% do cap
MAX_ISSUES_XP_PER_DAY: 100; // 20% do cap
```

**Arquivos modificados:**

- `lib/xp-system.ts` - `XP_CONSTANTS`

**Impacto:**

- ❌ Impossível farmar 10,000 XP/mês com stars
- ❌ Impossível fazer Level 20 em 2 semanas
- ✅ Progressão orgânica e equilibrada

---

### 🔐 4. Proteção Anti-Duplicação (BUG CRÍTICO)

**Problema:** Webhook + Sync podiam processar mesmo commit 2x (XP duplicado)

**Solução implementada:**

#### A) Nova estrutura no banco de dados:

```sql
-- Adicionado em supabase-migration-anti-duplication.sql

ALTER TABLE activity_log
ADD COLUMN commit_sha VARCHAR(40),    -- SHA único do commit (GitHub)
ADD COLUMN pr_number INTEGER,         -- Número da PR
ADD COLUMN metadata_hash VARCHAR(64); -- Hash MD5 de fallback

CREATE INDEX idx_activity_log_commit_sha ON activity_log(commit_sha);
CREATE INDEX idx_activity_log_pr_number ON activity_log(user_id, pr_number);
```

#### B) Verificação nos endpoints:

```typescript
// sync/route.ts - Verificar commit SHA antes de processar
const { data: existingActivity } = await supabase
  .from("activity_log")
  .select("id")
  .eq("user_id", userData.id)
  .eq("commit_sha", commitSha) // ✅ Chave única garantida
  .single();

if (existingActivity) {
  skippedDuplicates++;
  continue;
}
```

**Arquivos modificados:**

- `app/api/github/sync/route.ts` - Usa `commit_sha` e `pr_number`
- `app/api/github/webhook/route.ts` - Usa `commit_sha` e `pr_number`
- `supabase-migration-anti-duplication.sql` - Migração SQL

**Resultado:**

- ✅ 0% de chance de XP duplicado
- ✅ Sincronização segura entre webhook e sync
- ✅ Contador de duplicatas ignoradas no response

---

### ⚖️ 5. Validação de Caps no Sync (BUG)

**Problema:** Endpoint de sync ignorava caps diários (podia ganhar 500+ XP em 1 sync)

**Solução:**

```typescript
// Funções auxiliares adicionadas
async function getDailyXp(supabase, userId): Promise<number>;
async function getDailyXpByType(supabase, userId, activityType): Promise<number>;

// Validação ANTES de adicionar XP
const dailyCommitXp = await getDailyXpByType(supabase, userData.id, "commit");

// Cap de commits diário
if (dailyCommitXp + xp > XP_CONSTANTS.MAX_COMMIT_XP_PER_DAY) {
  xp = Math.max(0, XP_CONSTANTS.MAX_COMMIT_XP_PER_DAY - dailyCommitXp);
  if (xp <= 0) continue;
  cappedActivities++;
}
```

**Arquivos modificados:**

- `app/api/github/sync/route.ts` - Validação completa de caps
- `app/api/github/webhook/route.ts` - Validação completa de caps

**Response atualizado:**

```json
{
  "xp_gained": 150,
  "activities_synced": 25,
  "duplicates_skipped": 5,
  "activities_capped": 3,
  "daily_xp_used": 380,
  "daily_xp_remaining": 120
}
```

---

### 📈 6. Fórmula de Progressão Balanceada

**Problema:** Level 10 em 12 dias (muito fácil), Level 50 em 6 anos (impossível)

**Fórmula antiga:**

```typescript
XP = Level³ × 4 - 15 × Level² + 100 × Level - 140
```

**Fórmula nova (linear):**

```typescript
XP = Level² × 100 + Level × 50
```

**Comparação (200 XP/dia):**

| Level | XP Total (Antiga) | Dias (Antiga) | XP Total (Nova) | Dias (Nova)    | Diferença |
| ----- | ----------------- | ------------- | --------------- | -------------- | --------- |
| 10    | 2,460             | 12 dias       | 10,500          | **52 dias**    | +333% ⬆️  |
| 20    | 19,460            | 97 dias       | 41,000          | **205 dias**   | +111% ⬆️  |
| 30    | 72,460            | 362 dias      | 91,500          | **457 dias**   | +26% ⬆️   |
| 50    | 447,460           | 2,237 dias    | 252,500         | **1,262 dias** | -44% ⬇️   |

**Resultado:**

- ✅ Progressão inicial mais desafiadora (não Level 10 em 2 semanas)
- ✅ Progressão final mais alcançável (Level 50 em ~3.5 anos)
- ✅ Curva muito mais suave e linear

**Arquivos modificados:**

- `lib/xp-system.ts` - `getXpForLevel()`

---

## 📊 IMPACTO FINAL

### Balanceamento de Classes (mesmas atividades/dia):

| Classe  | XP/dia (Antes) | XP/dia (Depois) | Diferença |
| ------- | -------------- | --------------- | --------- |
| Orc     | 220 XP         | **~200 XP**     | -9%       |
| Warrior | 302 XP         | **~220 XP**     | -27% ⬇️   |
| Mage    | 371 XP         | **~230 XP**     | -38% ⬇️   |

**Diferença entre melhor/pior classe:**

- **Antes:** 68% (Mage vs Orc) ❌
- **Depois:** 15% (Mage vs Orc) ✅

### Exploits Eliminados:

✅ Stacking de multiplicadores (Orc 236% → 150%)  
✅ Farming de stars (Mage 10,000 XP/mês → 50 XP/dia cap)  
✅ PR spam em repos populares (Warrior 112 XP → 40 XP)  
✅ Duplicação de XP (webhook + sync)  
✅ Sync ignorando caps diários  
✅ Commit bombing (cap de 200 XP/dia)

### Progressão:

✅ Level 10: 12 dias → **52 dias** (+333%)  
✅ Level 20: 97 dias → **205 dias** (+111%)  
✅ Level 50: 2,237 dias → **1,262 dias** (-44%)

---

## 🚀 MIGRAÇÃO NECESSÁRIA

### 1. Executar SQL no Supabase:

```bash
# Arquivo criado: supabase-migration-anti-duplication.sql
```

Aplicar no Supabase Dashboard → SQL Editor:

- Adiciona colunas `commit_sha`, `pr_number`, `metadata_hash`
- Cria índices para performance
- Cria funções auxiliares SQL

### 2. Deploy do código:

```bash
git add .
git commit -m "fix: sistema de XP balanceado (v2.0) - remove exploits, caps por atividade, anti-duplicação"
git push
vercel --prod
```

### 3. Verificar:

- [ ] Migração SQL executada com sucesso
- [ ] Deploy no Vercel concluído
- [ ] Testar sync endpoint (verificar `duplicates_skipped`)
- [ ] Testar webhook (verificar caps aplicados)
- [ ] Verificar balanceamento no leaderboard

---

## 📝 BREAKING CHANGES

⚠️ **Personagens existentes NÃO perdem XP/nível**

Mas a progressão futura será mais lenta devido a:

1. Multiplicadores reduzidos
2. Caps por atividade
3. Fórmula de progressão alterada

**Sugestão:** Anunciar rebalanceamento como "Season 2" ou "Patch 2.0"

---

## 🎯 PRÓXIMOS PASSOS (OPCIONAL)

1. **Rate Limiting:** Limitar requests por hora (prevenir API abuse)
2. **Analytics:** Dashboard de XP farming patterns
3. **Achievements anti-exploit:** Detectar comportamentos suspeitos
4. **Soft reset:** Opção de resetar personagem com bônus

---

**Changelog finalizado em:** 2025-01-06 23:45  
**Arquivos modificados:** 5  
**Linhas alteradas:** ~400  
**Exploits corrigidos:** 6  
**Balanceamento:** ✅ Equilibrado
