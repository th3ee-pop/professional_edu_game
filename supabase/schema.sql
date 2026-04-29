create extension if not exists pgcrypto;

create table if not exists public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  class_code text not null unique,
  title text not null default '人工智能与大数据技术在职业教育中的应用',
  status text not null default 'active' check (status in ('active', 'closed')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz
);

create table if not exists public.student_sessions (
  id uuid primary key default gen_random_uuid(),
  class_session_id uuid not null references public.class_sessions(id) on delete cascade,
  class_code text not null,
  device_type text not null default 'unknown',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  manufacturing_done boolean not null default false,
  nursing_done boolean not null default false
);

create table if not exists public.game_attempts (
  id uuid primary key default gen_random_uuid(),
  class_session_id uuid not null references public.class_sessions(id) on delete cascade,
  student_session_id uuid not null references public.student_sessions(id) on delete cascade,
  game_id text not null check (game_id in ('manufacturing', 'nursing')),
  score integer not null check (score >= 0 and score <= 100),
  result_label text not null,
  started_at timestamptz,
  completed_at timestamptz not null default now(),
  answers jsonb not null default '{}'::jsonb,
  unique (student_session_id, game_id)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  class_session_id uuid not null references public.class_sessions(id) on delete cascade,
  student_session_id uuid not null references public.student_sessions(id) on delete cascade,
  game_id text check (game_id in ('entry', 'teacher', 'manufacturing', 'nursing')),
  event_type text not null,
  target_id text,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.analysis_snapshots (
  id uuid primary key default gen_random_uuid(),
  class_session_id uuid not null references public.class_sessions(id) on delete cascade,
  summary jsonb not null,
  generated_at timestamptz not null default now()
);

create index if not exists student_sessions_class_session_id_idx
  on public.student_sessions (class_session_id);

create index if not exists student_sessions_class_code_idx
  on public.student_sessions (class_code);

create index if not exists game_attempts_class_session_id_game_id_idx
  on public.game_attempts (class_session_id, game_id);

create index if not exists game_attempts_student_session_id_idx
  on public.game_attempts (student_session_id);

create index if not exists events_class_session_id_created_at_idx
  on public.events (class_session_id, created_at);

create index if not exists events_student_session_id_idx
  on public.events (student_session_id);

create index if not exists events_game_id_event_type_idx
  on public.events (game_id, event_type);

create index if not exists events_payload_gin_idx
  on public.events using gin (payload);

create index if not exists analysis_snapshots_class_session_id_generated_at_idx
  on public.analysis_snapshots (class_session_id, generated_at desc);

alter table public.class_sessions enable row level security;
alter table public.student_sessions enable row level security;
alter table public.game_attempts enable row level security;
alter table public.events enable row level security;
alter table public.analysis_snapshots enable row level security;

-- The app's Next.js route handlers write through PostgreSQL Session Pooling.
-- Direct browser table access is intentionally not granted in v1.
drop policy if exists "deny anon class sessions" on public.class_sessions;
create policy "deny anon class sessions"
on public.class_sessions for all
to anon
using (false)
with check (false);

drop policy if exists "deny anon student sessions" on public.student_sessions;
create policy "deny anon student sessions"
on public.student_sessions for all
to anon
using (false)
with check (false);

drop policy if exists "deny anon game attempts" on public.game_attempts;
create policy "deny anon game attempts"
on public.game_attempts for all
to anon
using (false)
with check (false);

drop policy if exists "deny anon events" on public.events;
create policy "deny anon events"
on public.events for all
to anon
using (false)
with check (false);

drop policy if exists "deny anon analysis snapshots" on public.analysis_snapshots;
create policy "deny anon analysis snapshots"
on public.analysis_snapshots for all
to anon
using (false)
with check (false);

insert into public.class_sessions (class_code, title, status)
values ('AI2026', '人工智能与大数据技术在职业教育中的应用', 'active')
on conflict (class_code) do nothing;
