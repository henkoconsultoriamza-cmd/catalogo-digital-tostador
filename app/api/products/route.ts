import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function GET() {
  if (!url || url.includes("placeholder") || !key || key === "REEMPLAZAR") {
    return NextResponse.json([]);
  }
  try {
    const sb = createClient(url, key);
    const { data, error } = await sb.from("products").select("*").order("category").order("name");
    if (error) return NextResponse.json([]);
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json([]);
  }
}
