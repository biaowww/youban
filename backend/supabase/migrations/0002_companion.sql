-- ============================================================
-- 游伴 YouBan · 攻略簿（Companion AI）数据表
-- 设计原则（承接 0001_init.sql）：
--   1) 一款游戏一本簿：companion_sessions 以 (身份, game_id) 唯一。
--   2) 身份两制并存：正式账号走 user_id（auth.users）；个人内测期
--      客户端只有设备 ID，走 device_id。二者至少其一非空。
--      device_id 行只由 BFF 以 service_role 写（绕过 RLS），不对 anon 开放。
--   3) 全量对话落库（companion_messages）但**不全量入 prompt**——
--      prompt 只带最近 N 轮 + 「状态卡」(companion_profiles.card jsonb)。
--      状态卡是长程记忆的压缩形态，由 BFF 每 N 轮用轻量模型增量合并。
--   4) 玩家进度（current_pct）不进状态卡：以客户端进度滑块为准，
--      每次请求随身带上，LLM 只读不写，避免"模型改了我的进度"。
-- 执行：psql 或 Studio SQL editor（幂等）。
-- ============================================================

create table if not exists public.companion_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  device_id   text,                                  -- 内测期设备标识（客户端 uuid）
  game_id     text not null references public.games(id),
  turns       integer not null default 0,            -- 助手已回复轮数（驱动状态卡刷新节奏）
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint companion_sessions_identity check (user_id is not null or device_id is not null)
);
create unique index if not exists uq_companion_user_game
  on public.companion_sessions (user_id, game_id) where user_id is not null;
create unique index if not exists uq_companion_device_game
  on public.companion_sessions (device_id, game_id) where device_id is not null;

comment on table public.companion_sessions is '攻略簿会话：一款游戏一本（按 user_id 或 device_id）';

create table if not exists public.companion_messages (
  id          bigint generated always as identity primary key,
  session_id  uuid not null references public.companion_sessions(id) on delete cascade,
  role        text not null check (role in ('user','assistant')),
  content     text not null,
  pct         numeric,                               -- 该条发出时玩家进度（审计/回放用）
  meta        jsonb,                                 -- usage / model 等
  created_at  timestamptz not null default now()
);
create index if not exists idx_companion_messages_session
  on public.companion_messages (session_id, created_at desc);

create table if not exists public.companion_profiles (
  session_id  uuid primary key references public.companion_sessions(id) on delete cascade,
  card        jsonb not null default '{}'::jsonb,   -- 状态卡（schema 见 backend/bff/lib/profile.mjs）
  version     integer not null default 1,
  updated_at  timestamptz not null default now()
);

-- ───────── RLS ─────────
alter table public.companion_sessions enable row level security;
alter table public.companion_messages enable row level security;
alter table public.companion_profiles enable row level security;

-- 正式账号：仅本人可读写自己的簿；device_id 行不暴露给 anon/authenticated（只有 service_role 写）
drop policy if exists companion_sessions_own on public.companion_sessions;
create policy companion_sessions_own on public.companion_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists companion_messages_own on public.companion_messages;
create policy companion_messages_own on public.companion_messages
  for all using (exists (select 1 from public.companion_sessions s where s.id = session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.companion_sessions s where s.id = session_id and s.user_id = auth.uid()));

drop policy if exists companion_profiles_own on public.companion_profiles;
create policy companion_profiles_own on public.companion_profiles
  for all using (exists (select 1 from public.companion_sessions s where s.id = session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.companion_sessions s where s.id = session_id and s.user_id = auth.uid()));

-- updated_at 触发器（复用 0001 的 touch_updated_at）
drop trigger if exists trg_companion_sessions_touch on public.companion_sessions;
create trigger trg_companion_sessions_touch before update on public.companion_sessions
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_companion_profiles_touch on public.companion_profiles;
create trigger trg_companion_profiles_touch before update on public.companion_profiles
  for each row execute function public.touch_updated_at();

-- 建完记得：NOTIFY pgrst, 'reload schema';
