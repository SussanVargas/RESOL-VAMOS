# ResolVamos

Mesa de ayuda interna para incidentes del ERP de Cimbrados. Los usuarios crean solicitudes, el sistema las asigna al líder de su área y envía un aviso por Gmail. El estado y el historial permanecen visibles según el rol.

## Estado de la primera entrega

- Migración inicial aplicada al proyecto Supabase `mpmywnfjctvkvvljntev`; cinco tablas con RLS y funciones de negocio verificadas.
- Edge Function `send-notifications` desplegada y activa. Todavía no enviará correos hasta configurar Gmail OAuth, el secreto del trabajo y la tarea programada.
- Interfaz desplegada en producción en `https://resol-vamos-orcin.vercel.app`. El despliegue está listo, pero Vercel Authentication protege el sitio por ahora.
- El proyecto Vercel aún no está conectado al repositorio GitHub. Los despliegues siguientes se hacen desde la CLI hasta que el propietario del repositorio habilite la integración de Vercel.
- No se han creado usuarios ni áreas definitivas porque faltan los datos del brief.

## Tecnología

Next.js 16, React 19, TypeScript, Supabase Auth/Postgres/Edge Functions y Gmail API. Vercel aloja la interfaz. La guía de alcance y decisiones está en [PLAN.md](PLAN.md).

## Desarrollo local

1. Instala Node.js 20 o superior y ejecuta `npm install`.
2. Crea `.env` a partir de `.env.example` y completa `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SECRET_KEY`. El archivo `.env` está excluido de Git. `APP_URL` es necesario para el enlace de los avisos.
3. Aplica la migración `supabase/migrations/202611250001_initial.sql` al proyecto correcto. Con la CLI autenticada: `npx supabase link --project-ref <ref>` y después `npx supabase db push --remote --yes`. La CLI puede solicitar la contraseña de Postgres; no es la clave `SUPABASE_SECRET_KEY`.
4. Ejecuta `npm run dev` y abre `http://localhost:3000`.

## Primera configuración

1. Crea cuentas de prueba en Supabase Dashboard → Authentication → Users. Cada cuenta genera automáticamente su perfil.
2. Asigna el primer administrador desde el SQL Editor (sustituye el correo):

   ```sql
   update public.profiles set role = 'admin' where email = 'admin@empresa.com';
   ```

3. Entra con ese usuario. En **Configuración**, marca a los responsables como líderes y crea las áreas con su líder. El formulario no permite enviar casos a áreas sin responsable.
4. Desactiva el registro público en Supabase Auth para que las cuentas las cree un administrador del proyecto. Configura un SMTP propio si usarás invitaciones o recuperación de contraseña por correo.

## Avisos por Gmail

La función `supabase/functions/send-notifications` procesa hasta 10 avisos por ejecución. Necesita los secretos `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_SENDER`, `APP_URL` y `NOTIFICATION_JOB_SECRET`. Usa una cuenta remitente institucional autorizada con el permiso OAuth `gmail.send`. La clave de servicio de Supabase llega a la función como `SUPABASE_SERVICE_ROLE_KEY` en el entorno alojado.

Despliega con `npx supabase functions deploy send-notifications --no-verify-jwt`. Después configura una tarea cada minuto con la plantilla `supabase/ops/schedule-notifications.sql`, sustituyendo los marcadores por la URL real de la función y un secreto fuerte que coincida con `NOTIFICATION_JOB_SECRET`. Guarda el secreto real solo en Supabase Vault y en los secretos de la Edge Function; nunca en Git.

La creación del caso y del aviso pendiente ocurre en una sola transacción. Si Gmail falla, el aviso se reintenta hasta cinco veces. El administrador puede ver los avisos fallidos en la pantalla de configuración. Un fallo de registro después de que Gmail haya aceptado el mensaje podría ocasionar un correo duplicado; el número de caso permite reconocerlo.

## Vercel

Conecta este repositorio a un proyecto Vercel con framework Next.js. Configura `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` para Preview y Production. Las acciones de usuario emplean la sesión Supabase y RLS; `SUPABASE_SECRET_KEY` **no se necesita en Vercel**. Mantén `APP_URL` en los secretos de la función con la URL pública final. Después de cada despliegue, comprueba el inicio de sesión, el enrutamiento por área, el cambio de estado y la entrega de un correo real.

## Comprobaciones

`npm run typecheck`, `npm run lint` y `npm run build` verifican la aplicación. Las políticas de RLS y la entrega de Gmail requieren pruebas contra un proyecto Supabase con cuentas de cada rol y una cuenta Gmail autorizada.
