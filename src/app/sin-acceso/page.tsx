import Link from "next/link";
import { logout } from "@/app/actions";

export default function NoAccess() {
  return <main className="center-page"><div className="empty-card"><span className="empty-icon">!</span><h1>Acceso no disponible</h1><p>Tu cuenta no está activa en esta mesa de ayuda. Pide al administrador que revise tu acceso.</p><form action={logout}><button className="button primary" type="submit">Salir</button></form><Link href="/login" className="text-link">Volver al inicio</Link></div></main>;
}
