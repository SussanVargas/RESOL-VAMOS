# ResolVamos

Mesa de ayuda interna para incidentes del ERP de Cimbrados. Los empleados crean casos, un líder por área los atiende y recibe un aviso por correo Microsoft 365.

## Estado

- Interfaz Next.js 16/React 19 en `https://resolvamos.vercel.app`, proyecto Vercel `sussan/resol.vamos`.
- Base de datos Supabase `mpmywnfjctvkvvljntev`, con RLS, casos, áreas, eventos y cola de avisos. Las migraciones `202611250001` y `202611250002` están aplicadas.
- Acceso con Microsoft preparado en la aplicación. Falta registrar la app en Microsoft Entra y habilitar Azure en Supabase.
- Función de correo adaptada a Microsoft Graph. Falta desplegar la nueva versión, configurar credenciales de Microsoft 365 y activar la tarea programada.
- Todavía no hay usuarios, áreas ni destinatarios definitivos.

La guía de configuración y las rutas exactas están en [docs/MICROSOFT_SETUP.md](docs/MICROSOFT_SETUP.md). El alcance inicial está en [PLAN.md](PLAN.md).

## Desarrollo

1. `npm install`
2. Copia `.env.example` a `.env`. Completa `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`. `SUPABASE_SECRET_KEY` se usa solo para tareas administrativas locales; nunca se sube a Git ni se configura en Vercel.
3. `npm run dev` y abre `http://localhost:3000`.
4. Para aplicar futuras migraciones: `npx supabase link --project-ref mpmywnfjctvkvvljntev` y `npx supabase db push --remote --yes`.

## Puesta en marcha

Configura primero el acceso Microsoft y activa al primer administrador según la guía. Luego activa a los empleados, marca a los responsables como líderes y crea las áreas en **Configuración**. Una área sin líder activo no admite casos.

La creación del caso y del aviso pendiente ocurre en una sola transacción. La Edge Function `send-notifications` envía por Microsoft Graph y reintenta fallos hasta cinco veces. La plantilla de cron está en `supabase/ops/schedule-notifications.sql`; no la ejecutes hasta que los secretos Microsoft 365 estén listos.

## Verificación

`npm run typecheck`, `npm run lint` y `npm run build` verifican el código. La prueba completa requiere una cuenta Microsoft del tenant, un buzón remitente autorizado y un líder real por área. Un HTTP 202 de Microsoft Graph indica aceptación de la solicitud, no confirmación de entrega final.
