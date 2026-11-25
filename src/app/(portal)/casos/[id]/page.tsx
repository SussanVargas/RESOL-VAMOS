import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, CircleCheck, Clock3, Mail, Tag } from "lucide-react";
import { changeStatus } from "@/app/actions";
import { requireProfile } from "@/lib/auth";
import { formatDate, statusLabel, type Case, type Status } from "@/lib/types";

type Event = { id: number; action: string; from_status: Status | null; to_status: Status | null; created_at: string };

export default async function CaseDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; creado?: string; actualizado?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase, profile } = await requireProfile();
  const [{ data }, { data: eventsData }, { data: notification }] = await Promise.all([
    supabase.from("cases").select("id,number,requester_id,requester_email,leader_id,area_id,subject,description,status,created_at,updated_at,areas(name)").eq("id", id).single(),
    supabase.from("case_events").select("id,action,from_status,to_status,created_at").eq("case_id", id).order("created_at", { ascending: false }),
    profile.role === "admin" ? supabase.from("notification_outbox").select("status,attempts,last_error,sent_at").eq("case_id", id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (!data) notFound();
  const item = data as unknown as Case;
  const events = (eventsData ?? []) as Event[];
  const canManage = profile.role === "admin" || item.leader_id === profile.id;
  const nextStatuses: Record<Status, Status[]> = { open: ["in_progress"], in_progress: ["resolved"], resolved: ["closed", "in_progress"], closed: [] };
  return <div className="content-flow narrow-content"><Link href="/casos" className="back-link"><ArrowLeft size={17} /> Volver a solicitudes</Link>
    <div className="case-detail-header"><div><div className="eyebrow">SOLICITUD #{String(item.number).padStart(4, "0")}</div><h1>{item.subject}</h1><p>Registrada el {formatDate(item.created_at)}</p></div><span className={`status-pill large ${item.status}`}>{statusLabel[item.status]}</span></div>
    {query.creado && <div className="alert success"><CircleCheck size={18} /> Tu solicitud quedó registrada. El aviso al líder está en proceso.</div>}{query.actualizado && <div className="alert success">Estado actualizado correctamente.</div>}{query.error && <div className="alert error">{query.error}</div>}
    <div className="detail-grid"><section className="panel detail-panel"><div className="eyebrow">DESCRIPCIÓN</div><h2>Lo que sucede</h2><p className="description-text">{item.description}</p><div className="detail-divider" /><div className="detail-facts"><div><Tag size={18} /><span><small>Área</small><strong>{item.areas?.name ?? "—"}</strong></span></div><div><Mail size={18} /><span><small>Reportado por</small><strong>{item.requester_email}</strong></span></div><div><CalendarDays size={18} /><span><small>Última actualización</small><strong>{formatDate(item.updated_at)}</strong></span></div></div></section>
      <aside className="detail-side"><section className="panel action-panel"><div className="eyebrow">SEGUIMIENTO</div><h2>Estado del caso</h2><p>{canManage ? "Actualiza el avance para mantener informado al solicitante." : "Aquí podrás ver cómo avanza tu solicitud."}</p>{canManage && nextStatuses[item.status].length > 0 && <div className="status-actions">{nextStatuses[item.status].map((status) => <form key={status} action={changeStatus}><input type="hidden" name="case_id" value={item.id} /><input type="hidden" name="status" value={status} /><button type="submit" className="button secondary wide">Marcar como {statusLabel[status].toLowerCase()}</button></form>)}</div>}</section>
      <section className="panel history-panel"><div className="eyebrow">HISTORIAL</div><h2>Actividad</h2><div className="timeline">{events.map((event) => <div className="timeline-item" key={event.id}><span className="timeline-marker"><Clock3 size={13} /></span><div><strong>{event.action === "created" ? "Solicitud creada" : `Estado: ${statusLabel[event.to_status ?? "open"]}`}</strong><small>{formatDate(event.created_at)}</small></div></div>)}</div></section>
      {profile.role === "admin" && notification && <section className="panel action-panel"><div className="eyebrow">CORREO AL LÍDER</div><h2>{notification.status === "sent" ? "Enviado" : notification.status === "failed" ? "Falló el envío" : "Pendiente"}</h2><p>Intentos: {notification.attempts}{notification.last_error ? ` · ${notification.last_error}` : ""}</p></section>}</aside></div>
  </div>;
}
