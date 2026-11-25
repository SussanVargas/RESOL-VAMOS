# Plan inicial — mesa de ayuda ERP de Cimbrados

Estado: propuesta inicial para validar con el brief de la empresa. Este documento define un primer alcance funcional y registra las decisiones que pueden cambiar cuando lleguen los requisitos detallados.

## Objetivo

Una persona de la empresa reporta un problema del ERP, selecciona su área y describe lo ocurrido. El sistema crea un caso con número de seguimiento, lo asigna al líder configurado para esa área y le envía un aviso por correo. La persona puede consultar el estado; el líder puede atender y resolver el caso.

## Alcance inicial

- Acceso de usuarios internos autorizados. Roles: solicitante, líder de área y administrador.
- Formulario para crear caso: área, asunto y descripción; prioridad y adjuntos quedan pendientes de validar con el brief.
- Asignación automática al líder activo del área seleccionada. Si un área no tiene líder, impedir el envío y mostrar un mensaje claro al administrador; no crear casos sin responsable.
- Bandeja de «Mis solicitudes» para solicitantes; bandeja de «Casos de mi área» para líderes; vista global y configuración de áreas/líderes para administración.
- Estados iniciales: abierto, en proceso, resuelto y cerrado. Historial de cambios con autor y fecha.
- Correo al líder al crear el caso con número, área, asunto, resumen y enlace al detalle. El detalle completo permanece dentro de la aplicación autenticada.
- Diseño responsive en español, con navegación simple, jerarquía visual clara y colores inspirados en el logo recibido: azul pizarra y amarillo cálido. El archivo adjunto es una referencia de marca; antes del acabado final conviene obtener el logo original en SVG o PNG de buena calidad.

## Arquitectura decidida

| Capa | Elección | Responsabilidad |
| --- | --- | --- |
| Interfaz | Next.js con TypeScript, App Router, Tailwind CSS y componentes accesibles | Formularios, bandejas y detalle del caso en escritorio y móvil. |
| Despliegue web | Vercel conectado a este repositorio | Builds, previews y publicación. |
| Identidad | Supabase Auth | Sesiones y usuarios internos. El método de entrada se confirma con el brief; propuesta inicial: cuentas invitadas, sin registro público. |
| Datos | Supabase Postgres | Áreas, perfiles, casos, historial y avisos pendientes. Migraciones versionadas en Git. |
| Backend | Supabase Edge Functions y una función SQL transaccional | Validar permisos, crear caso y aviso juntos, enviar correo y reintentar fallos. |
| Correo | Gmail API con permiso `gmail.send` | Envío desde una cuenta institucional autorizada; credenciales solo en secretos del servidor. |

El navegador no decide el destinatario ni puede escribir un líder arbitrario. El backend consulta el líder activo del área. Las tablas expuestas aplican Row Level Security (RLS): solicitante ve sus casos; líder ve los asignados a su área; administrador gestiona el conjunto. Las claves de servicio y el token de Gmail nunca llegan al cliente.

## Flujo del caso y del correo

1. El usuario autenticado completa el formulario y el backend valida datos y pertenencia a la empresa.
2. Una transacción crea el caso, guarda el líder asignado y crea un aviso en una bandeja de salida (`notification_outbox`). Así el caso queda registrado aunque Gmail falle.
3. La Edge Function intenta enviar el aviso con Gmail API. Guarda el resultado, identificador del mensaje y cantidad de intentos.
4. Un trabajo programado en Supabase reintenta avisos pendientes con espera creciente y límite de intentos. El administrador ve los fallos para intervención.
5. El líder abre el enlace, cambia el estado y el historial conserva cada acción.

Los reintentos de correo deben ser idempotentes en lo posible, pero una interrupción después de que Gmail acepte el envío y antes de guardar su resultado puede producir un duplicado. El número del caso en asunto y cuerpo permite reconocerlo.

## Modelo de datos inicial

- `profiles`: usuario de Auth, nombre, correo, rol, activo.
- `areas`: nombre, estado, líder actual.
- `cases`: número público, solicitante, área, líder asignado, asunto, descripción, estado, marcas de tiempo.
- `case_events`: caso, autor, acción, estado anterior/nuevo, fecha.
- `notification_outbox`: caso, destinatario, tipo, estado, intentos, próximo intento, error resumido e identificador de Gmail.

Guardar el líder asignado en cada caso evita que un cambio posterior de líder altere el responsable histórico. La reasignación manual, si se solicita, deberá quedar en el historial.

## Fases de implementación

1. **Definición:** recibir brief, áreas, líderes, reglas de acceso, cuenta remitente y logo original. Confirmar campos, estados, privacidad y criterios de éxito.
2. **Base:** crear aplicación Next.js, diseño base, migraciones Supabase, Auth y políticas RLS. Validar permisos con pruebas de permitir/denegar por rol.
3. **Casos:** formulario, asignación, bandejas, detalle, cambio de estado e historial. Verificar uso real en móvil y escritorio.
4. **Correos:** configurar Google Cloud/Gmail API, secretos, plantilla, bandeja de salida, reintentos y supervisión. Probar un envío real a un líder de prueba y un fallo simulado.
5. **Publicación:** conectar GitHub con Vercel, configurar entornos y dominios, aplicar migraciones, publicar preview y producción, hacer recorrido completo con usuarios de cada rol.

## Criterios de aceptación del primer lanzamiento

- Una persona autorizada puede crear un caso con área, asunto y descripción y recibe un número visible.
- El caso queda asignado al líder configurado para el área seleccionada; otro líder no puede verlo.
- El líder recibe un correo con enlace funcional y puede pasar el caso por los estados acordados.
- Solicitante y administrador pueden seguir el estado conforme a sus permisos.
- Si Gmail falla, el caso sigue registrado y el aviso queda visible como pendiente o fallido para reintento.
- Las vistas principales funcionan en ancho móvil y escritorio; ninguna clave privada aparece en el navegador o en Git.

## Datos que necesitamos del brief

1. Lista definitiva de áreas, líder y correo de cada una; qué hacer con suplencias y líderes ausentes.
2. Quién puede crear casos y cómo se identificará: Google Workspace corporativo, cuentas internas u otro método.
3. Campos obligatorios, prioridad, categorías, adjuntos, comentarios y datos que no deben ir por correo.
4. Estados, quién puede cerrar o reabrir, tiempos de respuesta y si hacen falta recordatorios o escalamiento.
5. Cuenta institucional que enviará desde Gmail, tipo de cuenta (Workspace o Gmail) y quién administrará Google Cloud y su autorización OAuth.
6. Necesidad de dominio propio, política de conservación de casos y quién administrará áreas y usuarios.

## Dependencias externas para operar

Se requieren un proyecto Supabase, un proyecto Vercel y autorización en Google Cloud para la cuenta remitente. Gmail API usa el alcance sensible `gmail.send`; el tipo de cuenta y la audiencia OAuth determinan la configuración o verificación necesaria. La aplicación no podrá demostrar correos reales hasta completar esa autorización. Antes de producción se cargarán los secretos en Supabase y se probará un caso completo con cuentas de la empresa.
