import Link from "next/link";
import { ArrowUpRight, Inbox } from "lucide-react";
import { formatDate, statusLabel, type Case } from "@/lib/types";

export function CaseList({ cases, empty = "Todavía no hay solicitudes para mostrar." }: { cases: Case[]; empty?: string }) {
  if (!cases.length) return <div className="empty-list"><div className="empty-list-icon"><Inbox size={25} /></div><h3>Todo al día</h3><p>{empty}</p></div>;
  return <div className="case-list">{cases.map((item) => <Link key={item.id} href={`/casos/${item.id}`} className="case-row">
    <div className="case-number">#{String(item.number).padStart(4, "0")}</div>
    <div className="case-main"><strong>{item.subject}</strong><span>{item.requester_name || "Usuario"} <span className="separator-dot">·</span> {item.areas?.name ?? "Área"} <span className="separator-dot">·</span> {formatDate(item.created_at)}</span></div>
    <span className={`status-pill ${item.status}`}>{statusLabel[item.status]}</span><ArrowUpRight className="row-arrow" size={18} />
  </Link>)}</div>;
}
