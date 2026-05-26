-- Run this in Supabase SQL editor (Dashboard → SQL Editor → New query)

create table if not exists public.user_progress (
  id             uuid        default gen_random_uuid() primary key,
  user_id        uuid        not null references auth.users on delete cascade,
  topic_slug     text        not null,
  completed_steps int        not null default 0,
  total_steps    int         not null,
  completed_at   timestamptz,
  last_visited   timestamptz not null default now(),
  constraint user_progress_user_topic unique (user_id, topic_slug)
);

alter table public.user_progress enable row level security;

-- Users can only read/write their own rows
create policy "own rows only"
  on public.user_progress
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index for fast lookup by user
create index if not exists user_progress_user_id_idx
  on public.user_progress (user_id);
