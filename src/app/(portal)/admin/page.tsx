import { AlertCircle, Building2, UserRoundCog } from "lucide-react";
import { createArea, updateArea, updateUser } from "@/app/actions";
import { requireAdmin } from "@/lib/auth";
import type { Area, Profile } from "@/lib/types";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string; guardado?: string }> }) {
  const { supabase } = await requireAdmin();
  const query = await searchParams;
  const [{ data: areaData }, { data: profileData }, { data: failedData }] = await Promise.all([
    supabase.from("areas").select("id,name,leader_id,active").order("name"),
    supabase.from("profiles").select("id,email,full_name,role,active").order("email"),
    supabase.from("notification_outbox").select("id,last_error,recipient_email").eq("status", "failed").limit(10),
  ]);
  const areas = (areaData ?? []) as Area[];
  const profiles = (profileData ?? []) as Profile[];
  const leaders = profiles.filter((p) => p.active && (p.role === "leader" || p.role === "admin"));
  return <div className="content-flow"><section className="page-heading"><div><div className="eyebrow">ADMINISTRACIÓN</div><h1>Configuración</h1><p>Organiza las áreas y las personas responsables de recibir los casos.</p></div></section>
    {query.error && <div className="alert error" role="alert">{query.error}</div>}{query.guardado && <div className="alert success">Cambios guardados correctamente.</div>}
    {(failedData?.length ?? 0) > 0 && <section className="alert error"><AlertCircle size={19} /><div><strong>{failedData?.length} aviso(s) con error de envío.</strong><p>Revisa los permisos de Microsoft Graph y el registro de la función de notificaciones. Los casos permanecen guardados.</p></div></section>}
    <section className="panel admin-section"><div className="section-title"><span className="section-icon"><Building2 size={22} /></span><div><div className="eyebrow">ENRUTAMIENTO</div><h2>Áreas y responsables</h2><p>Solo las áreas activas con líder pueden recibir solicitudes.</p></div></div>
      <div className="admin-list">{areas.map((area) => <form key={area.id} action={updateArea} className="admin-row"><input type="hidden" name="area_id" value={area.id} /><div className="admin-row-main"><strong>{area.name}</strong><small>{area.active ? "Activa" : "Inactiva"}</small></div><label className="inline-field">Líder<select name="leader" defaultValue={area.leader_id ?? ""}><option value="">Sin asignar</option>{leaders.map((person) => <option key={person.id} value={person.id}>{person.full_name || person.email}</option>)}</select></label><label className="check-field"><input type="checkbox" name="active" defaultChecked={area.active} /> Activa</label><button type="submit" className="button secondary compact">Guardar</button></form>)}{areas.length === 0 && <p className="muted empty-admin">Crea la primera área para empezar a recibir solicitudes.</p>}</div>
      <form action={createArea} className="add-area-form"><label>Nueva área<input name="name" minLength={2} maxLength={80} placeholder="Ej. Comercial" required /></label><label>Líder inicial<select name="leader" defaultValue=""><option value="">Asignar después</option>{leaders.map((person) => <option key={person.id} value={person.id}>{person.full_name || person.email}</option>)}</select></label><button className="button primary" type="submit">Agregar área</button></form>
    </section>
    <section className="panel admin-section"><div className="section-title"><span className="section-icon"><UserRoundCog size={22} /></span><div><div className="eyebrow">ACCESOS</div><h2>Usuarios y roles</h2><p>Las cuentas se crean en Supabase Auth; aquí puedes asignarles un rol.</p></div></div><div className="admin-list">{profiles.map((person) => <form key={person.id} action={updateUser} className="admin-row"><input type="hidden" name="user_id" value={person.id} /><div className="admin-row-main"><strong>{person.full_name || person.email.split("@")[0]}</strong><small>{person.email}</small></div><label className="inline-field">Rol<select name="role" defaultValue={person.role}><option value="requester">Solicitante</option><option value="leader">Líder</option><option value="admin">Administrador</option></select></label><label className="check-field"><input type="checkbox" name="active" defaultChecked={person.active} /> Activo</label><button type="submit" className="button secondary compact">Guardar</button></form>)}</div></section>
  </div>;
}
