# AGENTS.md - GitRats Development Guidelines

This file provides guidelines for agentic coding agents working on the GitRats codebase.

## Project Overview

GitRats is a gamification platform that transforms GitHub activity into RPG-style progression with character classes, guilds, achievements, and real-time synchronization. Built with Next.js 16, React 19, TypeScript, Supabase, and Tailwind CSS.

## Build/Test/Lint Commands

### Development Commands

```bash
bun dev          # Start development server
bun build        # Build for production
bun start        # Start production server
bun lint         # Run ESLint
bun format       # Format code with Prettier
```

### Package Manager

- **Use Bun** as the package manager (not npm/yarn)
- ESM modules only (type: "module" in package.json)

### Testing

- No test framework currently configured
- When adding tests, prefer Vitest for alignment with ESM and TypeScript

## Technology Stack

### Core

- **Next.js 16.0.10** with App Router (Server Components by default)
- **React 19.2.0** with modern hooks
- **TypeScript 5** with strict configuration
- **Bun** package manager

### Backend & State

- **Supabase** (PostgreSQL with Row Level Security)
- **TanStack React Query 5.90.10** for client state management
- **GitHub API** via @octokit/rest and @octokit/graphql

### Styling

- **Tailwind CSS 4.0.0**
- **Shadcn/ui** component library with Radix UI primitives
- **class-variance-authority** for component variants

## Code Style Guidelines

### File Naming & Structure

- **Files**: kebab-case (e.g., `user-profile.tsx`, `github-service.ts`)
- **Components**: PascalCase (e.g., `UserProfile`, `AchievementBadge`)
- **Variables/Functions**: camelCase (e.g., `userData`, `fetchGithubStats`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `SITE_URL`, `MAX_LEVEL`)

### Directory Structure

```
app/                    # Next.js App Router pages
├── (auth)/            # Route groups for authentication
├── (dashboard)/       # Protected dashboard areas
├── (public)/          # Public-facing pages
├── admin/             # Admin functionality
└── api/               # API routes

lib/                   # Business logic & utilities
components/            # Reusable UI components
├── ui/               # Base UI components (shadcn/ui)
└── layout-controller/ # Layout-specific components

contexts/              # React context providers
hooks/                 # Custom React hooks
```

### Imports & Exports

- Use absolute imports with `@/` prefix: `import { UserProfile } from "@/lib/types"`
- Named exports preferred over default exports for utilities
- Default exports for pages and main components
- Import order: external packages, internal modules, relative imports

### TypeScript Guidelines

#### Type Definitions

- **Strict mode enabled** - no `any` allowed, use `unknown` if needed
- **Interface for objects**, `type` for unions/intersections
- Explicit typing for function parameters and return values
- Use generics sparingly, only when truly needed

```typescript
// Good
export interface UserProfile {
  character_name: string;
  character_class: "warrior" | "mage" | "orc";
  level: number;
  total_xp: number;
}

export function calculateLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100));
}

// Avoid
function processData(data: any): any {
  // Use specific types instead
}
```

#### Type Exports

- Export types from dedicated `types.ts` files
- Co-locate types with related functionality when specific to that module

### Component Guidelines

#### React Components

- **Server Components by default** - add `"use client"` only when needed
- Functional components with modern hooks
- Props interfaces defined above component
- Use React 19 features (useOptimistic, useActionState when appropriate)

```typescript
interface AchievementBadgeProps {
  code: string;
  earned: boolean;
  className?: string;
}

export function AchievementBadge({
  code,
  earned,
  className,
}: AchievementBadgeProps) {
  // Component implementation
}
```

#### Styling with Tailwind

- Use `cn()` utility from `@/lib/utils` to merge classes
- Prefer Tailwind utilities over custom CSS
- Use class-variance-authority for component variants
- Dark mode support with `dark:` prefixes

```typescript
import { cn } from "@/lib/utils";

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
```

### Error Handling

#### Error Boundaries

- Use global error boundaries (`global-error.tsx`, `error.tsx`)
- Provide meaningful error messages in Portuguese
- Include error digest for debugging when available
- Always provide recovery actions (retry buttons)

```typescript
// Error component pattern
export default function Error({ error, reset }: ErrorPageProps) {
  return (
    <div className="text-center space-y-4">
      <h2>Algo deu errado</h2>
      <p className="text-neutral-500">{error?.message || "Erro inesperado"}</p>
      <button onClick={reset}>Tentar novamente</button>
    </div>
  );
}
```

#### API Error Handling

- Use TanStack Query for API state management
- Handle loading, error, and success states
- Provide user-friendly error messages
- Implement proper retry logic

### State Management

#### Client State

- **TanStack React Query** for server state
- React Context for global client state (user, theme)
- Local state with `useState` for component-specific data
- Avoid prop drilling - use context when sharing across multiple levels

#### Server State

- Server Components for initial data fetching
- React Query for client-side data management and caching
- Optimistic updates for user interactions

### Database & API

#### Supabase Integration

- Use Row Level Security (RLS) policies
- Type-safe queries with generated types
- Real-time subscriptions where appropriate
- Server-side queries in Server Components, client queries with React Query

#### GitHub API

- Use @octokit/rest for REST API calls
- Use @octokit/graphql for complex queries
- Implement proper rate limiting and error handling
- Cache GitHub data appropriately

### Internationalization & Content

#### Language

- **Portuguese** for user-facing content, comments, and documentation
- English for technical terms and code identifiers
- Consistent terminology throughout the application

#### Comments

- Document complex business logic in Portuguese
- Explain non-obvious technical decisions
- Avoid obvious comments that restate the code

```typescript
// Calcula XP baseado no tipo de contribuição
function calculateXP(contribution: GitHubContribution): number {
  // Commits valem menos para evitar spam
  if (contribution.type === "commit") return 5;
  // PRs e issues valem mais por serem mais valiosas
  return contribution.type === "pr" ? 50 : 30;
}
```

### Performance Guidelines

#### Next.js Optimization

- Use Server Components by default
- Implement proper loading states
- Optimize images with Next.js Image component
- Implement proper caching strategies

#### Bundle Optimization

- Dynamic imports for heavy components
- Tree-shake unused dependencies
- Monitor bundle size with build analysis

### Security Guidelines

#### Authentication

- Use Supabase Auth with proper session management
- Implement proper route protection
- Validate user permissions on both client and server

#### Data Validation

- Validate all user inputs
- Use TypeScript for compile-time validation
- Implement runtime validation for external data

### Git Workflow

#### Commit Messages

- Use conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`
- Write messages in Portuguese
- One commit per logical change
- Avoid committing debug code or console.logs

```
feat: adiciona sistema de conquistas
fix: corrige cálculo de XP para commits
refactor: simplifica lógica de level up
```

## Common Patterns

### Data Fetching

```typescript
// Server Component pattern
export default async function UserProfilePage({ params }: { params: { id: string } }) {
  const user = await getUserProfile(params.id);
  return <UserProfileView user={user} />;
}

// Client Component with React Query
export function UserStats() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['user-stats'],
    queryFn: fetchUserStats,
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  return <StatsDisplay stats={stats} />;
}
```

### Form Handling

```typescript
// Use React 19 useActionState for forms
export function UpdateProfileForm() {
  const [state, action, isPending] = useActionState(updateProfile, null);

  return (
    <form action={action}>
      <input name="characterName" required />
      <button disabled={isPending}>
        {isPending ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  );
}
```
