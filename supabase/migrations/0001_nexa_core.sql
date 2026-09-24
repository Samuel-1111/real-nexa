create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text, avatar_url text, timezone text default 'Africa/Lagos',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'nexa-dark', language text not null default 'en',
  notifications_enabled boolean not null default true, updated_at timestamptz not null default now()
);
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, description text, due_at timestamptz, completed_at timestamptz,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, description text, starts_at timestamptz not null, ends_at timestamptz not null, location text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, remind_at timestamptz not null, completed_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled note', content text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, description text, target_date date, completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, role text not null check (role in ('user','assistant','system','tool')),
  content text not null, created_at timestamptz not null default now()
);
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'remita', provider_customer_id text, provider_subscription_id text,
  status text not null default 'inactive', current_period_end timestamptz, updated_at timestamptz not null default now()
);

create index if not exists tasks_user_due_idx on public.tasks(user_id,due_at);
create index if not exists events_user_start_idx on public.calendar_events(user_id,starts_at);
create index if not exists reminders_user_time_idx on public.reminders(user_id,remind_at);
create index if not exists messages_conversation_idx on public.messages(conversation_id,created_at);

alter table public.profiles enable row level security;
alter table public.preferences enable row level security;
alter table public.tasks enable row level security;
alter table public.calendar_events enable row level security;
alter table public.reminders enable row level security;
alter table public.notes enable row level security;
alter table public.goals enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.subscriptions enable row level security;

create policy "profiles own rows" on public.profiles for all using (auth.uid()=id) with check (auth.uid()=id);
create policy "preferences own rows" on public.preferences for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "tasks own rows" on public.tasks for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "events own rows" on public.calendar_events for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "reminders own rows" on public.reminders for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "notes own rows" on public.notes for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "goals own rows" on public.goals for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "conversations own rows" on public.conversations for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "messages own rows" on public.messages for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "subscriptions own rows" on public.subscriptions for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'display_name',''));
  insert into public.preferences(user_id) values(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();
