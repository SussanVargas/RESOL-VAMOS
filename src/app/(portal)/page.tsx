import Link from "next/link";
import { ArrowRight, CircleCheck, Clock3, FilePlus2, Headphones, Layers3 } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { CaseList } from "@/components/case-list";
import type { Case } from "@/lib/types";

export default async function Dashboard() {
  const { supabase, profile } = await requireProfile();
  const { data, error } = await supabase.from("cases").select("id,number,requester_id,requester_email,leader_id,area_id,subject,description,status,created_at,updated_at,areas(name)").order("created_at", { ascending: false }).limit(100);
  const cases = (data ?? []) as unknown as Case[];
  const open = cases.filter((c) => c.status === "open").length;
  const progress = cases.filter((c) => c.status === "in_progress").length;
  const resolved = cases.filter((c) => c.status === "resolved" || c.status === "closed").length;
  const firstName = (profile.full_name || profile.email.split("@")[0]).split(" ")[0];
  return <div className="content-flow">
    <section className="welcome-bar"><div><div className="eyebrow">TU ESPACIO DE TRABAJO</div><h1>Hola, {firstName} <span className="wave">✦</span></h1><p>Un lugar para que cada solicitud avance con claridad.</p></div><Link href="/casos/nuevo" className="button primary"><FilePlus2 size={18} /> Nueva solicitud</Link></section>
    {error && <div className="alert error">No se pudieron cargar los casos. Comprueba que la migración esté aplicada.</div>}
    <section className="stats-grid" aria-label="Resumen de solicitudes"><div className="stat-card"><div className="stat-icon amber"><Layers3 size={22} /></div><span>Casos abiertos</span><strong>{open}</strong><small>Esperando atención</small></div><div className="stat-card"><div className="stat-icon blue"><Clock3 size={22} /></div><span>En proceso</span><strong>{progress}</strong><small>En manos de un líder</small></div><div className="stat-card"><div className="stat-icon green"><CircleCheck size={22} /></div><span>Finalizados</span><strong>{resolved}</strong><small>Resueltos o cerrados</small></div></section>
    <div className="dashboard-grid"><section className="panel recent-panel"><div className="panel-heading"><div><div className="eyebrow">ACTIVIDAD RECIENTE</div><h2>Últimas solicitudes</h2></div><Link href="/casos" className="text-link">Ver todas <ArrowRight size={16} /></Link></div><CaseList cases={cases.slice(0, 5)} empty="Cuando registres una solicitud aparecerá aquí." /></section><aside className="help-card"><div className="help-icon"><Headphones size={26} /></div><span className="eyebrow light">ESTAMOS PARA AYUDARTE</span><h2>¿Algo no funciona como debería?</h2><p>Cuéntanos qué sucede con el ERP. Tu caso llegará directamente al responsable de tu área.</p><Link href="/casos/nuevo" className="button light-button">Reportar un problema <ArrowRight size={17} /></Link></aside></div>
  </div>;
}
