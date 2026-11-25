# Plan actual de la mesa de ayuda ERP

Actualizado el 25 de noviembre de 2026 con el cambio de alcance solicitado: el cliente entra sin iniciar sesión y solo los responsables usan una cuenta.

## Flujo de clientes

1. Abren la portada y, si desean, consultan las preguntas frecuentes.
2. Escriben nombre, área y descripción del problema. No necesitan correo ni contraseña.
3. Al enviar ven un número de caso. El caso queda asignado al líder activo del área elegida.

## Flujo de responsables

1. Inician sesión con su correo y contraseña en `/login`.
2. Ven sus casos en `/lider` y `/casos`; un líder no puede leer los casos de otro.
3. Abren el detalle y actualizan el estado. La cuenta administradora puede gestionar áreas y personas.

## Protección y datos

La acción pública valida los campos en el servidor. Usa una clave de Supabase exclusiva del servidor y nunca la expone al navegador. La base de datos crea el caso, historial y aviso pendiente en una transacción. Hay límite de cinco envíos por IP y hora, además de un campo trampa contra bots. RLS protege las bandejas privadas.

## Pendientes del brief

- Confirmar textos, logo original y respuestas definitivas de preguntas frecuentes.
- Decidir si los clientes deben consultar después el estado sin cuenta y cómo verificar su identidad para hacerlo.
- Configurar un buzón remitente si se necesitan alertas por correo además de la bandeja privada.
- Confirmar reglas de suplencia cuando un líder esté ausente y tiempos esperados de respuesta.
