create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

create type public.app_role as enum ('requester', 'leader', 'admin');
create type public.case_status as enum ('open', 'in_progress', 'resolved', 'closed');
create type public.notification_status as enum ('pending', 'sending', 'sent', 'failed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role public.app_role not null default 'requester',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 2 and 80),
  leader_id uuid references public.profiles(id),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity unique,
  requester_id uuid not null references public.profiles(id),
  requester_email text not null,
  area_id uuid not null references public.areas(id),
  leader_id uuid not null references public.profiles(id),
  subject text not null check (length(trim(subject)) between 5 and 120),
  description text not null check (length(trim(description)) between 15 and 5000),
  status public.case_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.case_events (
  id bigint generated always as identity primary key,
  case_id uuid not null references public.cases(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  action text not null,
  from_status public.case_status,
  to_status public.case_status,
  created_at timestamptz not null default now()
);

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  recipient_email text not null,
  status public.notification_status not null default 'pending',
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  gmail_message_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (case_id)
);

create index cases_requester_created_idx on public.cases(requester_id, created_at desc);
create index cases_leader_created_idx on public.cases(leader_id, created_at desc);
create index case_events_case_created_idx on public.case_events(case_id, created_at);
create index outbox_due_idx on public.notification_outbox(next_attempt_at) where status in ('pending', 'sending');

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin' and p.active
  );
$$;

create or replace function private.is_active()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active);
$$;

create or replace function private.is_leader()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active and p.role in ('leader', 'admin'));
$$;

create or replace function public.create_profile_for_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users for each row execute function public.create_profile_for_user();

insert into public.profiles (id, email, full_name)
select id, coalesce(email, ''), coalesce(raw_user_meta_data ->> 'full_name', '') from auth.users
on conflict (id) do nothing;

create or replace function private.validate_area_leader()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.leader_id is not null and not exists (
    select 1 from public.profiles p
    where p.id = new.leader_id and p.role in ('leader', 'admin') and p.active
  ) then
    raise exception 'El responsable debe ser un líder activo.';
  end if;
  return new;
end;
$$;

create trigger validate_area_leader
before insert or update of leader_id on public.areas
for each row execute function private.validate_area_leader();

create or replace function public.create_case(p_area_id uuid, p_subject text, p_description text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_leader uuid;
  v_email text;
  v_requester_email text;
  v_case uuid;
begin
  if v_user is null or not private.is_active() then
    raise exception 'No tienes acceso para crear solicitudes.';
  end if;
  select email into v_requester_email from public.profiles where id = v_user;
  p_subject := trim(p_subject);
  p_description := trim(p_description);
  if length(p_subject) not between 5 and 120 or length(p_description) not between 15 and 5000 then
    raise exception 'Revisa el asunto y la descripción.';
  end if;
  select a.leader_id, p.email into v_leader, v_email
  from public.areas a
  join public.profiles p on p.id = a.leader_id and p.active and p.role in ('leader', 'admin')
  where a.id = p_area_id and a.active;
  if v_leader is null or nullif(trim(v_email), '') is null then
    raise exception 'Esta área aún no tiene un líder disponible.';
  end if;
  insert into public.cases (requester_id, requester_email, area_id, leader_id, subject, description)
  values (v_user, v_requester_email, p_area_id, v_leader, p_subject, p_description)
  returning id into v_case;
  insert into public.case_events (case_id, actor_id, action, to_status)
  values (v_case, v_user, 'created', 'open');
  insert into public.notification_outbox (case_id, recipient_email)
  values (v_case, v_email);
  return v_case;
end;
$$;

create or replace function public.change_case_status(p_case_id uuid, p_status public.case_status)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_case public.cases%rowtype;
  v_user uuid := auth.uid();
begin
  if v_user is null or not private.is_active() then raise exception 'No autorizado.'; end if;
  select * into v_case from public.cases where id = p_case_id for update;
  if not found then raise exception 'Solicitud no encontrada.'; end if;
  if (v_case.leader_id <> v_user or not private.is_leader()) and not private.is_admin() then raise exception 'No autorizado.'; end if;
  if not (
    (v_case.status = 'open' and p_status = 'in_progress') or
    (v_case.status = 'in_progress' and p_status = 'resolved') or
    (v_case.status = 'resolved' and p_status in ('closed', 'in_progress'))
  ) then raise exception 'Cambio de estado no permitido.'; end if;
  update public.cases
  set status = p_status, updated_at = now(), resolved_at = case when p_status = 'resolved' then now() when p_status = 'in_progress' then null else resolved_at end
  where id = p_case_id;
  insert into public.case_events (case_id, actor_id, action, from_status, to_status)
  values (p_case_id, v_user, 'status_changed', v_case.status, p_status);
end;
$$;

create or replace function public.claim_notification()
returns table (notification_id uuid, case_id uuid, case_number bigint, case_subject text, area_name text, recipient_email text)
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  update public.notification_outbox n
  set status = 'failed', locked_at = null, last_error = 'Tiempo de espera agotado durante el envío.'
  where n.status = 'sending' and n.attempts >= 5 and n.locked_at < now() - interval '5 minutes';
  select n.id into v_id from public.notification_outbox n
  where n.attempts < 5 and (
    (n.status = 'pending' and n.next_attempt_at <= now())
    or (n.status = 'sending' and n.locked_at < now() - interval '5 minutes')
  )
  order by n.created_at for update skip locked limit 1;
  if v_id is null then return; end if;
  update public.notification_outbox n
  set status = 'sending', attempts = attempts + 1, locked_at = now()
  where n.id = v_id;
  return query
    select n.id, c.id, c.number, c.subject, a.name, n.recipient_email
    from public.notification_outbox n
    join public.cases c on c.id = n.case_id
    join public.areas a on a.id = c.area_id
    where n.id = v_id;
end;
$$;

create or replace function public.finish_notification(p_id uuid, p_success boolean, p_gmail_id text default null, p_error text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.notification_outbox n
  set status = case when p_success then 'sent'::public.notification_status
                    when n.attempts >= 5 then 'failed'::public.notification_status
                    else 'pending'::public.notification_status end,
      sent_at = case when p_success then now() else null end,
      gmail_message_id = case when p_success then p_gmail_id else null end,
      last_error = case when p_success then null else left(coalesce(p_error, 'Error desconocido'), 500) end,
      next_attempt_at = case when p_success then n.next_attempt_at else now() + make_interval(mins => power(2, least(n.attempts, 5))::integer) end,
      locked_at = null
  where n.id = p_id and n.status = 'sending';
  if not found then raise exception 'Aviso no disponible para finalizar.'; end if;
end;
$$;

create or replace function public.set_user_role(p_user_id uuid, p_role public.app_role, p_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'No autorizado.'; end if;
  if p_user_id = auth.uid() and (p_role <> 'admin' or not p_active) then
    raise exception 'No puedes quitar tu propio acceso de administrador.';
  end if;
  if (p_role not in ('leader', 'admin') or not p_active) and exists (
    select 1 from public.areas where leader_id = p_user_id and active
  ) then
    raise exception 'Reasigna sus áreas activas antes de quitar el rol de líder.';
  end if;
  update public.profiles set role = p_role, active = p_active where id = p_user_id;
  if not found then raise exception 'Usuario no encontrado.'; end if;
end;
$$;

alter table public.profiles enable row level security;
alter table public.areas enable row level security;
alter table public.cases enable row level security;
alter table public.case_events enable row level security;
alter table public.notification_outbox enable row level security;

grant usage on schema private to authenticated;

revoke all on public.profiles, public.areas, public.cases, public.case_events, public.notification_outbox from anon, authenticated;
grant select on public.profiles, public.areas, public.cases, public.case_events to authenticated;
grant insert, update on public.areas to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant select on public.notification_outbox to authenticated;

create policy profiles_read on public.profiles for select to authenticated
using (id = (select auth.uid()) or private.is_admin());
create policy profiles_update_self on public.profiles for update to authenticated
using (id = (select auth.uid()) and private.is_active())
with check (id = (select auth.uid()) and private.is_active());
create policy areas_read on public.areas for select to authenticated
using (private.is_active() and (active or private.is_admin()));
create policy areas_insert_admin on public.areas for insert to authenticated
with check (private.is_admin());
create policy areas_update_admin on public.areas for update to authenticated
using (private.is_admin()) with check (private.is_admin());
create policy cases_read on public.cases for select to authenticated
using (private.is_active() and (requester_id = (select auth.uid()) or (leader_id = (select auth.uid()) and private.is_leader()) or private.is_admin()));
create policy events_read on public.case_events for select to authenticated
using (exists (select 1 from public.cases c where c.id = case_id));
create policy outbox_read_admin on public.notification_outbox for select to authenticated
using (private.is_admin());

revoke all on function public.create_profile_for_user(), private.validate_area_leader(), private.is_admin(), private.is_active(), private.is_leader() from public;
revoke all on function public.create_case(uuid, text, text), public.change_case_status(uuid, public.case_status), public.set_user_role(uuid, public.app_role, boolean), public.claim_notification(), public.finish_notification(uuid, boolean, text, text) from public;
grant execute on function private.is_admin(), private.is_active(), private.is_leader() to authenticated;
grant execute on function public.create_case(uuid, text, text), public.change_case_status(uuid, public.case_status) to authenticated;
grant execute on function public.set_user_role(uuid, public.app_role, boolean) to authenticated;
grant execute on function public.claim_notification(), public.finish_notification(uuid, boolean, text, text) to service_role;
