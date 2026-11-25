"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireProfile } from "@/lib/auth";
import type { Status } from "@/lib/types";

function errorUrl(path: string, message: string) {
  return `${path}?error=${encodeURIComponent(message)}`;
}

export async function loginWithMicrosoft() {
  const supabase = await createClient();
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const appUrl = process.env.APP_URL ?? "https://resolvamos.vercel.app";
  const redirectOrigin = origin === "http://localhost:3000" ? origin : appUrl.replace(/\/$/, "");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "azure",
    options: { scopes: "email", redirectTo: `${redirectOrigin}/auth/callback` },
  });
  if (error || !data.url) redirect(errorUrl("/login", "No pudimos conectar con Microsoft."));
  redirect(data.url);
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(errorUrl("/login", "No pudimos iniciar sesión. Revisa tus datos."));
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createCase(formData: FormData) {
  const { supabase } = await requireProfile();
  const area = String(formData.get("area") ?? "");
  const subject = String(formData.get("subject") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!area || subject.length < 5 || subject.length > 120 || description.length < 15 || description.length > 5000) {
    redirect(errorUrl("/casos/nuevo", "Completa todos los campos con la longitud indicada."));
  }
  const { data, error } = await supabase.rpc("create_case", { p_area_id: area, p_subject: subject, p_description: description });
  if (error || !data) redirect(errorUrl("/casos/nuevo", error?.message ?? "No se pudo crear la solicitud."));
  redirect(`/casos/${data}?creado=1`);
}

export async function changeStatus(formData: FormData) {
  const { supabase } = await requireProfile();
  const id = String(formData.get("case_id") ?? "");
  const status = String(formData.get("status") ?? "") as Status;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["in_progress", "resolved", "closed"].includes(status)) redirect("/");
  const { error } = await supabase.rpc("change_case_status", { p_case_id: id, p_status: status });
  if (error) redirect(errorUrl(`/casos/${id}`, error.message));
  redirect(`/casos/${id}?actualizado=1`);
}

export async function createArea(formData: FormData) {
  const { supabase } = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const leader = String(formData.get("leader") ?? "");
  if (name.length < 2 || name.length > 80) redirect(errorUrl("/admin", "El nombre del área debe tener entre 2 y 80 caracteres."));
  const { error } = await supabase.from("areas").insert({ name, leader_id: leader || null });
  if (error) redirect(errorUrl("/admin", error.message));
  redirect("/admin?guardado=1");
}

export async function updateArea(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("area_id") ?? "");
  const leader = String(formData.get("leader") ?? "");
  const active = formData.get("active") === "on";
  const { error } = await supabase.from("areas").update({ leader_id: leader || null, active }).eq("id", id);
  if (error) redirect(errorUrl("/admin", error.message));
  redirect("/admin?guardado=1");
}

export async function updateUser(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "requester");
  const active = formData.get("active") === "on";
  if (!["requester", "leader", "admin"].includes(role)) redirect(errorUrl("/admin", "Rol inválido."));
  const { error } = await supabase.rpc("set_user_role", { p_user_id: id, p_role: role, p_active: active });
  if (error) redirect(errorUrl("/admin", error.message));
  redirect("/admin?guardado=1");
}
