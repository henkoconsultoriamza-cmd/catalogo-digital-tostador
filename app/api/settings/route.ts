import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function GET() {
  if (!url || url.includes("placeholder") || !key || key === "REEMPLAZAR") {
    return NextResponse.json({});
  }
  try {
    const sb = createClient(url, key);
    const { data } = await sb.from("settings").select("key, value");
    if (!data) return NextResponse.json({});
    const obj: Record<string, string> = {};
    for (const row of data) obj[row.key] = row.value;
    return NextResponse.json(obj);
  } catch {
    return NextResponse.json({});
  }
}
