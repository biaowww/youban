-- ============================================================
-- 游伴 YouBan · 线上化 v1 数据库初始化（Supabase 自托管 / Postgres 15+）
-- 设计原则：
--   1) games 表 = 「可查询列 + data jsonb 全量文档」混合模式。
--      客户端 adaptGame() 直接消费 data（与 src/data/games/*.json 同构），
--      迁移零改造；后续需要精细查询再拆关系表。
--   2) 用户数据全部 RLS 行级隔离；games 公共只读。
--   3) 账号体系走 Supabase Auth（auth.users），本文件只建业务表。
-- 执行：psql 或 supabase studio SQL editor 跑一遍（幂等：if not exists）。
-- ============================================================

-- ───────── 游戏内容（公共只读） ─────────
create table if not exists public.games (
  id             text primary key,                -- 同 JSON id：jedi_fo / black_myth_wukong / ...
  steam_app_id   integer unique,
  name           text not null,
  title_main     text,
  title_sub      text,
  short          text,
  genre          text,
  developer      text,
  year           integer,
  total_hours_main numeric,
  data           jsonb not null,                  -- 完整游戏 JSON（唯一内容真相源）
  version        integer not null default 1,      -- 内容版本，客户端据此做缓存失效
  published      boolean not null default true,
  updated_at     timestamptz not null default now()
);

comment on table public.games is '游戏内容库。data = 完整 JSON 文档（schema 见仓库 src/scripts/validate-games.js）';

-- ───────── 用户资料（1:1 auth.users） ─────────
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  nickname   text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ───────── 平台绑定（Steam / WeGame / PSN / Epic） ─────────
create table if not exists public.user_platform_links (
  user_id      uuid not null references auth.users(id) on delete cascade,
  platform     text not null check (platform in ('steam','wegame','psn','epic','wechat')),
  platform_uid text not null,                     -- steam=SteamID64；wechat=openid
  meta         jsonb,
  linked_at    timestamptz not null default now(),
  primary key (user_id, platform)
);

-- ───────── 游戏进度（当前值，1 行/用户/游戏） ─────────
create table if not exists public.user_game_progress (
  user_id             uuid not null references auth.users(id) on delete cascade,
  game_id             text not null references public.games(id),
  current_pct         numeric not null check (current_pct >= 0 and current_pct <= 100),
  source              text not null default 'manual' check (source in ('manual','steam','screenshot')),
  matched_achievement text,                       -- source=steam 时：决定 pct 的成就 steamId
  updated_at          timestamptz not null default now(),
  primary key (user_id, game_id)
);

-- ───────── 进度历史（追加式，供曲线/回滚/审计） ─────────
create table if not exists public.progress_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  game_id    text not null references public.games(id),
  pct        numeric not null check (pct >= 0 and pct <= 100),
  source     text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_progress_events_user_game
  on public.progress_events (user_id, game_id, created_at desc);

-- ============================================================
-- RLS（行级安全）
-- ============================================================
alter table public.games                enable row level security;
alter table public.profiles             enable row level security;
alter table public.user_platform_links  enable row level security;
alter table public.user_game_progress   enable row level security;
alter table public.progress_events      enable row level security;

-- games：所有人（含匿名 anon）可读已发布内容；写只走 service_role（seed 脚本）
drop policy if exists games_public_read on public.games;
create policy games_public_read on public.games
  for select using (published);

-- profiles / links / progress：仅本人可读写
drop policy if exists profiles_own on public.profiles;
create policy profiles_own on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists links_own on public.user_platform_links;
create policy links_own on public.user_platform_links
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists progress_own on public.user_game_progress;
create policy progress_own on public.user_game_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists events_own_read on public.progress_events;
create policy events_own_read on public.progress_events
  for select using (auth.uid() = user_id);
drop policy if exists events_own_insert on public.progress_events;
create policy events_own_insert on public.progress_events
  for insert with check (auth.uid() = user_id);

-- updated_at 自动刷新
create or replace function public.touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_games_touch on public.games;
create trigger trg_games_touch before update on public.games
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_progress_touch on public.user_game_progress;
create trigger trg_progress_touch before update on public.user_game_progress
  for each row execute function public.touch_updated_at();
