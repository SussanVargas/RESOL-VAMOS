# Configuración de Microsoft 365

La mesa de ayuda usa dos aplicaciones separadas en el mismo tenant de Microsoft Entra: una para iniciar sesión y otra para enviar avisos. Separarlas evita dar permisos de correo a la aplicación de acceso.

## 1. Acceso con Microsoft

1. Abre [Microsoft Entra admin center](https://entra.microsoft.com/) con una cuenta que pueda registrar aplicaciones. Selecciona el tenant de Cimbrados.
2. Ve a **Entra ID → App registrations → New registration**. Nombre sugerido: `ResolVamos - Acceso`. En **Supported account types** elige **Accounts in this organizational directory only (Single tenant)**.
3. En **Redirect URI**, tipo **Web**, escribe exactamente `https://mpmywnfjctvkvvljntev.supabase.co/auth/v1/callback`. Este callback pertenece a Supabase, no a Vercel. Registra la aplicación.
4. Copia **Application (client) ID** y **Directory (tenant) ID** de **Overview**.
5. Ve a **Certificates & secrets → Client secrets → New client secret**. Copia el campo **Value** apenas se muestre; **Secret ID** no sirve como credencial. Anota su fecha de vencimiento para rotarlo antes de que expire.
6. Abre [Supabase, proyecto ResolVamos](https://supabase.com/dashboard/project/mpmywnfjctvkvvljntev/auth/providers) → **Authentication → Sign In / Providers → Azure (Microsoft)**. Activa el proveedor e introduce el client ID y el valor del secret. En **Azure Tenant URL** escribe `https://login.microsoftonline.com/TU_TENANT_ID`. Guarda.
7. En [Supabase → Authentication → URL Configuration](https://supabase.com/dashboard/project/mpmywnfjctvkvvljntev/auth/url-configuration), fija **Site URL** en `https://resolvamos.vercel.app` y añade a **Redirect URLs** `https://resolvamos.vercel.app/auth/callback` y `http://localhost:3000/auth/callback` si usarás desarrollo local. La aplicación solicita el scope `email` y cambia el código OAuth por una sesión en `/auth/callback`.
8. Prueba el botón **Continuar con Microsoft** en `https://resolvamos.vercel.app/login`. La primera entrada crea un perfil **inactivo**. Es normal que esa cuenta llegue a **Sin acceso** hasta que un administrador la active. El primer administrador se habilita desde el SQL Editor, después de su primer acceso:

   ```sql
   update public.profiles
   set role = 'admin', active = true
   where lower(email) = lower('admin@cimbrados.com');
   ```

   Sustituye el correo. Debe afectar una sola fila. Después actualiza la página o vuelve a iniciar sesión. En **Configuración** podrás activar usuarios y asignarles el rol de líder o administrador. **No desactives las nuevas inscripciones de Supabase Auth mientras los empleados deban entrar por OAuth por primera vez**; la aprobación se controla con `profiles.active` y RLS.

Si una cuenta ya existía con contraseña, comprueba que Supabase asocie la nueva identidad Microsoft al mismo usuario antes de retirar el acceso alternativo. No elimines la cuenta antigua sin revisar sus casos y su rol.

## 2. Cuenta remitente y permisos de Microsoft Graph

1. Prepara un buzón de Exchange Online que pueda enviar mensajes, por ejemplo `mesaayuda@cimbrados.com`. Debe existir en el mismo tenant. Confirma con TI si será buzón de usuario o compartido.
2. En [Microsoft Entra admin center](https://entra.microsoft.com/) → **Entra ID → App registrations → New registration**, crea `ResolVamos - Correo`. Usa **Single tenant**. No necesita Redirect URI porque usa credenciales de aplicación.
3. Copia el **Application (client) ID** y el **Directory (tenant) ID**. En **Certificates & secrets → Client secrets → New client secret**, crea una credencial y copia el **Value**.
4. En esa aplicación, entra en **API permissions → Add a permission → Microsoft Graph → Application permissions → Mail.Send → Add permissions**. Un administrador debe seleccionar **Grant admin consent** para el tenant. `Mail.Send` de aplicación permite enviar como cualquier buzón del tenant. Solicita a TI una [Application Access Policy](https://learn.microsoft.com/en-us/powershell/module/exchange/new-applicationaccesspolicy) que restrinja esta aplicación al buzón remitente y prueba también un buzón no autorizado. Microsoft recomienda [Exchange Online RBAC for Applications](https://learn.microsoft.com/en-us/exchange/permissions-exo/application-rbac) para configuraciones nuevas; si TI usa ese modelo, debe retirar el grant global `Mail.Send` de Entra, porque ambos grants se suman y el global anula el alcance.
5. En [Supabase → Edge Functions → Secrets](https://supabase.com/dashboard/project/mpmywnfjctvkvvljntev/functions), guarda estos secretos para `send-notifications`:

   | Nombre | Valor |
   | --- | --- |
   | `M365_TENANT_ID` | Directory (tenant) ID de la aplicación de correo |
   | `M365_CLIENT_ID` | Application (client) ID de la aplicación de correo |
   | `M365_CLIENT_SECRET` | **Value** del secret de la aplicación de correo |
   | `M365_SENDER` | Correo del buzón remitente |
   | `APP_URL` | `https://resolvamos.vercel.app` |
   | `NOTIFICATION_JOB_SECRET` | Cadena aleatoria fuerte, compartida solo con la tarea programada |

   `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los proporciona el entorno alojado de Supabase. Nunca coloques estos valores en el repositorio ni en variables públicas de Vercel.
6. Despliega la función desde el repo: `npx supabase functions deploy send-notifications --no-verify-jwt --yes`. Para el trabajo programado, sustituye los marcadores de `supabase/ops/schedule-notifications.sql` y ejecútalo **una sola vez** en el SQL Editor de Supabase. El secreto del SQL debe coincidir con `NOTIFICATION_JOB_SECRET`. El trabajo invoca la función cada minuto y procesa hasta diez avisos por ejecución.

## 3. Destinatarios por área

Cada área tiene exactamente un `leader_id`. El líder debe existir como usuario activo con rol **leader** o **admin**. En **Configuración**, activa su cuenta, asígnale el rol y después selecciónalo en el área. Al crear un caso, la base de datos guarda el correo de ese líder en `notification_outbox`; el aviso se envía solo a ese destinatario. Si cambias el líder, los nuevos casos irán al nuevo correo; los avisos ya creados conservan el destinatario original.

Prueba con un caso real en cada área: verifica que el destinatario recibe el correo, que el enlace abre el caso y que **Configuración → Avisos** no muestra errores. Microsoft Graph devuelve HTTP 202 cuando acepta el mensaje, lo cual no garantiza la entrega final; revisa también el buzón y los registros de Exchange. Los errores de envío se reintentan hasta cinco veces. Un error ocurrido después de la aceptación puede generar un duplicado; el número de caso permite reconocerlo.
