import Link from "next/link";
import { House } from "lucide-react";
import { CaseList } from "@/components/case-list";
import { requireProfile } from "@/lib/auth";
import type { Case } from "@/lib/types";

export default async function CasesPage() {
  const { supabase, profile } = await requireProfile();
  const { data, error } = await supabase.from("cases").select("id,number,requester_id,requester_email,requester_name,leader_id,area_id,subject,description,status,created_at,updated_at,areas(name)").order("created_at", { ascending: false }).limit(200);
  const cases = (data ?? []) as unknown as Case[];
  return <div className="content-flow"><section className="page-heading"><div><div className="eyebrow">CENTRO DE SOPORTE</div><h1>{profile.role === "admin" ? "Todas las solicitudes" : "Solicitudes de mi área"}</h1><p>Abre un caso para ver el problema y actualizar su estado.</p></div><Link href="/" className="button secondary"><House size={18} /> Portal público</Link></section>
    <section className="panel list-panel">{error && <div className="alert error">No se pudieron cargar las solicitudes.</div>}<CaseList cases={cases} empty="Todavía no hay solicitudes para tu área." /></section>
  </div>;
}
