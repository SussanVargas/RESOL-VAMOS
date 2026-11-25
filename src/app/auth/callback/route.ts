import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/lider", request.url));
  }
  const url = new URL("/login", request.url);
  url.searchParams.set("error", "No pudimos completar el acceso con Microsoft.");
  return NextResponse.redirect(url);
}
