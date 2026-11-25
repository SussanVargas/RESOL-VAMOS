import Link from "next/link";
import { ArrowLeft, ArrowRight, Info, Send } from "lucide-react";
import { createCase } from "@/app/actions";
import { requireProfile } from "@/lib/auth";
import type { Area } from "@/lib/types";

export default async function NewCasePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { supabase } = await requireProfile();
  const [{ data }, { error }] = await Promise.all([
    supabase.from("areas").select("id,name,leader_id,active").eq("active", true).order("name"),
    searchParams,
  ]);
  const areas = ((data ?? []) as Area[]).filter((area) => area.leader_id);
  return <div className="content-flow narrow-content"><Link href="/casos" className="back-link"><ArrowLeft size={17} /> Volver a solicitudes</Link><section className="page-heading"><div><div className="eyebrow">NUEVA SOLICITUD</div><h1>Cuéntanos qué sucede</h1><p>Tu solicitud llegará al líder de tu área y podrás seguir su avance.</p></div></section>
    <div className="panel form-panel"><div className="form-intro"><div className="form-step">01</div><div><h2>Detalles del problema</h2><p>Entre más claro sea tu reporte, más fácil será ayudarte.</p></div></div>{error && <div className="alert error" role="alert">{error}</div>}
      {areas.length === 0 ? <div className="alert note"><Info size={18} /> Aún no hay áreas con líder asignado. Pide al administrador que configure una para poder crear solicitudes.</div> : <form action={createCase} className="form-stack"><label>Área responsable <span className="required">*</span><select name="area" required defaultValue=""><option value="" disabled>Selecciona tu área</option>{areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select><small>El sistema enviará el aviso al líder de esta área.</small></label><label>Asunto <span className="required">*</span><input name="subject" minLength={5} maxLength={120} placeholder="Ej. No puedo generar una factura" required /><small>Resume el problema en una frase.</small></label><label>¿Qué pasó con el ERP? <span className="required">*</span><textarea name="description" minLength={15} maxLength={5000} rows={7} placeholder="Describe qué estabas intentando hacer, qué ocurrió y cualquier mensaje de error que viste..." required /><small>Evita incluir contraseñas o datos sensibles.</small></label><div className="form-actions"><span><Info size={16} /> Podrás seguir el estado después de enviarla.</span><button type="submit" className="button primary">Enviar solicitud <Send size={17} /></button></div></form>}
    </div><div className="tip-line">¿Necesitas revisar otro caso? <Link href="/casos">Ir a solicitudes <ArrowRight size={14} /></Link></div>
  </div>;
}
