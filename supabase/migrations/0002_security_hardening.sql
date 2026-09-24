-- NEXA security/performance hardening
create schema if not exists private;

do $$ begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles(id,display_name)
  values(new.id,coalesce(new.raw_user_meta_data->>'display_name',''))
  on conflict (id) do nothing;
  insert into public.preferences(user_id)
  values(new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure private.handle_new_user();

drop policy if exists "profiles own rows" on public.profiles;
drop policy if exists "preferences own rows" on public.preferences;
drop policy if exists "tasks own rows" on public.tasks;
drop policy if exists "events own rows" on public.calendar_events;
drop policy if exists "reminders own rows" on public.reminders;
drop policy if exists "notes own rows" on public.notes;
drop policy if exists "goals own rows" on public.goals;
drop policy if exists "conversations own rows" on public.conversations;
drop policy if exists "messages own rows" on public.messages;
drop policy if exists "subscriptions own rows" on public.subscriptions;

create policy "profiles select own" on public.profiles for select to authenticated using ((select auth.uid())=id);
create policy "profiles update own" on public.profiles for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);
create policy "preferences select own" on public.preferences for select to authenticated using ((select auth.uid())=user_id);
create policy "preferences update own" on public.preferences for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

create policy "tasks select own" on public.tasks for select to authenticated using ((select auth.uid())=user_id);
create policy "tasks insert own" on public.tasks for insert to authenticated with check ((select auth.uid())=user_id);
create policy "tasks update own" on public.tasks for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "tasks delete own" on public.tasks for delete to authenticated using ((select auth.uid())=user_id);

create policy "events select own" on public.calendar_events for select to authenticated using ((select auth.uid())=user_id);
create policy "events insert own" on public.calendar_events for insert to authenticated with check ((select auth.uid())=user_id);
create policy "events update own" on public.calendar_events for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "events delete own" on public.calendar_events for delete to authenticated using ((select auth.uid())=user_id);

create policy "reminders select own" on public.reminders for select to authenticated using ((select auth.uid())=user_id);
create policy "reminders insert own" on public.reminders for insert to authenticated with check ((select auth.uid())=user_id);
create policy "reminders update own" on public.reminders for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "reminders delete own" on public.reminders for delete to authenticated using ((select auth.uid())=user_id);

create policy "notes select own" on public.notes for select to authenticated using ((select auth.uid())=user_id);
create policy "notes insert own" on public.notes for insert to authenticated with check ((select auth.uid())=user_id);
create policy "notes update own" on public.notes for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "notes delete own" on public.notes for delete to authenticated using ((select auth.uid())=user_id);

create policy "goals select own" on public.goals for select to authenticated using ((select auth.uid())=user_id);
create policy "goals insert own" on public.goals for insert to authenticated with check ((select auth.uid())=user_id);
create policy "goals update own" on public.goals for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "goals delete own" on public.goals for delete to authenticated using ((select auth.uid())=user_id);

create policy "conversations select own" on public.conversations for select to authenticated using ((select auth.uid())=user_id);
create policy "conversations insert own" on public.conversations for insert to authenticated with check ((select auth.uid())=user_id);
create policy "conversations update own" on public.conversations for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "conversations delete own" on public.conversations for delete to authenticated using ((select auth.uid())=user_id);

create policy "messages select own" on public.messages for select to authenticated using ((select auth.uid())=user_id);
create policy "messages insert user own" on public.messages for insert to authenticated with check ((select auth.uid())=user_id and role='user');

create policy "subscriptions select own" on public.subscriptions for select to authenticated using ((select auth.uid())=user_id);

create index if not exists conversations_user_id_idx on public.conversations(user_id);
create index if not exists goals_user_id_idx on public.goals(user_id);
create index if not exists notes_user_id_idx on public.notes(user_id);
create index if not exists messages_user_id_idx on public.messages(user_id);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id,created_at);

revoke all on table public.profiles,public.preferences,public.tasks,public.calendar_events,public.reminders,public.notes,public.goals,public.conversations,public.messages,public.subscriptions from anon;
revoke all on table public.profiles,public.preferences,public.tasks,public.calendar_events,public.reminders,public.notes,public.goals,public.conversations,public.messages,public.subscriptions from authenticated;

grant select,update on public.profiles to authenticated;
grant select,update on public.preferences to authenticated;
grant select,insert,update,delete on public.tasks to authenticated;
grant select,insert,update,delete on public.calendar_events to authenticated;
grant select,insert,update,delete on public.reminders to authenticated;
grant select,insert,update,delete on public.notes to authenticated;
grant select,insert,update,delete on public.goals to authenticated;
grant select,insert,update,delete on public.conversations to authenticated;
grant select,insert on public.messages to authenticated;
grant select on public.subscriptions to authenticated;
