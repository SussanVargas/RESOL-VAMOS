export type Role = "requester" | "leader" | "admin";
export type Status = "open" | "in_progress" | "resolved" | "closed";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  active: boolean;
};

export type Area = {
  id: string;
  name: string;
  leader_id: string | null;
  active: boolean;
};

export type Case = {
  id: string;
  number: number;
  requester_id: string;
  requester_email: string;
  leader_id: string;
  area_id: string;
  subject: string;
  description: string;
  status: Status;
  created_at: string;
  updated_at: string;
  areas: { name: string } | null;
};

export const statusLabel: Record<Status, string> = {
  open: "Abierto",
  in_progress: "En proceso",
  resolved: "Resuelto",
  closed: "Cerrado",
};

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" }).format(new Date(value));
}
