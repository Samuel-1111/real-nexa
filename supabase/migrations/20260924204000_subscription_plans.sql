-- NEXA subscription tiers
-- Pricing is controlled by the app catalog and payment provider configuration.
alter table public.subscriptions
  add column if not exists plan text not null default 'free';

update public.subscriptions
set plan = 'free'
where plan is null;

do $$ begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subscriptions_plan_check'
      and conrelid = 'public.subscriptions'::regclass
  ) then
    alter table public.subscriptions
      add constraint subscriptions_plan_check
      check (plan in ('free','premium','gold','elite'));
  end if;
end $$;