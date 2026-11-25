import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function requireProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data, error } = await supabase.from("profiles").select("id,email,full_name,role,active").eq("id", user.id).single();
  if (error || !data || !data.active) redirect("/sin-acceso");
  return { supabase, profile: data as Profile };
}

export async function requireAdmin() {
  const context = await requireProfile();
  if (context.profile.role !== "admin") redirect("/");
  return context;
}
