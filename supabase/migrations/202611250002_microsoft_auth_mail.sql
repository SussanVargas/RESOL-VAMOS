-- Los usuarios nuevos de Microsoft se revisan antes de acceder a los casos.
alter table public.profiles alter column active set default false;

create or replace function public.create_profile_for_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, active)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', ''), false);
  return new;
end;
$$;

-- Microsoft Graph devuelve un identificador de solicitud HTTP, no un ID del mensaje.
alter table public.notification_outbox rename column gmail_message_id to provider_request_id;

drop function public.finish_notification(uuid, boolean, text, text);

create function public.finish_notification(p_id uuid, p_success boolean, p_provider_request_id text default null, p_error text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.notification_outbox n
  set status = case when p_success then 'sent'::public.notification_status
                    when n.attempts >= 5 then 'failed'::public.notification_status
                    else 'pending'::public.notification_status end,
      sent_at = case when p_success then now() else null end,
      provider_request_id = case when p_success then p_provider_request_id else null end,
      last_error = case when p_success then null else left(coalesce(p_error, 'Error desconocido'), 500) end,
      next_attempt_at = case when p_success then n.next_attempt_at else now() + make_interval(mins => power(2, least(n.attempts, 5))::integer) end,
      locked_at = null
  where n.id = p_id and n.status = 'sending';
  if not found then raise exception 'Aviso no disponible para finalizar.'; end if;
end;
$$;

revoke all on function public.finish_notification(uuid, boolean, text, text) from public;
grant execute on function public.finish_notification(uuid, boolean, text, text) to service_role;
