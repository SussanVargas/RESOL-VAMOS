import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpenText, CircleHelp, Headphones, LockKeyhole, Send } from "lucide-react";
import { createPublicCase } from "@/app/actions";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const admin = createAdminClient();
  const { data } = await admin.from("areas").select("id,name,leader_id").eq("active", true).not("leader_id", "is", null).order("name");
  const areas = data ?? [];
  return <main className="public-page">
    <header className="public-header"><Link href="/" className="public-logo"><Image src="/cimbrados-logo.jpg" alt="Cimbrados" width={164} height={52} priority /></Link><nav aria-label="Enlaces"><Link href="/preguntas-frecuentes"><CircleHelp size={17} /> Preguntas frecuentes</Link><Link href="/login"><LockKeyhole size={16} /> Acceso líderes</Link></nav></header>
    <div className="public-main">
      <section className="public-intro"><span className="public-eyebrow"><Headphones size={17} /> MESA DE AYUDA ERP</span><h1>Cuéntanos qué pasó.<br /><em>Estamos para ayudarte.</em></h1><p>Si algo no funciona en el sistema, envíanos tu solicitud en tres pasos. No necesitas crear una cuenta.</p><div className="public-steps"><div><b>1</b><span>Escribe tu nombre</span></div><div><b>2</b><span>Elige tu área</span></div><div><b>3</b><span>Describe el problema</span></div></div><Link href="/preguntas-frecuentes" className="public-faq-link"><BookOpenText size={19} /> Antes de enviar, consulta las preguntas frecuentes <ArrowRight size={17} /></Link></section>
      <section className="public-form-card" aria-labelledby="form-title"><div className="public-card-top"><span>ENVIAR UNA SOLICITUD</span><h2 id="form-title">¿En qué podemos ayudarte?</h2><p>Completa estos datos y enviaremos tu caso al responsable de tu área.</p></div>{error && <div className="alert error" role="alert">{error}</div>}
        {areas.length === 0 ? <div className="alert note">Estamos preparando las áreas de atención. Vuelve a intentarlo en unos minutos.</div> : <form action={createPublicCase} className="public-form">
          <label>Tu nombre completo<input name="name" type="text" autoComplete="name" minLength={2} maxLength={100} placeholder="Ej. Ana Pérez" required /></label>
          <label>¿De qué área eres?<select name="area" defaultValue="" required><option value="" disabled>Selecciona tu área</option>{areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label>
          <label>¿Qué problema tienes con el ERP?<textarea name="description" minLength={15} maxLength={5000} rows={6} placeholder="Cuéntanos qué intentabas hacer, qué ocurrió y si viste algún mensaje de error." required /><small>No incluyas contraseñas ni información confidencial.</small></label>
          <div className="honeypot" aria-hidden="true"><label>Sitio web<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
          <button className="button primary wide public-submit" type="submit">Enviar mi solicitud <Send size={18} /></button><p className="public-privacy">Recibirás un número de caso al enviarla.</p>
        </form>}
      </section>
    </div><footer className="public-footer">Cimbrados · Experiencia, excelencia y seguridad.</footer>
  </main>;
}
