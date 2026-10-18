-- RecycleQuest: run this once in Supabase > SQL Editor.

create table if not exists public.docs (
  collection text        not null,
  id         text        not null,
  data       jsonb       not null default '{}'::jsonb,
  owner      uuid        not null default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);
create index if not exists docs_collection_idx on public.docs (collection);

alter table public.docs enable row level security;
alter table public.docs replica identity full;

-- Who may READ: everyone signed in, except private per-user data (accounts, saves).
drop policy if exists docs_read on public.docs;
create policy docs_read on public.docs for select to authenticated
using ( case when collection like 'data/users/%' then owner = auth.uid() else true end );

-- Who may WRITE: only your own rows, and only in the places the app uses.
-- Leaderboard / team-member rows must have an id that starts with your user id.
drop policy if exists docs_insert on public.docs;
create policy docs_insert on public.docs for insert to authenticated
with check (
  owner = auth.uid() and (
    collection = 'data/users/' || auth.uid()::text
    or ( ( collection in ('squad','tstats') or collection like 'teams/%/members' )
         and split_part(id, '_', 1) = auth.uid()::text )
    or collection = 'teams'
    or collection like 'teams/%/cheers'
    or collection like 'teams/%/notifs'
  )
);

drop policy if exists docs_update on public.docs;
create policy docs_update on public.docs for update to authenticated
using ( owner = auth.uid() )
with check (
  owner = auth.uid() and (
    collection = 'data/users/' || auth.uid()::text
    or ( ( collection in ('squad','tstats') or collection like 'teams/%/members' )
         and split_part(id, '_', 1) = auth.uid()::text )
    or collection = 'teams'
  )
);

drop policy if exists docs_delete on public.docs;
create policy docs_delete on public.docs for delete to authenticated
using ( owner = auth.uid() );

-- Live updates (the app also polls every 20s, so this is optional but nicer).
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; end $$;
