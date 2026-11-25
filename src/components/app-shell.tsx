import Link from "next/link";
import { ClipboardList, CirclePlus, LayoutDashboard, LogOut, Settings2 } from "lucide-react";
import { logout } from "@/app/actions";
import type { Profile } from "@/lib/types";

export function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const initials = (profile.full_name || profile.email).split(/[\s@]+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");
  return <div className="app-shell">
    <aside className="sidebar">
      <Link href="/" className="sidebar-brand"><span className="brand-mark">C</span><span className="brand-text">Cimbrados<small>MESA DE AYUDA</small></span></Link>
      <nav className="sidebar-nav" aria-label="Principal">
        <span className="nav-caption">ESPACIO DE TRABAJO</span>
        <Link href="/" className="nav-link"><LayoutDashboard size={19} /> Resumen</Link>
        <Link href="/casos" className="nav-link"><ClipboardList size={19} /> Solicitudes</Link>
        <Link href="/casos/nuevo" className="nav-link"><CirclePlus size={19} /> Nueva solicitud</Link>
        {profile.role === "admin" && <><span className="nav-caption nav-caption-spaced">ADMINISTRACIÓN</span><Link href="/admin" className="nav-link"><Settings2 size={19} /> Configuración</Link></>}
      </nav>
      <div className="sidebar-bottom"><div className="sidebar-avatar">{initials || "U"}</div><div className="sidebar-user"><strong>{profile.full_name || profile.email.split("@")[0]}</strong><small>{profile.role === "admin" ? "Administrador" : profile.role === "leader" ? "Líder de área" : "Solicitante"}</small></div><form action={logout}><button type="submit" className="icon-button" title="Cerrar sesión" aria-label="Cerrar sesión"><LogOut size={18} /></button></form></div>
    </aside>
    <div className="main-column">
      <header className="topbar"><div className="mobile-brand"><span className="brand-mark">C</span><strong>Cimbrados</strong></div><span className="topbar-label">Centro de soporte ERP</span><div className="topbar-user"><span className="online-dot" /> {profile.email}</div></header>
      <main className="main-content">{children}</main>
      <nav className="mobile-nav" aria-label="Navegación móvil"><Link href="/"><LayoutDashboard size={20} /><span>Inicio</span></Link><Link href="/casos"><ClipboardList size={20} /><span>Casos</span></Link><Link href="/casos/nuevo"><CirclePlus size={20} /><span>Crear</span></Link>{profile.role === "admin" && <Link href="/admin"><Settings2 size={20} /><span>Ajustes</span></Link>}<form action={logout}><button type="submit"><LogOut size={20} /><span>Salir</span></button></form></nav>
    </div>
  </div>;
}
