# ResolVamos

Mesa de ayuda ERP de Cimbrados. La portada pública permite enviar solicitudes sin cuenta: nombre, área y descripción. Contabilidad, Financiera y Costos tienen un responsable que ve sus casos al entrar con correo y contraseña. Incluye preguntas frecuentes y seguimiento de estado para líderes.

## Rutas

- `/`: formulario público.
- `/preguntas-frecuentes`: ayuda sencilla para usuarios.
- `/recibido`: confirmación con número de caso.
- `/login`: acceso privado de responsables.
- `/lider`, `/casos`, `/casos/[id]`: bandeja y detalle privados.
- `/admin`: configuración de áreas y usuarios para administración.

## Infraestructura

- Vercel: `https://resolvamos.vercel.app`, proyecto `sussan/resol.vamos`.
- Supabase: proyecto `mpmywnfjctvkvvljntev`, migraciones en `supabase/migrations`.
- Los tres usuarios y sus áreas se cargaron el 25 de noviembre de 2026. La cuenta de Costos tiene rol administrador para gestionar accesos.
- El formulario público usa una acción de servidor y una clave privada de Supabase almacenada solo en Vercel. Hay un límite de cinco envíos por conexión y hora, además de un campo trampa contra bots. La base de datos asigna cada caso al líder activo y crea un aviso pendiente.
- **Avisos por email pendientes:** la bandeja privada ya recibe los casos. Para enviar además un correo automático se necesita un buzón remitente y permisos de Microsoft Graph u otro proveedor. La función de correo existente todavía no está configurada para enviar ni tiene cron activo. Consulta [docs/MICROSOFT_SETUP.md](docs/MICROSOFT_SETUP.md) si más adelante se habilita Microsoft 365.

## Desarrollo

1. `npm install`.
2. Copia `.env.example` a `.env` y configura `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SECRET_KEY`. La clave privada se usa **solo en el servidor** y no se sube a Git.
3. `npm run dev` y abre `http://localhost:3000`.
4. Las migraciones se aplican con `npx supabase db push --remote --yes` tras enlazar el proyecto correcto.

## Verificación

`npm run typecheck`, `npm run lint`, `npm run build` y `npx supabase db lint --remote`. La prueba de enrutamiento creó un caso temporal para Contabilidad, verificó el destinatario y comprobó que Financiera no podía leerlo; el caso se eliminó al terminar.
