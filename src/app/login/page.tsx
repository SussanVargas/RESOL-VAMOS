import Image from "next/image";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { login } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/");
  const { error } = await searchParams;
  return <main className="login-shell">
    <section className="login-story">
      <div className="login-brand"><span className="brand-mark">C</span><span>Cimbrados</span></div>
      <div className="login-story-content">
        <div className="eyebrow light">MESA DE AYUDA · ERP</div>
        <h1>Las soluciones empiezan con una conversación clara.</h1>
        <p>Reporta lo que sucede, llega a la persona indicada y sigue cada solicitud en un solo lugar.</p>
        <div className="story-line"><span className="story-dot" /> Tu equipo, siempre conectado</div>
      </div>
      <div className="story-footer">Experiencia, excelencia y seguridad.</div>
    </section>
    <section className="login-form-panel">
      <div className="login-form-wrap">
        <div className="mobile-logo"><Image src="/cimbrados-logo.jpg" alt="Cimbrados" width={230} height={70} priority /></div>
        <div className="login-icon"><LockKeyhole size={25} strokeWidth={1.8} /></div>
        <div className="eyebrow">BIENVENIDO DE NUEVO</div>
        <h2>Ingresa a tu espacio</h2>
        <p className="muted">Usa la cuenta que te asignó el administrador.</p>
        {error && <div className="alert error" role="alert">{error}</div>}
        <form action={login} className="form-stack">
          <label>Correo electrónico<input name="email" type="email" autoComplete="email" placeholder="tu@empresa.com" required /></label>
          <label>Contraseña<input name="password" type="password" autoComplete="current-password" placeholder="Tu contraseña" required /></label>
          <button className="button primary wide" type="submit">Entrar a la mesa de ayuda <ArrowRight size={18} /></button>
        </form>
        <p className="login-help"><ShieldCheck size={16} /> Acceso exclusivo para personal autorizado</p>
      </div>
    </section>
  </main>;
}
