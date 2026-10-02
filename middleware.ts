import { NextResponse, type NextRequest } from "next/server";

const rateMap = new Map<string, { count: number; reset: number }>();

function checkRate(ip: string, limit: number): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.reset) {
    rateMap.set(ip, { count: 1, reset: now + 60_000 });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

export function middleware(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const path = req.nextUrl.pathname;

  if (path.startsWith("/api/save-order")) {
    if (!checkRate(`write:${ip}`, 10))
      return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  if (path.startsWith("/api/")) {
    if (!checkRate(`api:${ip}`, 60))
      return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  }

  if (path.startsWith("/admin")) {
    const ua = req.headers.get("user-agent") ?? "";
    if (!ua) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = { matcher: ["/api/:path*", "/admin/:path*"] };
