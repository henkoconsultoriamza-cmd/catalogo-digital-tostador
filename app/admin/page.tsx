"use client";

import { useEffect, useState } from "react";
import { COMODATO_MACHINES } from "../catalog-data";

// ─── Types ────────────────────────────────────────────────────────────────────
type ComodatoRecord = {
  id: string;
  cafeteria: string;
  contactName: string;
  phone: string;
  address: string;
  machineId: string;
  machineName: string;
  installDate: string;
  minKgMonth: number;
  contractSigned: boolean;
  notes: string;
  status: "activo" | "suspendido" | "finalizado";
};

type Order = {
  id: string;
  client_email: string;
  total: number;
  status: string;
  created_at: string;
  items: { name: string; quantity: number; unitPrice: number }[];
};

const STORAGE_KEY = "origen_comodatos_v1";

function loadComodatos(): ComodatoRecord[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

function saveComodatos(list: ComodatoRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "plus")    return <svg {...p}><path d="M12 5v14M5 12h14"/></svg>;
  if (name === "edit")    return <svg {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
  if (name === "trash")   return <svg {...p}><polyline points="3 6 5 6 21 6"/><path d="m19 6-.867 12.142A2 2 0 0 1 16.138 20H7.862a2 2 0 0 1-1.995-1.858L5 6m5 0V4h4v2"/></svg>;
  if (name === "close")   return <svg {...p}><path d="m6 6 12 12M18 6 6 18"/></svg>;
  if (name === "check")   return <svg {...p}><polyline points="20 6 9 17 4 12"/></svg>;
  if (name === "coffee")  return <svg {...p}><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>;
  if (name === "file")    return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
  if (name === "package") return <svg {...p}><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
  return null;
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  activo:     { bg: "#052e16", color: "#4ade80", label: "Activo" },
  suspendido: { bg: "#1c1000", color: "#fbbf24", label: "Suspendido" },
  finalizado: { bg: "#1c0505", color: "#f87171", label: "Finalizado" },
};

const EMPTY: Omit<ComodatoRecord, "id"> = {
  cafeteria: "", contactName: "", phone: "", address: "",
  machineId: COMODATO_MACHINES[0].id, machineName: COMODATO_MACHINES[0].name,
  installDate: new Date().toISOString().split("T")[0],
  minKgMonth: COMODATO_MACHINES[0].minKgMonth,
  contractSigned: false, notes: "", status: "activo",
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pass, setPass] = useState("");
  const [passErr, setPassErr] = useState(false);
  const [tab, setTab] = useState<"comodatos" | "pedidos">("comodatos");

  // Comodatos
  const [comodatos, setComodatos] = useState<ComodatoRecord[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ComodatoRecord | null>(null);
  const [form, setForm] = useState<Omit<ComodatoRecord, "id">>(EMPTY);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Pedidos
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    if (authed) {
      setComodatos(loadComodatos());
      loadOrders();
    }
  }, [authed]);

  async function loadOrders() {
    setOrdersLoading(true);
    try {
      const res = await fetch("/api/list-orders");
      if (res.ok) setOrders(await res.json());
    } catch {}
    setOrdersLoading(false);
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (pass === (process.env.NEXT_PUBLIC_ADMIN_PASS ?? "admin123")) {
      setAuthed(true);
    } else {
      setPassErr(true);
      setTimeout(() => setPassErr(false), 1500);
    }
  }

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setFormOpen(true);
  }

  function openEdit(r: ComodatoRecord) {
    setEditing(r);
    setForm({ cafeteria: r.cafeteria, contactName: r.contactName, phone: r.phone, address: r.address, machineId: r.machineId, machineName: r.machineName, installDate: r.installDate, minKgMonth: r.minKgMonth, contractSigned: r.contractSigned, notes: r.notes, status: r.status });
    setFormOpen(true);
  }

  function handleSave() {
    const machine = COMODATO_MACHINES.find(m => m.id === form.machineId)!;
    const record = { ...form, machineName: machine.name, minKgMonth: machine.minKgMonth };
    let updated: ComodatoRecord[];
    if (editing) {
      updated = comodatos.map(c => c.id === editing.id ? { ...record, id: editing.id } : c);
    } else {
      updated = [...comodatos, { ...record, id: crypto.randomUUID() }];
    }
    saveComodatos(updated);
    setComodatos(updated);
    setFormOpen(false);
  }

  function handleDelete(id: string) {
    const updated = comodatos.filter(c => c.id !== id);
    saveComodatos(updated);
    setComodatos(updated);
    setDeleteConfirm(null);
  }

  function setField<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  const dark = "#0A0604";
  const accent = "#C4843A";
  const surface = "#1A1208";
  const border = "#2A1E0E";

  // ── Login ──────────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: dark, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ background: surface, borderRadius: 20, padding: "36px 32px", width: "100%", maxWidth: 380, border: `1px solid ${border}`, boxShadow: "0 20px 60px rgba(0,0,0,.6)" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <img src="/logo-origen.svg" alt="Origen Tostadores" style={{ height: 36, margin: "0 auto 12px" }} />
            <div style={{ fontSize: 13, color: "#B89B7A" }}>Panel de administración</div>
          </div>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: "#6B4F2E", textTransform: "uppercase" as const, letterSpacing: ".5px", display: "block", marginBottom: 6 }}>Contraseña</label>
              <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" autoFocus
                style={{ width: "100%", height: 42, borderRadius: 9, border: `1.5px solid ${passErr ? "#ef4444" : border}`, padding: "0 14px", fontSize: 15, background: "#120D08", color: "#F5EFE6", outline: "none", transition: "border .15s", boxSizing: "border-box" as const }} />
              {passErr && <div style={{ fontSize: 12, color: "#ef4444", marginTop: 5 }}>Contraseña incorrecta</div>}
            </div>
            <button type="submit" style={{ height: 44, borderRadius: 9, background: accent, color: "#fff", fontSize: 14, fontWeight: 800, border: "none", cursor: "pointer" }}>
              Ingresar
            </button>
          </form>
        </div>
      </div>
    );
  }

  const activos = comodatos.filter(c => c.status === "activo").length;

  // ── Dashboard ──────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: dark, color: "#F5EFE6", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* Header */}
      <div style={{ background: surface, borderBottom: `1px solid ${border}`, padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img src="/logo-origen.svg" alt="Origen" style={{ height: 28 }} />
          <div style={{ width: 1, height: 24, background: border }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#B89B7A" }}>Admin</span>
        </div>
        <a href="/" style={{ fontSize: 12, color: "#6B4F2E", textDecoration: "none" }}>← Ver catálogo</a>
      </div>

      {/* Tabs */}
      <div style={{ background: surface, borderBottom: `1px solid ${border}`, padding: "0 24px", display: "flex", gap: 4 }}>
        {([
          { key: "comodatos", label: "🤝 Comodatos", icon: "coffee" },
          { key: "pedidos",   label: "📦 Pedidos",   icon: "package" },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ height: 44, padding: "0 16px", border: "none", borderBottom: tab === t.key ? `2px solid ${accent}` : "2px solid transparent", background: "transparent", color: tab === t.key ? accent : "#6B4F2E", fontSize: 13, fontWeight: tab === t.key ? 700 : 500, cursor: "pointer" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "24px", maxWidth: 1100, margin: "0 auto" }}>

        {/* ── COMODATOS TAB ────────────────────────────────────────────────── */}
        {tab === "comodatos" && (
          <>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Total comodatos", value: comodatos.length, color: "#F5EFE6" },
                { label: "Activos", value: activos, color: "#4ade80" },
                { label: "Suspendidos", value: comodatos.filter(c => c.status === "suspendido").length, color: "#fbbf24" },
                { label: "Finalizados", value: comodatos.filter(c => c.status === "finalizado").length, color: "#f87171" },
              ].map(s => (
                <div key={s.label} style={{ background: surface, borderRadius: 12, padding: "16px 18px", border: `1px solid ${border}` }}>
                  <div style={{ fontSize: 11, color: "#6B4F2E", fontWeight: 600, marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: ".4px" }}>{s.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#F5EFE6" }}>Cafeterías con comodato</h2>
              <button onClick={openNew}
                style={{ height: 36, padding: "0 16px", borderRadius: 9, background: accent, color: "#fff", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="plus" size={14} /> Nuevo comodato
              </button>
            </div>

            {/* Table */}
            {comodatos.length === 0 ? (
              <div style={{ background: surface, borderRadius: 14, border: `1px solid ${border}`, padding: "60px 20px", textAlign: "center" as const, color: "#6B4F2E" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🤝</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: "#B89B7A" }}>Sin comodatos registrados</div>
                <div style={{ fontSize: 13, marginBottom: 20 }}>Registrá las cafeterías que tienen máquinas en comodato.</div>
                <button onClick={openNew} style={{ height: 38, padding: "0 20px", borderRadius: 9, background: accent, color: "#fff", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer" }}>
                  + Agregar primero
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {comodatos.map(c => {
                  const st = STATUS_STYLE[c.status];
                  return (
                    <div key={c.id} style={{ background: surface, borderRadius: 14, border: `1px solid ${border}`, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" as const }}>
                      {/* Status dot */}
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: st.color, flexShrink: 0 }} />

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#F5EFE6", marginBottom: 2 }}>{c.cafeteria}</div>
                        <div style={{ fontSize: 12, color: "#B89B7A" }}>{c.contactName} · {c.phone}</div>
                        <div style={{ fontSize: 11, color: "#6B4F2E", marginTop: 2 }}>{c.address}</div>
                      </div>

                      {/* Machine */}
                      <div style={{ minWidth: 180 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#6B4F2E", textTransform: "uppercase" as const, letterSpacing: ".4px", marginBottom: 3 }}>Máquina</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#F5EFE6" }}>{c.machineName}</div>
                        <div style={{ fontSize: 11, color: "#B89B7A" }}>Mín. {c.minKgMonth} kg/mes</div>
                      </div>

                      {/* Install date */}
                      <div style={{ minWidth: 120 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#6B4F2E", textTransform: "uppercase" as const, letterSpacing: ".4px", marginBottom: 3 }}>Instalación</div>
                        <div style={{ fontSize: 13, color: "#F5EFE6" }}>{new Date(c.installDate + "T00:00:00").toLocaleDateString("es-AR")}</div>
                        <div style={{ fontSize: 11, color: c.contractSigned ? "#4ade80" : "#f87171" }}>{c.contractSigned ? "✓ Contrato firmado" : "⚠ Sin contrato"}</div>
                      </div>

                      {/* Status badge */}
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: st.bg, color: st.color, flexShrink: 0 }}>{st.label}</span>

                      {/* Actions */}
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button onClick={() => openEdit(c)} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${border}`, background: "transparent", color: "#B89B7A", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                          <Icon name="edit" size={13} />
                        </button>
                        <button onClick={() => setDeleteConfirm(c.id)} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #3b0000", background: "transparent", color: "#f87171", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                          <Icon name="trash" size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── PEDIDOS TAB ──────────────────────────────────────────────────── */}
        {tab === "pedidos" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Pedidos recibidos</h2>
              <button onClick={loadOrders} style={{ fontSize: 12, color: accent, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>↺ Actualizar</button>
            </div>
            {ordersLoading ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#6B4F2E" }}>Cargando pedidos…</div>
            ) : orders.length === 0 ? (
              <div style={{ background: surface, borderRadius: 14, border: `1px solid ${border}`, padding: "60px 20px", textAlign: "center" as const, color: "#6B4F2E" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                <div style={{ fontSize: 14, color: "#B89B7A" }}>Sin pedidos todavía</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>Los pedidos aparecen acá cuando se conecta Supabase.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {orders.map(o => (
                  <div key={o.id} style={{ background: surface, borderRadius: 14, border: `1px solid ${border}`, padding: "16px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#F5EFE6" }}>{o.client_email}</div>
                        <div style={{ fontSize: 11, color: "#6B4F2E" }}>{new Date(o.created_at).toLocaleString("es-AR")}</div>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: accent }}>
                        $ {o.total?.toLocaleString("es-AR")}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                      {(o.items ?? []).map((item, i) => (
                        <span key={i} style={{ fontSize: 11, background: "#120D08", border: `1px solid ${border}`, borderRadius: 6, padding: "3px 8px", color: "#B89B7A" }}>
                          {item.quantity}× {item.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Form modal ───────────────────────────────────────────────────────── */}
      {formOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setFormOpen(false); }}>
          <div style={{ background: surface, borderRadius: 18, width: "100%", maxWidth: 560, maxHeight: "90vh", overflow: "auto", border: `1px solid ${border}`, boxShadow: "0 20px 60px rgba(0,0,0,.7)" }}>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{editing ? "Editar comodato" : "Nuevo comodato"}</span>
              <button onClick={() => setFormOpen(false)} style={{ color: "#6B4F2E" }}><Icon name="close" /></button>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Cafetería */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B4F2E", textTransform: "uppercase" as const, letterSpacing: ".5px", marginBottom: 6 }}>Nombre del local</div>
                <input value={form.cafeteria} onChange={e => setField("cafeteria", e.target.value)} placeholder="Cafetería El Rincón"
                  style={{ width: "100%", height: 40, borderRadius: 8, border: `1px solid ${border}`, padding: "0 12px", fontSize: 14, background: "#120D08", color: "#F5EFE6", outline: "none", boxSizing: "border-box" as const }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#6B4F2E", textTransform: "uppercase" as const, letterSpacing: ".5px", marginBottom: 6 }}>Contacto</div>
                  <input value={form.contactName} onChange={e => setField("contactName", e.target.value)} placeholder="María García"
                    style={{ width: "100%", height: 40, borderRadius: 8, border: `1px solid ${border}`, padding: "0 12px", fontSize: 14, background: "#120D08", color: "#F5EFE6", outline: "none", boxSizing: "border-box" as const }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#6B4F2E", textTransform: "uppercase" as const, letterSpacing: ".5px", marginBottom: 6 }}>Teléfono</div>
                  <input value={form.phone} onChange={e => setField("phone", e.target.value)} placeholder="+54 9 11 1234-5678"
                    style={{ width: "100%", height: 40, borderRadius: 8, border: `1px solid ${border}`, padding: "0 12px", fontSize: 14, background: "#120D08", color: "#F5EFE6", outline: "none", boxSizing: "border-box" as const }} />
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B4F2E", textTransform: "uppercase" as const, letterSpacing: ".5px", marginBottom: 6 }}>Dirección</div>
                <input value={form.address} onChange={e => setField("address", e.target.value)} placeholder="Av. Corrientes 1234, CABA"
                  style={{ width: "100%", height: 40, borderRadius: 8, border: `1px solid ${border}`, padding: "0 12px", fontSize: 14, background: "#120D08", color: "#F5EFE6", outline: "none", boxSizing: "border-box" as const }} />
              </div>

              {/* Máquina */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B4F2E", textTransform: "uppercase" as const, letterSpacing: ".5px", marginBottom: 6 }}>Máquina en comodato</div>
                <select value={form.machineId} onChange={e => setField("machineId", e.target.value)}
                  style={{ width: "100%", height: 40, borderRadius: 8, border: `1px solid ${border}`, padding: "0 12px", fontSize: 14, background: "#120D08", color: "#F5EFE6", outline: "none", boxSizing: "border-box" as const }}>
                  {COMODATO_MACHINES.map(m => (
                    <option key={m.id} value={m.id}>{m.name} — {m.model} (mín. {m.minKgMonth} kg/mes)</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#6B4F2E", textTransform: "uppercase" as const, letterSpacing: ".5px", marginBottom: 6 }}>Fecha de instalación</div>
                  <input type="date" value={form.installDate} onChange={e => setField("installDate", e.target.value)}
                    style={{ width: "100%", height: 40, borderRadius: 8, border: `1px solid ${border}`, padding: "0 12px", fontSize: 14, background: "#120D08", color: "#F5EFE6", outline: "none", boxSizing: "border-box" as const }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#6B4F2E", textTransform: "uppercase" as const, letterSpacing: ".5px", marginBottom: 6 }}>Estado</div>
                  <select value={form.status} onChange={e => setField("status", e.target.value as ComodatoRecord["status"])}
                    style={{ width: "100%", height: 40, borderRadius: 8, border: `1px solid ${border}`, padding: "0 12px", fontSize: 14, background: "#120D08", color: "#F5EFE6", outline: "none", boxSizing: "border-box" as const }}>
                    <option value="activo">Activo</option>
                    <option value="suspendido">Suspendido</option>
                    <option value="finalizado">Finalizado</option>
                  </select>
                </div>
              </div>

              {/* Contrato */}
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <div onClick={() => setField("contractSigned", !form.contractSigned)}
                  style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${form.contractSigned ? accent : border}`, background: form.contractSigned ? accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {form.contractSigned && <Icon name="check" size={12} />}
                </div>
                <span style={{ fontSize: 13, color: "#B89B7A" }}>Contrato firmado</span>
              </label>

              {/* Notas */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B4F2E", textTransform: "uppercase" as const, letterSpacing: ".5px", marginBottom: 6 }}>Notas internas</div>
                <textarea value={form.notes} onChange={e => setField("notes", e.target.value)} rows={3} placeholder="Observaciones, historial de mantenimiento, etc."
                  style={{ width: "100%", borderRadius: 8, border: `1px solid ${border}`, padding: "10px 12px", fontSize: 13, background: "#120D08", color: "#F5EFE6", outline: "none", resize: "vertical" as const, boxSizing: "border-box" as const, fontFamily: "inherit" }} />
              </div>

              <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                <button onClick={() => setFormOpen(false)} style={{ flex: 1, height: 42, borderRadius: 9, border: `1px solid ${border}`, background: "transparent", color: "#B89B7A", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={!form.cafeteria || !form.contactName}
                  style={{ flex: 2, height: 42, borderRadius: 9, background: accent, color: "#fff", fontSize: 14, fontWeight: 800, border: "none", cursor: "pointer", opacity: (!form.cafeteria || !form.contactName) ? 0.5 : 1 }}>
                  {editing ? "Guardar cambios" : "Registrar comodato"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ────────────────────────────────────────────────────── */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: surface, borderRadius: 16, padding: "28px 28px", maxWidth: 360, width: "100%", border: `1px solid ${border}`, textAlign: "center" as const }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>¿Eliminar este comodato?</div>
            <div style={{ fontSize: 13, color: "#B89B7A", marginBottom: 24 }}>Esta acción no se puede deshacer.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, height: 40, borderRadius: 9, border: `1px solid ${border}`, background: "transparent", color: "#B89B7A", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} style={{ flex: 1, height: 40, borderRadius: 9, background: "#7f1d1d", color: "#fca5a5", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer" }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
