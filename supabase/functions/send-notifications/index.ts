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

function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function sendEmail(item: Notification) {
  const clientId = required("GMAIL_CLIENT_ID");
  const clientSecret = required("GMAIL_CLIENT_SECRET");
  const refreshToken = required("GMAIL_REFRESH_TOKEN");
  const sender = required("GMAIL_SENDER");
  const appUrl = required("APP_URL").replace(/\/$/, "");
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
  });
  if (!tokenResponse.ok) throw new Error(`Google OAuth: HTTP ${tokenResponse.status}`);
  const token = await tokenResponse.json();
  if (typeof token.access_token !== "string") throw new Error("Google no entregó un token de acceso.");
  const subject = `Nuevo caso ERP #${String(item.case_number).padStart(4, "0")} · ${item.area_name}`;
  const body = `Hola,\n\nSe registró una nueva solicitud del área ${item.area_name}.\n\nCaso: #${String(item.case_number).padStart(4, "0")}\nAsunto: ${item.case_subject}\n\nRevísala y actualiza su estado aquí:\n${appUrl}/casos/${item.case_id}\n\nMesa de ayuda ERP · Cimbrados`;
  const mime = [
    `From: ${sender}`,
    `To: ${item.recipient_email}`,
    `Subject: =?UTF-8?B?${encodeBase64(subject)}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    encodeBase64(body).match(/.{1,76}/g)?.join("\r\n") ?? "",
  ].join("\r\n");
  const raw = encodeBase64(mime).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  if (!response.ok) throw new Error(`Gmail API: HTTP ${response.status}`);
  const sent = await response.json();
  return String(sent.id ?? "");
}

Deno.serve(async (request) => {
  try {
    const expected = Deno.env.get("NOTIFICATION_JOB_SECRET");
    if (!expected || request.method !== "POST" || request.headers.get("x-job-secret") !== expected) {
      return new Response("No autorizado", { status: 401 });
    }
    required("GMAIL_CLIENT_ID"); required("GMAIL_CLIENT_SECRET"); required("GMAIL_REFRESH_TOKEN"); required("GMAIL_SENDER"); required("APP_URL");
    const supabase = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
    let sent = 0;
    let failed = 0;
    for (let i = 0; i < 10; i++) {
      const { data, error } = await supabase.rpc("claim_notification");
      if (error) throw new Error(`No se pudo tomar un aviso: ${error.message}`);
      const item = (data?.[0] ?? null) as Notification | null;
      if (!item) break;
      let gmailId: string;
      try {
        gmailId = await sendEmail(item);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error de envío";
        const { error: finishError } = await supabase.rpc("finish_notification", { p_id: item.notification_id, p_success: false, p_error: message });
        if (finishError) throw finishError;
        failed++;
        continue;
      }
      const { error: finishError } = await supabase.rpc("finish_notification", { p_id: item.notification_id, p_success: true, p_gmail_id: gmailId });
      if (finishError) throw finishError;
      sent++;
    }
    return Response.json({ sent, failed });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : "Error interno" }, { status: 500 });
  }
});
