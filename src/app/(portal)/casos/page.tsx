import Link from "next/link";
import { FilePlus2 } from "lucide-react";
import { CaseList } from "@/components/case-list";
import { requireProfile } from "@/lib/auth";
import type { Case } from "@/lib/types";

export default async function CasesPage({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const { supabase, profile } = await requireProfile();
  const { vista } = await searchParams;
  const { data, error } = await supabase.from("cases").select("id,number,requester_id,requester_email,leader_id,area_id,subject,description,status,created_at,updated_at,areas(name)").order("created_at", { ascending: false }).limit(200);
  const all = (data ?? []) as unknown as Case[];
  const view = vista === "mios" ? "mios" : vista === "asignados" ? "asignados" : "todos";
  const cases = view === "mios" ? all.filter((c) => c.requester_id === profile.id) : view === "asignados" ? all.filter((c) => c.leader_id === profile.id) : all;
  return <div className="content-flow"><section className="page-heading"><div><div className="eyebrow">CENTRO DE SOPORTE</div><h1>Solicitudes</h1><p>Consulta el avance de los casos y encuentra lo que necesitas.</p></div><Link href="/casos/nuevo" className="button primary"><FilePlus2 size={18} /> Nueva solicitud</Link></section>
    <section className="panel list-panel"><div className="tab-bar"><Link href="/casos" className={view === "todos" ? "tab active" : "tab"}>Todos los visibles</Link><Link href="/casos?vista=mios" className={view === "mios" ? "tab active" : "tab"}>Mis solicitudes</Link>{profile.role !== "requester" && <Link href="/casos?vista=asignados" className={view === "asignados" ? "tab active" : "tab"}>Asignados a mí</Link>}</div>{error && <div className="alert error">No se pudieron cargar las solicitudes.</div>}<CaseList cases={cases} /></section>
  </div>;
}
