create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.github_activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  github_username text not null,
  activity_type text not null check (activity_type in ('commit', 'pull_request', 'issue')),
  external_id text not null,
  repo_name text,
  title text,
  url text,
  occurred_at timestamptz not null,
  payload jsonb not null default '{}'::jsonb,
  source text not null default 'github_search',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, activity_type, external_id)
);

create index if not exists github_activity_events_user_occurred_idx
  on public.github_activity_events(user_id, occurred_at desc);

create index if not exists github_activity_events_user_type_idx
  on public.github_activity_events(user_id, activity_type);

drop trigger if exists github_activity_events_set_updated_at on public.github_activity_events;
create trigger github_activity_events_set_updated_at
before update on public.github_activity_events
for each row
execute function public.set_updated_at();

create table if not exists public.xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  activity_event_id uuid references public.github_activity_events(id) on delete cascade,
  source_type text not null check (source_type in ('github_activity', 'achievement_adjustment', 'admin_adjustment')),
  source_ref text,
  xp_amount integer not null,
  rule_version text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists xp_ledger_activity_rule_unique_idx
  on public.xp_ledger(activity_event_id, rule_version)
  where activity_event_id is not null;

create index if not exists xp_ledger_user_created_idx
  on public.xp_ledger(user_id, created_at desc);

create index if not exists xp_ledger_user_source_idx
  on public.xp_ledger(user_id, source_type);

alter table public.github_activity_events enable row level security;
alter table public.xp_ledger enable row level security;

drop policy if exists "Users can read own github activity events" on public.github_activity_events;
create policy "Users can read own github activity events"
on public.github_activity_events
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read own xp ledger" on public.xp_ledger;
create policy "Users can read own xp ledger"
on public.xp_ledger
for select
to authenticated
using (auth.uid() = user_id);
