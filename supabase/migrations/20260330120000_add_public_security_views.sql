create or replace view public.public_leaderboard as
select
  row_number() over (order by c.total_xp desc, c.level desc, c.created_at asc) as rank,
  c.name as character_name,
  c.class as character_class,
  c.level,
  c.total_xp,
  u.github_username,
  u.github_avatar_url,
  greatest(coalesce(gs.total_commits, 0) - coalesce(gs.baseline_commits, 0), 0) as total_commits,
  greatest(coalesce(gs.total_prs, 0) - coalesce(gs.baseline_prs, 0), 0) as total_prs,
  greatest(coalesce(gs.total_issues, 0) - coalesce(gs.baseline_issues, 0), 0) as total_issues,
  g.tag as guild_tag,
  coalesce(
    array_agg(distinct a.code) filter (where a.code is not null),
    '{}'::text[]
  ) as achievement_codes
from public.characters c
join public.users u on u.id = c.user_id
left join public.github_stats gs on gs.user_id = c.user_id
left join public.guild_members gm on gm.user_id = c.user_id
left join public.guilds g on g.id = gm.guild_id
left join public.user_achievements ua on ua.user_id = c.user_id
left join public.achievements a on a.id = ua.achievement_id and a.is_active = true
group by
  c.id,
  c.name,
  c.class,
  c.level,
  c.total_xp,
  c.created_at,
  u.github_username,
  u.github_avatar_url,
  gs.total_commits,
  gs.baseline_commits,
  gs.total_prs,
  gs.baseline_prs,
  gs.total_issues,
  gs.baseline_issues,
  g.tag;

alter view public.public_leaderboard set (security_invoker = true);

create or replace view public.public_guild_members as
select
  gm.guild_id,
  gm.joined_at,
  gm.role,
  u.github_username,
  u.github_avatar_url,
  c.name as character_name,
  c.class as character_class,
  c.level,
  c.total_xp
from public.guild_members gm
join public.users u on u.id = gm.user_id
left join public.characters c on c.user_id = gm.user_id;

alter view public.public_guild_members set (security_invoker = true);

create or replace view public.public_guild_leaderboard as
select
  row_number() over (order by g.total_xp desc, g.created_at asc) as rank,
  g.id,
  g.name,
  g.tag,
  g.total_members,
  g.total_xp,
  owner_user.github_username as owner_username
from public.guilds g
join public.users owner_user on owner_user.id = g.owner_id;

alter view public.public_guild_leaderboard set (security_invoker = true);

grant select on public.public_leaderboard to anon, authenticated;
grant select on public.public_guild_members to anon, authenticated;
grant select on public.public_guild_leaderboard to anon, authenticated;
