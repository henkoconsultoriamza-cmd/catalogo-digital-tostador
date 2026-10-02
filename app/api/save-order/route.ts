import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function POST(req: NextRequest) {
  if (!url || url.includes("placeholder") || !key || key === "REEMPLAZAR") {
    return NextResponse.json({ ok: true, note: "demo" });
  }
  try {
    const sb = createClient(url, key);
    const body = await req.json();
    const { error } = await sb.from("orders").insert({
      items: body.items,
      total: body.total,
      client_email: body.email ?? null,
      status: "nuevo",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
