-- Ejecutar después de desplegar send-notifications y configurar sus secretos.
-- Sustituir los dos valores antes de ejecutar. No guardar secretos reales en Git.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

select vault.create_secret('https://PROJECT_REF.supabase.co/functions/v1/send-notifications', 'resol_vamos_function_url');
select vault.create_secret('REPLACE_WITH_JOB_SECRET', 'resol_vamos_job_secret');

select cron.schedule(
  'resol-vamos-send-notifications',
  '* * * * *',
  $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'resol_vamos_function_url' limit 1),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-job-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'resol_vamos_job_secret' limit 1)),
      body := '{}'::jsonb
    );
  $$
);
