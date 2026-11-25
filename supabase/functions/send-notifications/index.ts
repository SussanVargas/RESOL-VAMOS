import { createClient } from "npm:@supabase/supabase-js@2";

type Notification = {
  notification_id: string;
  case_id: string;
  case_number: number;
  case_subject: string;
  area_name: string;
  recipient_email: string;
};

function required(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Falta ${name}`);
  return value;
}

async function getAccessToken() {
  const tenantId = required("M365_TENANT_ID");
  const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: required("M365_CLIENT_ID"),
      client_secret: required("M365_CLIENT_SECRET"),
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });
  if (!response.ok) throw new Error(`Microsoft OAuth: HTTP ${response.status}`);
  const token = await response.json();
  if (typeof token.access_token !== "string") throw new Error("Microsoft no entregó un token de acceso.");
  return token.access_token as string;
}

async function sendEmail(item: Notification, accessToken: string) {
  const sender = required("M365_SENDER");
  const appUrl = required("APP_URL").replace(/\/$/, "");
  const number = String(item.case_number).padStart(4, "0");
  const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        subject: `Nuevo caso ERP #${number} · ${item.area_name}`,
        body: {
          contentType: "Text",
          content: `Hola,\n\nSe registró una nueva solicitud del área ${item.area_name}.\n\nCaso: #${number}\nAsunto: ${item.case_subject}\n\nRevísala y actualiza su estado aquí:\n${appUrl}/casos/${item.case_id}\n\nMesa de ayuda ERP · Cimbrados`,
        },
        toRecipients: [{ emailAddress: { address: item.recipient_email } }],
      },
      saveToSentItems: true,
    }),
  });
  if (!response.ok) throw new Error(`Microsoft Graph: HTTP ${response.status}`);
  return response.headers.get("request-id");
}

Deno.serve(async (request) => {
  try {
    const expected = Deno.env.get("NOTIFICATION_JOB_SECRET");
    if (!expected || request.method !== "POST" || request.headers.get("x-job-secret") !== expected) {
      return new Response("No autorizado", { status: 401 });
    }
    required("M365_SENDER"); required("APP_URL");
    const supabase = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
    const accessToken = await getAccessToken();
    let sent = 0;
    let failed = 0;
    for (let i = 0; i < 10; i++) {
      const { data, error } = await supabase.rpc("claim_notification");
      if (error) throw new Error(`No se pudo tomar un aviso: ${error.message}`);
      const item = (data?.[0] ?? null) as Notification | null;
      if (!item) break;
      try {
        const requestId = await sendEmail(item, accessToken);
        const { error: finishError } = await supabase.rpc("finish_notification", { p_id: item.notification_id, p_success: true, p_provider_request_id: requestId });
        if (finishError) throw finishError;
        sent++;
      } catch (sendError) {
        const message = sendError instanceof Error ? sendError.message : "Error de envío";
        const { error: finishError } = await supabase.rpc("finish_notification", { p_id: item.notification_id, p_success: false, p_error: message });
        if (finishError) throw finishError;
        failed++;
      }
    }
    return Response.json({ sent, failed });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : "Error interno" }, { status: 500 });
  }
});
