# 🎮 GitRats - Sistema de Economia e Progressão

## 🎯 Filosofia de Design

O sistema de XP do GitRats foi projetado para:

1. **Recompensar contribuições significativas** ao invés de quantidade pura
2. **Prevenir exploração fácil** mantendo o sistema simples
3. **Incentivar exploração** de diferentes atividades de código
4. **Criar progressão satisfatória** que mantém usuários engajados

---

## 📊 Tabela de Progressão de Níveis

Baseado na fórmula: **XP = Level³ × 4 - 15 × Level² + 100 × Level - 140**

| Nível | XP Total | XP para Próximo | Equivalente Real |
|-------|----------|-----------------|------------------|
| 1 | 0 | 100 | Primeira semana |
| 2 | 100 | 150 | Workflow básico Git |
| 3 | 250 | 200 | Primeiro PR |
| 4 | 450 | 250 | Contribuidor regular |
| 5 | 700 | 350 | Open source dabbler |
| 10 | 3,800 | 1,200 | Senior contributor |
| 15 | 9,800 | 2,000 | Expert developer |
| 20 | 22,500 | 3,500 | GitHub power user |
| 25 | 45,000 | 5,000 | Open source maintainer |
| 30 | 85,000 | 7,500 | Community leader |
| 40 | 200,000 | 12,500 | GitHub legend |
| 50 | 400,000 | 20,000 | Coding deity |

---

## 🔧 Valores de XP por Atividade

### 📝 Commits (Tier Baixo - Fácil de Fazer Spam)

| Tipo | Linhas | XP Base |
|------|--------|---------|
| Small | <10 | 2 XP |
| Medium | 10-100 | 5 XP |
| Large | 100-500 | 8 XP |
| Mega | 500+ | 10 XP |
| Empty | 0 | 0 XP |

**Anti-cheat:**
- ✅ Máximo 50 XP/dia de commits
- ✅ Commits vazios = 0 XP
- ✅ Commits revertidos perdem XP (futuro)

### 🔀 Pull Requests (Tier Médio-Alto)

| Ação | XP Base | Notas |
|------|---------|-------|
| PR aberto | 15 XP | Incentiva iniciar PRs |
| PR merged | +25 XP | Total: 40 XP |
| PR fechado sem merge | 5 XP | Esforço reconhecido |
| **Bônus por popularidade:** |  |  |
| Repo com 1k+ stars | +50% | 60 XP total |
| Repo com 10k+ stars | +100% | 80 XP total |
| **Penalidades:** |  |  |
| Repos próprios | -50% | Incentiva contribuições externas |

### ⭐ Stars Recebidas (Tier Alto - Difícil de Manipular)

| Tipo | XP |
|------|-----|
| Primeira star no repo | 50 XP |
| Cada star adicional | 10 XP |
| Star de dev verificado | +20% bônus |
| Repo com 100+ stars | +50% bônus |

### 🍴 Forks & Clones (Tier Médio)

| Tipo | XP |
|------|-----|
| Primeiro fork recebido | 30 XP |
| Cada fork adicional | 5 XP |
| Fork de dev verificado | +25% bônus |

### 🐛 Issues (Tier Médio)

| Ação | XP |
|------|-----|
| Issue criada (com boa descrição) | 10 XP |
| Issue resolvida (pelo autor) | 20 XP |
| Issue resolvida (pela comunidade) | 30 XP |
| Bug report → fix | 40 XP |

### 👁️ Code Reviews (Tier Alto)

| Ação | XP |
|------|-----|
| Review submetido | 15 XP |
| Review leva a mudanças | 25 XP |
| Review em repo popular | +30% bônus |

### 🚀 Releases & Tags (Tier Alto)

| Tipo | XP |
|------|-----|
| Primeiro release | 100 XP |
| Major version (v1.0, v2.0) | 75 XP |
| Minor version (v1.1) | 50 XP |
| Patch version (v1.1.1) | 25 XP |

---

## 🔥 Sistemas de Bônus

### Streaks (Multiplicadores)

| Streak | Bônus |
|--------|-------|
| 7 dias | +10% XP |
| 30 dias | +25% XP |
| 100 dias | +50% XP |
| 365 dias | +100% XP |

### 🌍 Diversidade de Linguagens

| Conquista | XP/Bônus |
|-----------|----------|
| Primeiro repo em nova linguagem | 50 XP |
| 10+ linguagens usadas | +15% XP global |
| Linguagem rara (Rust, Go, etc.) | +25% XP |

### 🏆 Achievements Especiais (One-time)

| Achievement | XP |
|-------------|-----|
| Primeira contribuição open source | 200 XP |
| Contribuir para repo trending | 300 XP |
| Package publicado (npm/pypi) | 500 XP |
| Repo featured no GitHub | 1,000 XP |
| GitHub badge conquistado | 100-500 XP |

---

## ⚖️ Sistemas Anti-Abuse

### Caps Diários/Semanais

- **Máximo XP por dia:** 1,000 XP
- **Máximo de commits/dia:** 50 XP
- **Pool semanal bônus:** +500 XP (completar todos os tipos de atividade)

### Multiplicadores de Qualidade do Repositório

| Tipo de Repo | Multiplicador |
|--------------|---------------|
| Próprio (privado) | 0.5x |
| Próprio (público) | 1x |
| Externo | 1.5x |
| Popular (100+ stars) | 2x |
| Trending | 3x |

### Mecanismos de Detecção

- ✅ **Análise de commits:** Verifica mudanças reais, não só count
- ✅ **Velocity checking:** Picos súbitos acionam revisão
- ✅ **Validação comunitária:** Repos populares = XP confiável
- ✅ **Cooldowns:** Não pode fazer spam da mesma ação
- ⏳ **Bônus de idade da conta:** Contas antigas ganham pequeno bônus (futuro)

---

## 🎯 Métricas de Balanceamento

### Ritmo de Progressão Esperado

| Tipo de Usuário | Horas/dia | Progressão |
|------------------|-----------|------------|
| Casual | 1h | ~1 nível/semana (níveis 1-10) |
| Ativo | 3h | ~2-3 níveis/semana (início) |
| Power User | 6h+ | Atinge caps diários, progressão constante |

### Targets de Retenção

| Milestone | Prazo | Target |
|-----------|-------|--------|
| Nível 5 | Semana 2 | 80% retenção |
| Nível 10 | Mês 1 | 60% retenção |
| Nível 20 | Mês 6 | 40% retenção |

### Loops de Engajamento

| Frequência | Atividade Sugerida |
|------------|-------------------|
| **Diário** | Checar streak, small commits |
| **Semanal** | Major PR ou release |
| **Mensal** | Nova linguagem ou trending repo |
| **Trimestral** | Projeto major ou contribuição open source |

---

## 🎭 Sistema de Evolução GitMon

| Nível | Tier | Descrição |
|-------|------|-----------|
| 1-10 | Basic GitMon | Sprite inicial |
| 11-25 | Evolved GitMon | Nova sprite, novos poderes |
| 26-40 | Final Evolution | Sprite final, habilidades máximas |
| 50+ | Legendary GitMon | Cosmetics raros, prestígio |

---

## 🚀 Próximas Features Planejadas

### Social Features
- [ ] **Team battles:** Empresas podem criar times
- [ ] **Sistema de Guilds:** Comunidades de código
- [ ] **Mentoria:** Devs senior "treinam" juniors por XP bônus

### Eventos Sazonais
- [ ] **Hacktoberfest:** +100% XP em outubro
- [ ] **GitHub Universe:** Achievement badges especiais
- [ ] **Ano Novo:** Fresh start bonus

### Melhorias Anti-Cheat
- [ ] Machine learning para detectar padrões suspeitos
- [ ] Sistema de reports da comunidade
- [ ] Validação por tempo de desenvolvimento (não pode comitar 1000 linhas em 1 minuto)

---

## 📈 Implementação Atual vs. Planejado

### ✅ Implementado
- [x] Sistema base de XP e níveis
- [x] Cálculo de commits e PRs
- [x] Caps diários básicos
- [x] Multiplicadores de repo

### ⏳ Em Desenvolvimento
- [ ] Stars e forks tracking
- [ ] Issues e code reviews
- [ ] Sistema de streaks
- [ ] Achievements especiais

### 🔮 Futuro
- [ ] Eventos sazonais
- [ ] Sistema social completo
- [ ] ML anti-cheat
- [ ] Leaderboards por linguagem/região

---

**Última atualização:** 2025-11-05  
**Versão do documento:** 1.0
