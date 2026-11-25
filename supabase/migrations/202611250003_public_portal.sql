alter table public.cases alter column requester_id drop not null;
alter table public.cases add column requester_name text not null default 'Usuario';
alter table public.cases add constraint requester_name_length check (length(trim(requester_name)) between 2 and 100);

create table public.public_submission_limits (
  ip_hash text not null,
  hour_bucket timestamptz not null,
  attempts integer not null default 1,
  primary key (ip_hash, hour_bucket)
);
alter table public.public_submission_limits enable row level security;
revoke all on public.public_submission_limits from anon, authenticated;

create or replace function public.create_public_case(p_name text, p_area_id uuid, p_description text, p_ip_hash text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_leader uuid;
  v_email text;
  v_case uuid;
  v_number bigint;
  v_attempts integer;
begin
  p_name := trim(p_name);
  p_description := trim(p_description);
  if length(p_name) not between 2 and 100 or length(p_description) not between 15 and 5000 then
    raise exception 'Completa tu nombre y describe el problema con más detalle.';
  end if;
  if p_ip_hash !~ '^[0-9a-f]{64}$' then raise exception 'Solicitud no válida.'; end if;

  insert into public.public_submission_limits (ip_hash, hour_bucket)
  values (p_ip_hash, date_trunc('hour', now()))
  on conflict (ip_hash, hour_bucket) do update
  set attempts = public.public_submission_limits.attempts + 1
  returning attempts into v_attempts;
  if v_attempts > 5 then raise exception 'Llegaron demasiadas solicitudes. Inténtalo más tarde.'; end if;

  select a.leader_id, p.email into v_leader, v_email
  from public.areas a
  join public.profiles p on p.id = a.leader_id and p.active and p.role in ('leader', 'admin')
  where a.id = p_area_id and a.active;
  if v_leader is null then raise exception 'Esta área aún no tiene un responsable disponible.'; end if;

  insert into public.cases (requester_id, requester_email, requester_name, area_id, leader_id, subject, description)
  values (null, '', p_name, p_area_id, v_leader, left(p_description, 120), p_description)
  returning id, number into v_case, v_number;
  insert into public.case_events (case_id, action, to_status)
  values (v_case, 'created', 'open');
  insert into public.notification_outbox (case_id, recipient_email)
  values (v_case, v_email);
  return v_number;
end;
$$;
revoke all on function public.create_public_case(text, uuid, text, text) from public;
grant execute on function public.create_public_case(text, uuid, text, text) to service_role;

-- Evita que un usuario no autorizado enumere casos públicos por la API.
create or replace function private.can_read_case(p_case_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.cases c
    where c.id = p_case_id and private.is_active()
      and (private.is_admin() or (c.leader_id = (select auth.uid()) and private.is_leader())
        or c.requester_id = (select auth.uid()))
  );
$$;
revoke all on function private.can_read_case(uuid) from public;
grant execute on function private.can_read_case(uuid) to authenticated;
drop policy events_read on public.case_events;
create policy events_read on public.case_events for select to authenticated
using (private.can_read_case(case_id));
