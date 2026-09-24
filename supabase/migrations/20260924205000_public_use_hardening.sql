-- NEXA public-use hardening
-- AI usage protection and stricter message ownership.

create schema if not exists private;

create table if not exists private.ai_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  request_count integer not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  total_tokens bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date),
  constraint ai_usage_daily_request_count_check check (request_count >= 0),
  constraint ai_usage_daily_token_counts_check check (input_tokens >= 0 and output_tokens >= 0 and total_tokens >= 0)
);



create or replace function public.consume_nexa_ai_request(p_user_id uuid)
returns table(allowed boolean, request_count integer, daily_limit integer, plan text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan text := 'free';
  v_limit integer := 30;
  v_count integer;
begin
  if p_user_id is null then
    return query select false, 0, v_limit, v_plan;
    return;
  end if;

  select case
           when s.status in ('active','trialing') and s.plan in ('premium','gold','elite') then s.plan
           else 'free'
         end
    into v_plan
  from public.subscriptions s
  where s.user_id = p_user_id
  limit 1;

  v_limit := case v_plan
    when 'premium' then 100
    when 'gold' then 300
    when 'elite' then 600
    else 30
  end;

  insert into private.ai_usage_daily(user_id, usage_date, request_count, updated_at)
  values (p_user_id, current_date, 1, now())
  on conflict (user_id, usage_date)
  do update set
    request_count = private.ai_usage_daily.request_count + 1,
    updated_at = now()
  where private.ai_usage_daily.request_count < v_limit
  returning private.ai_usage_daily.request_count into v_count;

  return query select
    (v_count is not null),
    coalesce(v_count, (
      select request_count from private.ai_usage_daily
      where user_id = p_user_id and usage_date = current_date
    )),
    v_limit,
    v_plan;
end;
$$;

create or replace function public.record_nexa_ai_tokens(
  p_user_id uuid,
  p_input_tokens bigint default 0,
  p_output_tokens bigint default 0
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into private.ai_usage_daily(user_id, usage_date, input_tokens, output_tokens, total_tokens, updated_at)
  values (
    p_user_id,
    current_date,
    greatest(coalesce(p_input_tokens,0),0),
    greatest(coalesce(p_output_tokens,0),0),
    greatest(coalesce(p_input_tokens,0),0) + greatest(coalesce(p_output_tokens,0),0),
    now()
  )
  on conflict (user_id, usage_date)
  do update set
    input_tokens = private.ai_usage_daily.input_tokens + greatest(coalesce(p_input_tokens,0),0),
    output_tokens = private.ai_usage_daily.output_tokens + greatest(coalesce(p_output_tokens,0),0),
    total_tokens = private.ai_usage_daily.total_tokens + greatest(coalesce(p_input_tokens,0),0) + greatest(coalesce(p_output_tokens,0),0),
    updated_at = now();
end;
$$;

revoke all on function public.consume_nexa_ai_request(uuid) from public, anon, authenticated;
revoke all on function public.record_nexa_ai_tokens(uuid, bigint, bigint) from public, anon, authenticated;
grant execute on function public.consume_nexa_ai_request(uuid) to service_role;
grant execute on function public.record_nexa_ai_tokens(uuid, bigint, bigint) to service_role;

create policy "backend only ai usage" on private.ai_usage_daily
  for all to service_role
  using (true)
  with check (true);

drop policy if exists "messages insert user own" on public.messages;
create policy "messages insert user own" on public.messages
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and role = 'user'
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and c.user_id = (select auth.uid())
    )
  );