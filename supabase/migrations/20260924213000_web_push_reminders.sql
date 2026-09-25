-- NEXA background reminder alarms via Web Push + pg_cron

create extension if not exists pg_cron;
create extension if not exists pg_net;

alter table public.reminders
  add column if not exists notified_at timestamptz null;

create index if not exists reminders_due_push_idx
  on public.reminders (remind_at)
  where completed_at is null and notified_at is null;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_success_at timestamptz null
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push subscriptions select own" on public.push_subscriptions;
create policy "push subscriptions select own" on public.push_subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "push subscriptions insert own" on public.push_subscriptions;
create policy "push subscriptions insert own" on public.push_subscriptions
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "push subscriptions update own" on public.push_subscriptions;
create policy "push subscriptions update own" on public.push_subscriptions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "push subscriptions delete own" on public.push_subscriptions;
create policy "push subscriptions delete own" on public.push_subscriptions
  for delete to authenticated using ((select auth.uid()) = user_id);

create schema if not exists private;

create table if not exists private.web_push_config (
  id integer primary key,
  vapid_public_key text not null,
  vapid_private_key text not null,
  cron_secret text not null,
  subject text not null
);

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;
revoke all on private.web_push_config from public, anon, authenticated, service_role;
grant select on private.web_push_config to service_role;

insert into private.web_push_config (id, vapid_public_key, vapid_private_key, cron_secret, subject)
values (
  1,
  'BKuJo8QKGFW_sJhue7Z_elbTZO6_hfKj433TYxKOkUFtVLzennx6rsNyCuQeq_h9EpKnW5vSsDMZ5yYESUS3rAA',
  'PTJamalpNpy2y0jcktHKW1144vbPiq5CnNSAUWdvR2c',
  'oQdnc9ZEOhH1KzRt23naodkJiiUqLeb5nbJZ6lkevmY',
  'https://real-nexa.vercel.app/'
)
on conflict (id) do update set
  vapid_public_key=excluded.vapid_public_key,
  vapid_private_key=excluded.vapid_private_key,
  cron_secret=excluded.cron_secret,
  subject=excluded.subject;

create or replace function public.get_nexa_web_push_config()
returns table (vapid_public_key text, vapid_private_key text, cron_secret text, subject text)
language sql security definer set search_path = private, pg_temp
as $$ select vapid_public_key, vapid_private_key, cron_secret, subject from private.web_push_config where id=1 $$;

revoke all on function public.get_nexa_web_push_config() from public, anon, authenticated;
grant execute on function public.get_nexa_web_push_config() to service_role;

do $$
begin
  if exists (select 1 from cron.job where jobname='nexa-reminder-push') then
    perform cron.unschedule('nexa-reminder-push');
  end if;
exception when undefined_table then null;
end $$;

select cron.schedule(
  'nexa-reminder-push',
  '30 seconds',
  $cron$
    select net.http_post(
      url := 'https://yymlkzarekwlqzvsafgk.supabase.co/functions/v1/process-nexa-reminders',
      headers := jsonb_build_object('Content-Type','application/json','x-nexa-cron-secret',(select cron_secret from private.web_push_config where id=1)),
      body := '{}'::jsonb,
      timeout_milliseconds := 15000
    ) as request_id;
  $cron$
);