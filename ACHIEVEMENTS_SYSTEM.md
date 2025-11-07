# Sistema de Achievements - GitRats

## 📋 Visão Geral

O sistema de achievements permite que usuários conquistem conquistas especiais por ações específicas na plataforma, ganhando XP extra e reconhecimento.

## 🗃️ Estrutura do Banco de Dados

### Tabelas Criadas

#### `achievements`
Armazena todos os achievements disponíveis no sistema.

```sql
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,                    -- Nome do achievement
  description TEXT NOT NULL,             -- Descrição detalhada
  icon TEXT,                             -- URL ou nome do ícone
  xp_reward INTEGER DEFAULT 0,           -- XP extra concedido
  type TEXT NOT NULL,                    -- Tipo: 'one_time', 'progress', 'streak'
  category TEXT,                         -- Categoria: 'contribution', 'social', 'milestone'
  requirements JSONB,                    -- Requisitos em JSON
  is_active BOOLEAN DEFAULT true,        -- Se está ativo
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `user_achievements`
Rastreia quais achievements cada usuário conquistou.

```sql
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  xp_granted INTEGER DEFAULT 0,           -- XP realmente concedido
  progress_data JSONB,                   -- Dados sobre como foi conquistado
  UNIQUE(user_id, achievement_id)        -- Um por usuário
);
```

#### `achievement_progress` (opcional)
Para achievements que têm progresso incremental.

```sql
CREATE TABLE public.achievement_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE,
  current_progress INTEGER DEFAULT 0,    -- Progresso atual
  target_progress INTEGER DEFAULT 1,     -- Meta a alcançar
  progress_data JSONB,                   -- Dados específicos
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);
```

## 🎯 Tipos de Achievements

### 1. `one_time`
Achievements conquistados uma única vez por uma ação específica.

**Exemplo:**
```json
{
  "name": "Primeiro Commit",
  "description": "Fez seu primeiro commit no GitHub",
  "type": "one_time",
  "category": "milestone",
  "xp_reward": 50,
  "requirements": {
    "action": "first_commit",
    "min_commits": 1
  }
}
```

### 2. `progress`
Achievements que requerem progresso incremental.

**Exemplo:**
```json
{
  "name": "Mestre dos Commits",
  "description": "Fez 1000 commits",
  "type": "progress",
  "category": "milestone",
  "xp_reward": 500,
  "requirements": {
    "action": "total_commits",
    "target": 1000
  }
}
```

### 3. `streak`
Achievements baseados em sequências consecutivas.

**Exemplo:**
```json
{
  "name": "Commit Diário",
  "description": "Fez commits por 7 dias consecutivos",
  "type": "streak",
  "category": "consistency",
  "xp_reward": 100,
  "requirements": {
    "action": "daily_commits",
    "streak_days": 7
  }
}
```

## 📝 Como Criar Achievements

### 1. Definir o Achievement

```sql
INSERT INTO public.achievements (
  name,
  description,
  icon,
  xp_reward,
  type,
  category,
  requirements
) VALUES (
  'Reportou um Bug',
  'Reportou um bug com sucesso e ajudou a melhorar a plataforma',
  'bug-report',
  15,
  'one_time',
  'contribution',
  '{"action": "bug_report", "min_reports": 1}'
);
```

### 2. Implementar a Lógica

Crie funções para verificar quando um achievement deve ser concedido:

```typescript
// lib/achievements.ts
export async function checkBugReportAchievement(userId: string) {
  // Verificar se usuário reportou um bug
  const hasReportedBug = await checkIfUserReportedBug(userId);

  if (hasReportedBug) {
    await unlockAchievement(userId, 'bug_report_achievement_id');
  }
}

export async function unlockAchievement(userId: string, achievementId: string) {
  // Verificar se já não conquistou
  const existing = await supabase
    .from('user_achievements')
    .select('id')
    .eq('user_id', userId)
    .eq('achievement_id', achievementId)
    .single();

  if (existing.data) return; // Já conquistou

  // Buscar dados do achievement
  const achievement = await supabase
    .from('achievements')
    .select('*')
    .eq('id', achievementId)
    .single();

  if (!achievement.data) return;

  // Conceder achievement
  await supabase.from('user_achievements').insert({
    user_id: userId,
    achievement_id: achievementId,
    xp_granted: achievement.data.xp_reward,
    progress_data: { unlocked_via: 'bug_report' }
  });

  // Conceder XP extra se houver
  if (achievement.data.xp_reward > 0) {
    await grantExtraXP(userId, achievement.data.xp_reward);
  }
}
```

### 3. Integrar com Eventos

Chame as funções de verificação nos momentos apropriados:

```typescript
// Quando usuário reporta um bug
export async function handleBugReport(userId: string, bugData: any) {
  // Salvar o bug report
  await saveBugReport(bugData);

  // Verificar achievement
  await checkBugReportAchievement(userId);

  // Outras ações...
}
```

## 🎨 Exemplo Completo: "Reportou um Bug"

### 1. Criar Achievement no Banco

```sql
INSERT INTO public.achievements (
  name,
  description,
  icon,
  xp_reward,
  type,
  category,
  requirements
) VALUES (
  'Contribuidor',
  'Reportou um bug com sucesso e ajudou a melhorar a plataforma',
  'bug-report',
  15,
  'one_time',
  'contribution',
  '{"action": "bug_report", "min_reports": 1}'
);
```

### 2. Criar Tabela de Bug Reports (se necessário)

```sql
CREATE TABLE public.bug_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'resolved', 'rejected'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);
```

### 3. Implementar Função de Verificação

```typescript
// lib/achievements/bug-report.ts
export async function checkBugReportAchievement(userId: string) {
  const supabase = createClient();

  // Verificar se usuário já tem este achievement
  const { data: existing } = await supabase
    .from('user_achievements')
    .select('id')
    .eq('user_id', userId)
    .eq('achievement_id', 'BUG_REPORT_ACHIEVEMENT_ID')
    .single();

  if (existing) return; // Já conquistou

  // Verificar se reportou pelo menos 1 bug
  const { data: bugReports } = await supabase
    .from('bug_reports')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'resolved'); // Só conta bugs resolvidos

  if (bugReports && bugReports.length >= 1) {
    // Conceder achievement
    await supabase.from('user_achievements').insert({
      user_id: userId,
      achievement_id: 'BUG_REPORT_ACHIEVEMENT_ID',
      xp_granted: 15,
      progress_data: {
        bug_reports_count: bugReports.length,
        unlocked_via: 'bug_report'
      }
    });

    // Conceder XP extra
    await grantExtraXP(userId, 15);

    // Log da conquista
    console.log(`🏆 Achievement conquistado: ${userId} reportou bug com sucesso!`);
  }
}
```

### 4. Integrar com API

```typescript
// app/api/bug-reports/route.ts
export async function POST(request: NextRequest) {
  // ... salvar bug report ...

  // Verificar achievement
  await checkBugReportAchievement(userId);

  return NextResponse.json({ success: true });
}
```

## 🔧 Funções Úteis

### Verificar Achievement
```typescript
export async function hasAchievement(userId: string, achievementId: string) {
  const { data } = await supabase
    .from('user_achievements')
    .select('id')
    .eq('user_id', userId)
    .eq('achievement_id', achievementId)
    .single();

  return !!data;
}
```

### Listar Achievements do Usuário
```typescript
export async function getUserAchievements(userId: string) {
  const { data } = await supabase
    .from('user_achievements')
    .select(`
      id,
      unlocked_at,
      xp_granted,
      achievements (
        id,
        name,
        description,
        icon,
        category
      )
    `)
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false });

  return data;
}
```

### Progresso de Achievement
```typescript
export async function updateProgress(userId: string, achievementId: string, increment: number = 1) {
  const { data: progress } = await supabase
    .from('achievement_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('achievement_id', achievementId)
    .single();

  const newProgress = (progress?.current_progress || 0) + increment;

  await supabase
    .from('achievement_progress')
    .upsert({
      user_id: userId,
      achievement_id: achievementId,
      current_progress: newProgress
    });

  // Verificar se atingiu a meta
  const achievement = await supabase
    .from('achievements')
    .select('*')
    .eq('id', achievementId)
    .single();

  if (newProgress >= achievement.data.requirements.target) {
    await unlockAchievement(userId, achievementId);
  }
}
```

## 🎯 Ideias de Achievements

### Contribuição
- "Primeiro Bug Report" (+15 XP)
- "Bug Hunter" - Reportou 5 bugs (+50 XP)
- "Feature Request" - Sugeriu uma feature (+20 XP)

### Social
- "Amigo dos Amigos" - Conectou 5 amigos (+30 XP)
- "Influencer" - Compartilhou no Twitter (+10 XP)

### Milestones
- "Primeiro Commit" (+50 XP)
- "Century Club" - 100 commits (+100 XP)
- "Milestone Master" - 1000 commits (+500 XP)

### Consistency
- "Commit Diário" - 7 dias consecutivos (+100 XP)
- "Semanalmente Ativo" - Commits em 4 semanas (+75 XP)

## 🚀 Próximos Passos

1. **Executar migração:**
   ```bash
   # No Supabase SQL Editor
   # Executar conteúdo de: supabase/migrations/add_achievements_system.sql
   ```

2. **Criar achievements iniciais:**
   - Definir achievements básicos
   - Implementar lógica de verificação

3. **Integrar na UI:**
   - Página de achievements
   - Notificações quando conquistar
   - Badge no perfil

4. **Testar:**
   - Conceder achievements manualmente
   - Verificar XP extra
   - Testar progresso

---

**Data:** 2025-11-07
**Status:** Estrutura preparada, pronto para implementação</content>
<parameter name="filePath">/home/yurirxmos/Documents/gitrats/ACHIEVEMENTS_SYSTEM.md
