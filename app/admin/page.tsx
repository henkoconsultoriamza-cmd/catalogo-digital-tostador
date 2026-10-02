"use client";

import { useEffect, useRef, useState } from "react";

// ── Storage keys ──────────────────────────────────────────────────────────────
const KEY_MACHINES  = "origen_machines_v1";
const KEY_MOLINOS   = "origen_molinos_v1";
const KEY_COMODATOS = "origen_comodatos_v2";
const KEY_CLIENTES  = "origen_clientes_v1";
const KEY_ORDERS    = "origen_orders_v1";
const KEY_AUTH      = "origen_admin_auth";
const ADMIN_PASS    = process.env.NEXT_PUBLIC_ADMIN_PASS || "admin123";

// ── Types ─────────────────────────────────────────────────────────────────────
type EquipStatus = "disponible" | "en_comodato" | "mantenimiento" | "baja";
type Maintenance = { id: string; date: string; type: string; description: string; technician: string };
type Machine     = { id: string; brand: string; model: string; serial: string; status: EquipStatus; notes: string; maintenances: Maintenance[] };
type Molino      = { id: string; brand: string; model: string; serial: string; status: EquipStatus; notes: string; maintenances: Maintenance[] };

type ComodatoRecord = {
  id: string; cafeteria: string; contact: string; phone: string; address: string;
  machineId: string; molinoId: string; installDate: string;
  minKgMonth: number; coffeeType: string; lastFilterChange: string;
  contractSigned: boolean; contractFileName: string; contractFileData: string;
  status: "activo" | "suspendido" | "finalizado"; notes: string;
};

type ClientePropio = {
  id: string; cafeteria: string; contact: string; phone: string; address: string;
  coffeeBrand: string; kgMonth: number; lastFilterChange: string;
  machineBrand: string; machineModel: string; machineSerial: string;
  molinoBrand: string; molinoModel: string; molinoSerial: string;
  status: "activo" | "inactivo"; notes: string;
};

type OrderLine = { id: string; description: string; category: string; qty: number; unit: string; unitPrice: number };
type Order = {
  id: string; date: string; clientId: string; clientName: string;
  clientType: "comodato" | "propio" | "otro";
  lines: OrderLine[]; total: number; kgCafe: number;
  status: "pendiente" | "confirmado" | "entregado" | "cancelado"; notes: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const FMT  = (n: number) => "$ " + n.toLocaleString("es-AR", { maximumFractionDigits: 0 });
const thisMonth = () => new Date().toISOString().slice(0, 7);
const daysSince = (d: string) => d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : null;
const calcTotal = (lines: OrderLine[]) => lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
const calcKg    = (lines: OrderLine[]) => lines.filter(l => l.category === "Café" && l.unit === "kg").reduce((s, l) => s + l.qty, 0);

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg: "#F2EDE6", white: "#FFFFFF", text: "#1A0E05", text2: "#5A3E28", muted: "#A08060",
  border: "#DDD5C8", accent: "#C4843A", green: "#1A7A3A", red: "#CC3300", orange: "#CC5500",
  sidebar: "#18120C",
};

const S = {
  input:  { width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 4, padding: "8px 12px", fontSize: 14, outline: "none", background: C.white, color: C.text, fontFamily: "inherit" } as React.CSSProperties,
  select: { width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 4, padding: "8px 12px", fontSize: 14, outline: "none", background: C.white, color: C.text, fontFamily: "inherit" } as React.CSSProperties,
  btn:     { border: "none", borderRadius: 4, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" } as React.CSSProperties,
  primary: { background: C.text, color: C.white } as React.CSSProperties,
  accent:  { background: C.accent, color: C.white } as React.CSSProperties,
  ghost:   { background: "none", border: `1.5px solid ${C.border}`, color: C.text2 } as React.CSSProperties,
  danger:  { background: "none", border: `1.5px solid ${C.border}`, color: C.red } as React.CSSProperties,
  card: { background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: "18px 20px", marginBottom: 10 } as React.CSSProperties,
  form: { background: "#FBF8F4", border: `1.5px solid ${C.accent}40`, borderRadius: 8, padding: 24, marginBottom: 20 } as React.CSSProperties,
  divider: { height: 1, background: C.border, margin: "18px 0" } as React.CSSProperties,
  sectionLabel: { fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: ".08em", textTransform: "uppercase" as const, marginBottom: 12 },
};

// ── Micro components ──────────────────────────────────────────────────────────
const Badge = ({ color, text }: { color: string; text: string }) => (
  <span style={{ display: "inline-block", background: color + "1A", color, border: `1px solid ${color}40`, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600, letterSpacing: ".04em" }}>{text}</span>
);

const Field = ({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) => (
  <div style={{ marginBottom: 14, ...(span2 ? { gridColumn: "span 2" } : {}) }}>
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.text2, marginBottom: 5 }}>{label}</label>
    {children}
  </div>
);

const Grid = ({ cols = 2, children }: { cols?: number; children: React.ReactNode }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14 }}>{children}</div>
);

const InfoChip = ({ label, value, accent, alert }: { label: string; value: string; accent?: boolean; alert?: boolean }) => (
  <div style={{ background: alert ? "#FFF0EE" : accent ? "#FBF4EC" : "#F5F0E8", borderRadius: 4, padding: "8px 12px", fontSize: 12, border: alert ? `1px solid ${C.red}30` : "none" }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 3 }}>{label}</div>
    <div style={{ color: alert ? C.red : accent ? C.accent : C.text, fontWeight: 600 }}>{value}</div>
  </div>
);

// ── Stat card ─────────────────────────────────────────────────────────────────
const Stat = ({ icon, label, value, sub, color = C.text }: { icon: string; label: string; value: string | number; sub?: string; color?: string }) => (
  <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: "18px 20px" }}>
    <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
    <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 13, color: C.text2, marginTop: 5, fontWeight: 500 }}>{label}</div>
    {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</div>}
  </div>
);

// ── Progress bar ──────────────────────────────────────────────────────────────
const ProgressBar = ({ name, phone, actual, target }: { name: string; phone?: string; actual: number; target: number }) => {
  const pct   = target > 0 ? Math.min((actual / target) * 100, 100) : 0;
  const over  = actual > target && target > 0;
  const color = pct < 60 ? C.red : pct < 90 ? C.accent : C.green;
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{name}</span>
          {phone && <span style={{ fontSize: 11, color: C.muted, marginLeft: 8 }}>{phone}</span>}
        </div>
        <div style={{ textAlign: "right", fontSize: 13 }}>
          <span style={{ fontWeight: 700, color }}>{actual.toFixed(1)} kg</span>
          <span style={{ color: C.muted }}> / {target} kg</span>
          {over && <span style={{ color: C.green, marginLeft: 6, fontSize: 11 }}>✓ +{(actual - target).toFixed(1)}</span>}
        </div>
      </div>
      <div style={{ background: "#EAE4DC", borderRadius: 4, height: 7, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width .4s" }} />
      </div>
      <div style={{ fontSize: 11, color, marginTop: 3 }}>{target === 0 ? "Sin compromiso" : `${pct.toFixed(0)}% del compromiso mensual`}</div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function Dashboard({ orders, comodatos, clientes }: { orders: Order[]; comodatos: ComodatoRecord[]; clientes: ClientePropio[] }) {
  const month    = thisMonth();
  const mOrders  = orders.filter(o => o.date.startsWith(month));
  const active   = comodatos.filter(c => c.status === "activo");

  const kpiPedidos   = mOrders.length;
  const kpiKg        = mOrders.reduce((s, o) => s + o.kgCafe, 0);
  const kpiVentas    = mOrders.reduce((s, o) => s + o.total, 0);
  const kpiPendiente = orders.filter(o => o.status === "pendiente").length;
  const kpiClientes  = comodatos.filter(c => c.status === "activo").length + clientes.filter(c => c.status === "activo").length;

  const consumoById: Record<string, number> = {};
  mOrders.forEach(o => { if (o.clientId && o.kgCafe > 0) consumoById[o.clientId] = (consumoById[o.clientId] ?? 0) + o.kgCafe; });

  const allClients = [
    ...comodatos.filter(c => c.status === "activo").map(c => ({ id: c.id, name: c.cafeteria, phone: c.phone, minKg: c.minKgMonth })),
    ...clientes.filter(c => c.status === "activo").map(c => ({ id: c.id, name: c.cafeteria, phone: c.phone, minKg: 0 })),
  ];

  const ranking = [...allClients]
    .map(c => ({ ...c, kg: consumoById[c.id] ?? 0 }))
    .sort((a, b) => b.kg - a.kg)
    .filter(c => c.kg > 0)
    .slice(0, 6);

  const catRevenue: Record<string, number> = {};
  mOrders.forEach(o => o.lines.forEach(l => { catRevenue[l.category] = (catRevenue[l.category] ?? 0) + l.qty * l.unitPrice; }));

  // kg por tipo de café: agrupa por descripción de líneas con categoría "Café" y unidad "kg"
  const kgByCoffee: Record<string, number> = {};
  mOrders.forEach(o =>
    o.lines.filter(l => l.category === "Café" && l.unit === "kg").forEach(l => {
      const key = (l.description || "Sin nombre").trim();
      kgByCoffee[key] = (kgByCoffee[key] ?? 0) + l.qty;
    })
  );
  const coffeeRanking = Object.entries(kgByCoffee).sort((a, b) => b[1] - a[1]);
  const totalKgCoffee = coffeeRanking.reduce((s, [, v]) => s + v, 0);

  const monthLabel = new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Dashboard</h1>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 28 }}>{monthLabel} · resumen general del negocio</p>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 28 }}>
        <Stat icon="📦" label="Pedidos este mes" value={kpiPedidos} />
        <Stat icon="☕" label="Kg café este mes" value={`${kpiKg.toFixed(1)} kg`} color={C.accent} />
        <Stat icon="💰" label="Facturación" value={FMT(kpiVentas)} color={C.green} sub={monthLabel} />
        <Stat icon="⏳" label="Pedidos pendientes" value={kpiPendiente} color={kpiPendiente > 0 ? C.orange : C.text} />
        <Stat icon="👥" label="Clientes activos" value={kpiClientes} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Consumption vs commitment */}
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>Consumo vs. compromiso</h2>
            <span style={{ fontSize: 12, color: C.muted }}>comodatos activos</span>
          </div>
          {active.filter(c => c.minKgMonth > 0).length === 0
            ? <p style={{ fontSize: 13, color: C.muted, padding: "20px 0" }}>Sin comodatos con compromiso definido</p>
            : active.filter(c => c.minKgMonth > 0).map(c => (
                <ProgressBar key={c.id} name={c.cafeteria} phone={c.phone}
                  actual={consumoById[c.id] ?? 0} target={c.minKgMonth} />
              ))
          }
        </div>

        {/* Ranking */}
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>Ranking de clientes</h2>
            <span style={{ fontSize: 12, color: C.muted }}>kg café este mes</span>
          </div>
          {ranking.length === 0
            ? <p style={{ fontSize: 13, color: C.muted, padding: "20px 0" }}>Sin pedidos este mes</p>
            : ranking.map((c, i) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                    background: i === 0 ? C.accent : i === 1 ? "#8B6030" : i === 2 ? C.muted : "#EAE4DC",
                    color: i < 3 ? C.white : C.text2,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700,
                  }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                    {c.phone && <div style={{ fontSize: 11, color: C.muted }}>{c.phone}</div>}
                  </div>
                  <div style={{ fontWeight: 700, color: C.accent }}>{c.kg.toFixed(1)} kg</div>
                </div>
              ))
          }
        </div>
      </div>

      {/* Kg por tipo de café */}
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: 22, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>Kg por tipo de café</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 12, color: C.muted }}>este mes</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: C.accent }}>{totalKgCoffee.toFixed(1)} kg total</span>
          </div>
        </div>
        {coffeeRanking.length === 0
          ? <p style={{ fontSize: 13, color: C.muted }}>Sin pedidos de café este mes</p>
          : coffeeRanking.map(([name, kg], i) => {
              const pct = totalKgCoffee > 0 ? (kg / totalKgCoffee) * 100 : 0;
              const colors = [C.accent, "#8B6030", C.text2, C.muted, "#A08060"];
              const col = colors[Math.min(i, colors.length - 1)];
              return (
                <div key={name} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: col, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{name}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <span style={{ fontSize: 11, color: C.muted }}>{pct.toFixed(1)}%</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: col, minWidth: 60, textAlign: "right" }}>{kg.toFixed(1)} kg</span>
                    </div>
                  </div>
                  <div style={{ background: "#EAE4DC", borderRadius: 4, height: 6 }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: col, borderRadius: 4, transition: "width .4s" }} />
                  </div>
                </div>
              );
            })
        }
      </div>

      {/* Revenue by category */}
      {Object.keys(catRevenue).length > 0 && (
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: 22, marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Facturación por categoría</h2>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {Object.entries(catRevenue).sort((a, b) => b[1] - a[1]).map(([cat, rev]) => {
              const pct = kpiVentas > 0 ? (rev / kpiVentas) * 100 : 0;
              return (
                <div key={cat} style={{ flex: "1 1 130px", background: "#F5F0E8", borderRadius: 6, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{cat}</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{FMT(rev)}</div>
                  <div style={{ fontSize: 11, color: C.accent, marginTop: 2 }}>{pct.toFixed(0)}% del total</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent orders */}
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: 22 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Últimos pedidos</h2>
        {orders.length === 0
          ? <p style={{ fontSize: 13, color: C.muted }}>Sin pedidos registrados</p>
          : [...orders].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map(o => {
              const sc: Record<string, string> = { pendiente: C.orange, confirmado: C.accent, entregado: C.green, cancelado: C.muted };
              return (
                <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 12, color: C.muted, flexShrink: 0, minWidth: 72 }}>{o.date}</div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{o.clientName}</span>
                    {o.kgCafe > 0 && <span style={{ fontSize: 12, color: C.accent, marginLeft: 8 }}>☕ {o.kgCafe} kg</span>}
                  </div>
                  <div style={{ fontWeight: 700 }}>{FMT(o.total)}</div>
                  <Badge color={sc[o.status]} text={o.status.charAt(0).toUpperCase() + o.status.slice(1)} />
                </div>
              );
            })
        }
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CLIENTES (unified)
// ══════════════════════════════════════════════════════════════════════════════
function ClientesSection({ comodatos, clientes, orders, machines, molinos, onGoToComodatos }: {
  comodatos: ComodatoRecord[]; clientes: ClientePropio[]; orders: Order[];
  machines: Machine[]; molinos: Molino[]; onGoToComodatos: () => void;
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "comodato" | "propio">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "activo" | "inactivo">("all");

  const month = thisMonth();
  const consumoById: Record<string, number> = {};
  orders.filter(o => o.date.startsWith(month)).forEach(o => {
    if (o.clientId) consumoById[o.clientId] = (consumoById[o.clientId] ?? 0) + o.kgCafe;
  });
  const lastOrderById: Record<string, string> = {};
  orders.forEach(o => {
    if (o.clientId && (!lastOrderById[o.clientId] || o.date > lastOrderById[o.clientId]))
      lastOrderById[o.clientId] = o.date;
  });

  type UnifiedClient = {
    id: string; name: string; contact: string; phone: string; address: string;
    type: "comodato" | "propio";
    status: string; coffeeBrand: string; kgMonth: number;
    minKgMonth?: number; machineInfo?: string; molinoInfo?: string;
    lastFilterChange?: string; contractSigned?: boolean;
    kgThisMonth: number; lastOrder?: string;
  };

  const allClients: UnifiedClient[] = [
    ...comodatos.map(c => {
      const m = machines.find(x => x.id === c.machineId);
      const mo = molinos.find(x => x.id === c.molinoId);
      return {
        id: c.id, name: c.cafeteria, contact: c.contact, phone: c.phone, address: c.address,
        type: "comodato" as const, status: c.status,
        coffeeBrand: c.coffeeType, kgMonth: c.minKgMonth, minKgMonth: c.minKgMonth,
        machineInfo: m ? `${m.brand} ${m.model}` : undefined,
        molinoInfo: mo ? `${mo.brand} ${mo.model}` : undefined,
        lastFilterChange: c.lastFilterChange,
        contractSigned: c.contractSigned,
        kgThisMonth: consumoById[c.id] ?? 0,
        lastOrder: lastOrderById[c.id],
      };
    }),
    ...clientes.map(c => ({
      id: c.id, name: c.cafeteria, contact: c.contact, phone: c.phone, address: c.address,
      type: "propio" as const, status: c.status,
      coffeeBrand: c.coffeeBrand, kgMonth: c.kgMonth,
      machineInfo: c.machineBrand ? `${c.machineBrand} ${c.machineModel}` : undefined,
      molinoInfo: c.molinoBrand ? `${c.molinoBrand} ${c.molinoModel}` : undefined,
      lastFilterChange: c.lastFilterChange,
      kgThisMonth: consumoById[c.id] ?? 0,
      lastOrder: lastOrderById[c.id],
    })),
  ];

  const visible = allClients.filter(c => {
    const matchType   = typeFilter === "all" || c.type === typeFilter;
    const matchStatus = statusFilter === "all" || (statusFilter === "activo" ? c.status === "activo" : c.status !== "activo");
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    return matchType && matchStatus && matchSearch;
  });

  const totals = { total: allClients.length, activos: allClients.filter(c => c.status === "activo").length, comodatos: comodatos.length, propios: clientes.length };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Clientes</h1>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>Vista unificada de todos tus clientes activos</p>
        </div>
        <button style={{ ...S.btn, ...S.accent }} onClick={onGoToComodatos}>+ Nuevo comodato</button>
      </div>

      {/* KPI strip */}
      <div style={{ display: "flex", gap: 12, margin: "20px 0" }}>
        {[
          { label: "Total clientes", val: totals.total, color: C.text },
          { label: "Activos", val: totals.activos, color: C.green },
          { label: "Comodatos", val: totals.comodatos, color: C.accent },
          { label: "Máquina propia", val: totals.propios, color: C.text2 },
        ].map(k => (
          <div key={k.label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 18px", textAlign: "center", minWidth: 110 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.val}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input
          style={{ ...S.input, maxWidth: 240 }}
          placeholder="Buscar por nombre o teléfono…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={{ display: "flex", background: C.white, border: `1px solid ${C.border}`, borderRadius: 4 }}>
          {(["all", "comodato", "propio"] as const).map(f => (
            <button key={f} onClick={() => setTypeFilter(f)} style={{
              padding: "7px 14px", fontSize: 12, fontFamily: "inherit", cursor: "pointer",
              background: typeFilter === f ? C.text : "none",
              color: typeFilter === f ? C.white : C.text2, border: "none", borderRadius: 3,
            }}>
              {f === "all" ? "Todos" : f === "comodato" ? "Comodatos" : "Máquina propia"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", background: C.white, border: `1px solid ${C.border}`, borderRadius: 4 }}>
          {(["all", "activo", "inactivo"] as const).map(f => (
            <button key={f} onClick={() => setStatusFilter(f)} style={{
              padding: "7px 14px", fontSize: 12, fontFamily: "inherit", cursor: "pointer",
              background: statusFilter === f ? C.text : "none",
              color: statusFilter === f ? C.white : C.text2, border: "none", borderRadius: 3,
            }}>
              {f === "all" ? "Todos" : f === "activo" ? "Activos" : "Inactivos"}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: C.muted }}>{visible.length} resultado{visible.length !== 1 ? "s" : ""}</span>
      </div>

      {visible.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>👥</div>
          <p>Sin clientes que coincidan</p>
        </div>
      )}

      {visible.map(cli => {
        const fd = daysSince(cli.lastFilterChange ?? "");
        const filterAlert = fd !== null && fd > 180;
        const statusColor = cli.status === "activo" ? C.green : cli.status === "suspendido" ? C.orange : C.muted;
        const consumoPct  = cli.minKgMonth && cli.minKgMonth > 0 ? Math.min((cli.kgThisMonth / cli.minKgMonth) * 100, 100) : null;
        const consumoColor = consumoPct === null ? C.muted : consumoPct < 60 ? C.red : consumoPct < 90 ? C.accent : C.green;

        return (
          <div key={cli.id} style={S.card}>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                {/* Name + badges */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{cli.name}</span>
                  <Badge color={statusColor} text={cli.status.charAt(0).toUpperCase() + cli.status.slice(1)} />
                  <Badge color={cli.type === "comodato" ? C.accent : C.text2} text={cli.type === "comodato" ? "Comodato" : "Máq. propia"} />
                  {cli.contractSigned !== undefined && cli.contractSigned && <Badge color={C.green} text="✓ Contrato" />}
                  {filterAlert && <Badge color={C.red} text="⚠ Filtro +180d" />}
                </div>

                {/* Contact */}
                <div style={{ display: "flex", gap: 16, fontSize: 13, color: C.text2, marginBottom: 12, flexWrap: "wrap" }}>
                  {cli.contact  && <span>👤 {cli.contact}</span>}
                  {cli.phone    && <span>📞 {cli.phone}</span>}
                  {cli.address  && <span>📍 {cli.address}</span>}
                </div>

                {/* Data chips */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <InfoChip label="Café" value={cli.coffeeBrand || "—"} />
                  {cli.minKgMonth && cli.minKgMonth > 0
                    ? <InfoChip label="Compromiso" value={`${cli.minKgMonth} kg/mes`} accent />
                    : <InfoChip label="Consumo est." value={`${cli.kgMonth} kg/mes`} />
                  }
                  {cli.machineInfo && <InfoChip label="Máquina" value={cli.machineInfo} />}
                  {cli.molinoInfo  && <InfoChip label="Molino" value={cli.molinoInfo} />}
                  {fd !== null && <InfoChip label="Filtro agua" value={`${fd} días`} alert={filterAlert} />}
                  {cli.lastOrder   && <InfoChip label="Último pedido" value={cli.lastOrder} />}
                </div>
              </div>

              {/* Consumption meter */}
              {consumoPct !== null && (
                <div style={{ width: 160, flexShrink: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Consumo este mes</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: consumoColor, marginBottom: 4 }}>{cli.kgThisMonth.toFixed(1)} kg</div>
                  <div style={{ background: "#EAE4DC", borderRadius: 4, height: 6, marginBottom: 4 }}>
                    <div style={{ height: "100%", width: `${consumoPct}%`, background: consumoColor, borderRadius: 4 }} />
                  </div>
                  <div style={{ fontSize: 11, color: consumoColor }}>{consumoPct.toFixed(0)}% del compromiso</div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PEDIDOS
// ══════════════════════════════════════════════════════════════════════════════
function PedidosSection({ orders, setOrders, comodatos, clientes }: {
  orders: Order[]; setOrders: (v: Order[]) => void;
  comodatos: ComodatoRecord[]; clientes: ClientePropio[];
}) {
  const [adding, setAdding]   = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [statusF, setStatusF] = useState<"all" | Order["status"]>("all");
  const [search, setSearch]   = useState("");

  const persist = (l: Order[]) => { setOrders(l); try { localStorage.setItem(KEY_ORDERS, JSON.stringify(l)); } catch { /**/ } };
  const onSave  = (d: Omit<Order, "id">) => { persist([...orders, { ...d, id: uid() }]); setAdding(false); };
  const onEdit  = (d: Omit<Order, "id">) => { persist(orders.map(o => o.id === editing ? { ...d, id: editing! } : o)); setEditing(null); };
  const onDel   = (id: string) => { if (!confirm("¿Eliminar?")) return; persist(orders.filter(o => o.id !== id)); };

  const SC: Record<string, string> = { pendiente: C.orange, confirmado: C.accent, entregado: C.green, cancelado: C.muted };

  const visible = orders
    .filter(o => statusF === "all" || o.status === statusF)
    .filter(o => !search || o.clientName.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Pedidos</h1>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>Pedidos recibidos desde el catálogo</p>
        </div>
        <button style={{ ...S.btn, ...S.accent }} onClick={() => { setAdding(true); setEditing(null); }}>+ Nuevo manual</button>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 12, margin: "20px 0", flexWrap: "wrap" }}>
        {(["pendiente", "confirmado", "entregado", "cancelado"] as const).map(s => (
          <div key={s} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 18px", textAlign: "center", minWidth: 110, cursor: "pointer" }} onClick={() => setStatusF(statusF === s ? "all" : s)}>
            <div style={{ fontSize: 22, fontWeight: 700, color: SC[s] }}>{orders.filter(o => o.status === s).length}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{s.charAt(0).toUpperCase() + s.slice(1)}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input style={{ ...S.input, maxWidth: 220 }} placeholder="Buscar cliente…" value={search} onChange={e => setSearch(e.target.value)} />
        <div style={{ display: "flex", background: C.white, border: `1px solid ${C.border}`, borderRadius: 4 }}>
          {(["all", "pendiente", "confirmado", "entregado", "cancelado"] as const).map(f => (
            <button key={f} onClick={() => setStatusF(f)} style={{
              padding: "7px 13px", fontSize: 12, fontFamily: "inherit", cursor: "pointer",
              background: statusF === f ? C.text : "none", color: statusF === f ? C.white : C.text2, border: "none", borderRadius: 3,
            }}>{f === "all" ? "Todos" : f.charAt(0).toUpperCase() + f.slice(1)}</button>
          ))}
        </div>
      </div>

      {adding && <OrderForm comodatos={comodatos} clientes={clientes} onSave={onSave} onCancel={() => setAdding(false)} />}

      {visible.length === 0 && !adding && (
        <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📦</div>
          <p>Sin pedidos{statusF !== "all" ? ` "${statusF}"` : ""}</p>
        </div>
      )}

      {visible.map(o => editing === o.id
        ? <OrderForm key={o.id} initial={o} comodatos={comodatos} clientes={clientes} onSave={onEdit} onCancel={() => setEditing(null)} />
        : (
          <div key={o.id} style={S.card}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{o.clientName}</span>
                  <Badge color={SC[o.status]} text={o.status.charAt(0).toUpperCase() + o.status.slice(1)} />
                  <span style={{ fontSize: 12, color: C.muted }}>{o.date}</span>
                  {o.kgCafe > 0 && <span style={{ fontSize: 12, color: C.accent }}>☕ {o.kgCafe.toFixed(1)} kg</span>}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  {o.lines.map(l => (
                    <span key={l.id} style={{ fontSize: 12, background: "#F5F0E8", borderRadius: 3, padding: "3px 9px" }}>
                      {l.description || l.category} × {l.qty} {l.unit}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{FMT(o.total)}</div>
                {o.notes && <p style={{ fontSize: 12, color: C.muted, marginTop: 5 }}>{o.notes}</p>}
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                {/* Quick status change */}
                {o.status === "pendiente" && (
                  <button style={{ ...S.btn, background: C.green, color: C.white, padding: "6px 12px", fontSize: 12 }}
                    onClick={() => persist(orders.map(x => x.id === o.id ? { ...x, status: "confirmado" } : x))}>
                    Confirmar
                  </button>
                )}
                {o.status === "confirmado" && (
                  <button style={{ ...S.btn, background: C.green, color: C.white, padding: "6px 12px", fontSize: 12 }}
                    onClick={() => persist(orders.map(x => x.id === o.id ? { ...x, status: "entregado" } : x))}>
                    Entregar
                  </button>
                )}
                <button style={{ ...S.btn, ...S.ghost, padding: "6px 13px" }} onClick={() => { setEditing(o.id); setAdding(false); }}>Editar</button>
                <button style={{ ...S.btn, ...S.danger, padding: "6px 13px" }} onClick={() => onDel(o.id)}>×</button>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}

// ── Order form ────────────────────────────────────────────────────────────────
function OrderForm({ initial, comodatos, clientes, onSave, onCancel }: {
  initial?: Order; comodatos: ComodatoRecord[]; clientes: ClientePropio[];
  onSave: (o: Omit<Order, "id">) => void; onCancel: () => void;
}) {
  const [form, setForm] = useState({ date: initial?.date ?? new Date().toISOString().slice(0, 10), clientId: initial?.clientId ?? "", clientName: initial?.clientName ?? "", clientType: initial?.clientType ?? "otro" as Order["clientType"], status: initial?.status ?? "pendiente" as Order["status"], notes: initial?.notes ?? "" });
  const [lines, setLines] = useState<OrderLine[]>(initial?.lines ?? [{ id: uid(), description: "", category: "Café", qty: 1, unit: "kg", unitPrice: 0 }]);

  const allC = [
    ...comodatos.filter(c => c.status === "activo").map(c => ({ id: c.id, name: c.cafeteria, type: "comodato" as const })),
    ...clientes.filter(c => c.status === "activo").map(c => ({ id: c.id, name: c.cafeteria, type: "propio" as const })),
  ];

  const selectC = (id: string) => {
    if (!id) { setForm(f => ({ ...f, clientId: "", clientName: "", clientType: "otro" })); return; }
    const c = allC.find(x => x.id === id);
    if (c) setForm(f => ({ ...f, clientId: c.id, clientName: c.name, clientType: c.type }));
  };

  const setLine = (idx: number, k: keyof OrderLine, v: string | number) =>
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [k]: v } : l));

  const total  = calcTotal(lines);
  const kgCafe = calcKg(lines);

  return (
    <div style={S.form}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 18 }}>{initial ? "Editar pedido" : "Nuevo pedido"}</h3>
      <Grid>
        <Field label="Cliente">
          <select style={S.select} value={form.clientId} onChange={e => selectC(e.target.value)}>
            <option value="">— No registrado —</option>
            <optgroup label="Comodatos">
              {comodatos.filter(c => c.status === "activo").map(c => <option key={c.id} value={c.id}>{c.cafeteria}</option>)}
            </optgroup>
            <optgroup label="Solo consumo">
              {clientes.filter(c => c.status === "activo").map(c => <option key={c.id} value={c.id}>{c.cafeteria}</option>)}
            </optgroup>
          </select>
        </Field>
        <Field label={form.clientId ? "Nombre" : "Nombre *"}>
          <input style={S.input} value={form.clientName} readOnly={!!form.clientId}
            onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} placeholder="ej. Café Amaranto" />
        </Field>
        <Field label="Fecha"><input style={S.input} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></Field>
        <Field label="Estado">
          <select style={S.select} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Order["status"] }))}>
            <option value="pendiente">Pendiente</option><option value="confirmado">Confirmado</option>
            <option value="entregado">Entregado</option><option value="cancelado">Cancelado</option>
          </select>
        </Field>
      </Grid>
      {/* Lines */}
      <div style={{ marginTop: 4, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={S.sectionLabel}>Líneas del pedido</div>
          <button style={{ ...S.btn, ...S.ghost, padding: "5px 12px", fontSize: 12 }} onClick={() => setLines(l => [...l, { id: uid(), description: "", category: "Café", qty: 1, unit: "kg", unitPrice: 0 }])}>+ Línea</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr .8fr .8fr 1fr auto", gap: 8, marginBottom: 6 }}>
          {["Descripción", "Categoría", "Cantidad", "Unidad", "Precio u.", ""].map(h => <div key={h} style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".05em" }}>{h}</div>)}
        </div>
        {lines.map((l, i) => (
          <div key={l.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr .8fr .8fr 1fr auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <input style={S.input} value={l.description} onChange={e => setLine(i, "description", e.target.value)} placeholder="ej. Blend Espresso 1 kg" />
            <select style={S.select} value={l.category} onChange={e => setLine(i, "category", e.target.value)}>
              {["Café", "Syrups", "Salsas", "Accesorios", "Otro"].map(c => <option key={c}>{c}</option>)}
            </select>
            <input style={{ ...S.input, textAlign: "right" }} type="number" min={0} step={.5} value={l.qty} onChange={e => setLine(i, "qty", parseFloat(e.target.value) || 0)} />
            <select style={S.select} value={l.unit} onChange={e => setLine(i, "unit", e.target.value)}>
              {["kg", "u.", "botella", "caja"].map(u => <option key={u}>{u}</option>)}
            </select>
            <input style={{ ...S.input, textAlign: "right" }} type="number" min={0} value={l.unitPrice} onChange={e => setLine(i, "unitPrice", parseFloat(e.target.value) || 0)} />
            <button onClick={() => setLines(l2 => l2.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#CCC", fontSize: 18, cursor: "pointer" }}>×</button>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 20, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
          {kgCafe > 0 && <span style={{ fontSize: 13, color: C.accent }}>☕ {kgCafe.toFixed(1)} kg café</span>}
          <span style={{ fontSize: 15, fontWeight: 700 }}>Total: {FMT(total)}</span>
        </div>
      </div>
      <Field label="Notas"><textarea style={{ ...S.input, height: 56, resize: "vertical" }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></Field>
      <div style={{ display: "flex", gap: 10 }}>
        <button style={{ ...S.btn, ...S.primary }} disabled={!form.clientName.trim()} onClick={() => form.clientName.trim() && onSave({ ...form, lines, total, kgCafe })}>Guardar</button>
        <button style={{ ...S.btn, ...S.ghost }} onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMODATOS
// ══════════════════════════════════════════════════════════════════════════════
function ComodatosSection({ records, setRecords, machines, molinos }: {
  records: ComodatoRecord[]; setRecords: (v: ComodatoRecord[]) => void;
  machines: Machine[]; molinos: Molino[];
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "activo" | "suspendido" | "finalizado">("all");

  const persist = (l: ComodatoRecord[]) => { setRecords(l); try { localStorage.setItem(KEY_COMODATOS, JSON.stringify(l)); } catch { /**/ } };
  const onSave  = (d: Omit<ComodatoRecord, "id">) => { persist([...records, { ...d, id: uid() }]); setAdding(false); };
  const onEdit  = (d: Omit<ComodatoRecord, "id">) => { persist(records.map(r => r.id === editing ? { ...d, id: editing! } : r)); setEditing(null); };
  const onDel   = (id: string) => { if (!confirm("¿Eliminar?")) return; persist(records.filter(r => r.id !== id)); };

  const CC: Record<string, string> = { activo: C.green, suspendido: C.orange, finalizado: C.muted };
  const visible = filter === "all" ? records : records.filter(r => r.status === filter);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Comodatos</h1>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>Máquinas entregadas en comodato a cafeterías</p>
        </div>
        <button style={{ ...S.btn, ...S.accent }} onClick={() => { setAdding(true); setEditing(null); }}>+ Nuevo comodato</button>
      </div>
      <div style={{ display: "flex", gap: 12, margin: "20px 0" }}>
        {(["activo", "suspendido", "finalizado"] as const).map(k => (
          <div key={k} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 18px", textAlign: "center", minWidth: 110 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: CC[k] }}>{records.filter(r => r.status === k).length}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{k.charAt(0).toUpperCase() + k.slice(1)}{k !== "finalizado" ? "s" : "s"}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 0, marginBottom: 20, background: C.white, border: `1px solid ${C.border}`, borderRadius: 4, width: "fit-content" }}>
        {(["all", "activo", "suspendido", "finalizado"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "7px 16px", fontSize: 12, fontFamily: "inherit", cursor: "pointer", background: filter === f ? C.text : "none", color: filter === f ? C.white : C.text2, border: "none", borderRadius: 3 }}>
            {f === "all" ? "Todos" : f.charAt(0).toUpperCase() + f.slice(1) + "s"}
          </button>
        ))}
      </div>
      {adding && <ComodatoForm machines={machines} molinos={molinos} onSave={onSave} onCancel={() => setAdding(false)} />}
      {visible.length === 0 && !adding && <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}><div style={{ fontSize: 40, marginBottom: 10 }}>☕</div><p>Sin comodatos</p></div>}
      {visible.map(rec => {
        const machine = machines.find(m => m.id === rec.machineId);
        const molino  = molinos.find(m => m.id === rec.molinoId);
        const fd = rec.lastFilterChange ? Math.floor((Date.now() - new Date(rec.lastFilterChange).getTime()) / 86400000) : null;
        return editing === rec.id
          ? <ComodatoForm key={rec.id} initial={rec} machines={machines} molinos={molinos} onSave={onEdit} onCancel={() => setEditing(null)} />
          : (
            <div key={rec.id} style={S.card}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 16, fontWeight: 700 }}>{rec.cafeteria}</span>
                    <Badge color={CC[rec.status]} text={rec.status.charAt(0).toUpperCase() + rec.status.slice(1)} />
                    {rec.contractSigned && <Badge color={C.green} text="✓ Contrato" />}
                    {fd !== null && fd > 180 && <Badge color={C.red} text="⚠ Filtro +180d" />}
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 13, color: C.text2, marginBottom: 10, flexWrap: "wrap" }}>
                    {rec.contact && <span>👤 {rec.contact}</span>}
                    {rec.phone   && <span>📞 {rec.phone}</span>}
                    {rec.address && <span>📍 {rec.address}</span>}
                    {rec.installDate && <span>📅 {rec.installDate}</span>}
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <InfoChip label="Máquina" value={machine ? `${machine.brand} ${machine.model}` : "—"} />
                    <InfoChip label="Molino"  value={molino  ? `${molino.brand} ${molino.model}` : "—"} />
                    <InfoChip label="Compromiso" value={`${rec.minKgMonth} kg/mes`} accent />
                    <InfoChip label="Café" value={rec.coffeeType || "—"} />
                    {fd !== null && <InfoChip label="Filtro agua" value={`${fd} días`} alert={fd > 180} />}
                  </div>
                  {rec.contractFileData && <a href={rec.contractFileData} download={rec.contractFileName} style={{ fontSize: 12, color: C.accent, display: "inline-flex", gap: 4, marginTop: 10 }}>📎 {rec.contractFileName}</a>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ ...S.btn, ...S.ghost, padding: "6px 14px" }} onClick={() => { setEditing(rec.id); setAdding(false); }}>Editar</button>
                  <button style={{ ...S.btn, ...S.danger, padding: "6px 14px" }} onClick={() => onDel(rec.id)}>×</button>
                </div>
              </div>
            </div>
          );
      })}
    </div>
  );
}

// ── Comodato form ─────────────────────────────────────────────────────────────
const BLANK_COM: Omit<ComodatoRecord, "id"> = {
  cafeteria: "", contact: "", phone: "", address: "", machineId: "", molinoId: "",
  installDate: new Date().toISOString().slice(0, 10), minKgMonth: 5, coffeeType: "", lastFilterChange: "",
  contractSigned: false, contractFileName: "", contractFileData: "", status: "activo", notes: "",
};

function ComodatoForm({ initial, machines, molinos, onSave, onCancel }: {
  initial?: ComodatoRecord; machines: Machine[]; molinos: Molino[];
  onSave: (d: Omit<ComodatoRecord, "id">) => void; onCancel: () => void;
}) {
  const [form, setForm] = useState<Omit<ComodatoRecord, "id">>(initial ? { ...initial } : { ...BLANK_COM });
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof BLANK_COM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const avM  = machines.filter(m => m.status === "disponible" || m.id === form.machineId);
  const avMo = molinos.filter(m => m.status === "disponible" || m.id === form.molinoId);

  return (
    <div style={S.form}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 18 }}>{initial ? "Editar comodato" : "Nuevo comodato"}</h3>
      <div style={S.sectionLabel}>Cliente</div>
      <Grid><Field label="Cafetería *"><input style={S.input} value={form.cafeteria} onChange={set("cafeteria")} /></Field><Field label="Contacto"><input style={S.input} value={form.contact} onChange={set("contact")} /></Field><Field label="Teléfono"><input style={S.input} value={form.phone} onChange={set("phone")} /></Field><Field label="Dirección"><input style={S.input} value={form.address} onChange={set("address")} /></Field></Grid>
      <div style={S.divider} />
      <div style={S.sectionLabel}>Equipos</div>
      <Grid>
        <Field label="Máquina"><select style={S.select} value={form.machineId} onChange={set("machineId")}><option value="">— Sin asignar —</option>{avM.map(m => <option key={m.id} value={m.id}>{m.brand} {m.model} · {m.serial}</option>)}</select></Field>
        <Field label="Molino"><select style={S.select} value={form.molinoId} onChange={set("molinoId")}><option value="">— Sin asignar —</option>{avMo.map(m => <option key={m.id} value={m.id}>{m.brand} {m.model} · {m.serial}</option>)}</select></Field>
        <Field label="Instalación"><input style={S.input} type="date" value={form.installDate} onChange={set("installDate")} /></Field>
        <Field label="Estado"><select style={S.select} value={form.status} onChange={set("status")}><option value="activo">Activo</option><option value="suspendido">Suspendido</option><option value="finalizado">Finalizado</option></select></Field>
      </Grid>
      <div style={S.divider} />
      <div style={S.sectionLabel}>Consumo</div>
      <Grid>
        <Field label="Mínimo kg/mes"><input style={S.input} type="number" min={0} step={.5} value={form.minKgMonth} onChange={e => setForm(f => ({ ...f, minKgMonth: parseFloat(e.target.value) || 0 }))} /></Field>
        <Field label="Café que consume"><input style={S.input} value={form.coffeeType} onChange={set("coffeeType")} /></Field>
        <Field label="Último filtro de agua"><input style={S.input} type="date" value={form.lastFilterChange} onChange={set("lastFilterChange")} /></Field>
      </Grid>
      <div style={S.divider} />
      <div style={S.sectionLabel}>Contrato</div>
      <Grid>
        <Field label="Estado"><label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, cursor: "pointer" }}><input type="checkbox" checked={form.contractSigned} onChange={e => setForm(f => ({ ...f, contractSigned: e.target.checked }))} style={{ width: 16, height: 16 }} /><span style={{ fontSize: 13 }}>Firmado y recibido</span></label></Field>
        <Field label="PDF del contrato">
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.png" style={{ display: "none" }} onChange={e => {
            const file = e.target.files?.[0];
            if (!file || file.size > 5 * 1024 * 1024) return;
            const r = new FileReader(); r.onload = ev => setForm(f => ({ ...f, contractFileName: file.name, contractFileData: ev.target?.result as string ?? "" })); r.readAsDataURL(file);
          }} />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button type="button" style={{ ...S.btn, ...S.ghost, padding: "7px 14px" }} onClick={() => fileRef.current?.click()}>{form.contractFileName ? "Cambiar" : "Subir PDF"}</button>
            {form.contractFileName && <span style={{ fontSize: 12 }}>📎 {form.contractFileName}</span>}
          </div>
        </Field>
      </Grid>
      <Field label="Notas"><textarea style={{ ...S.input, height: 56, resize: "vertical" }} value={form.notes} onChange={set("notes")} /></Field>
      <div style={{ display: "flex", gap: 10 }}>
        <button style={{ ...S.btn, ...S.primary }} disabled={!form.cafeteria.trim()} onClick={() => form.cafeteria.trim() && onSave(form)}>Guardar</button>
        <button style={{ ...S.btn, ...S.ghost }} onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CLIENTES PROPIOS
// ══════════════════════════════════════════════════════════════════════════════
const BLANK_CLI: Omit<ClientePropio, "id"> = {
  cafeteria: "", contact: "", phone: "", address: "", coffeeBrand: "", kgMonth: 0, lastFilterChange: "",
  machineBrand: "", machineModel: "", machineSerial: "", molinoBrand: "", molinoModel: "", molinoSerial: "", status: "activo", notes: "",
};

function SoloConsumoSection({ clientes, setClientes }: { clientes: ClientePropio[]; setClientes: (v: ClientePropio[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const persist = (l: ClientePropio[]) => { setClientes(l); try { localStorage.setItem(KEY_CLIENTES, JSON.stringify(l)); } catch { /**/ } };
  const onSave  = (d: Omit<ClientePropio, "id">) => { persist([...clientes, { ...d, id: uid() }]); setAdding(false); };
  const onEdit  = (d: Omit<ClientePropio, "id">) => { persist(clientes.map(c => c.id === editing ? { ...d, id: editing! } : c)); setEditing(null); };
  const onDel   = (id: string) => { if (!confirm("¿Eliminar?")) return; persist(clientes.filter(c => c.id !== id)); };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Solo consumo</h1>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>Clientes con máquina propia que compran café y productos</p>
        </div>
        <button style={{ ...S.btn, ...S.accent }} onClick={() => { setAdding(true); setEditing(null); }}>+ Nuevo cliente</button>
      </div>
      <div style={{ display: "flex", gap: 12, margin: "20px 0" }}>
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 18px", textAlign: "center" }}><div style={{ fontSize: 22, fontWeight: 700 }}>{clientes.length}</div><div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Total</div></div>
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 18px", textAlign: "center" }}><div style={{ fontSize: 22, fontWeight: 700, color: C.green }}>{clientes.filter(c => c.status === "activo").length}</div><div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Activos</div></div>
      </div>
      {adding && <SoloConsumoForm onSave={onSave} onCancel={() => setAdding(false)} />}
      {clientes.length === 0 && !adding && <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}><div style={{ fontSize: 40, marginBottom: 10 }}>🏪</div><p>Sin clientes registrados</p></div>}
      {clientes.map(cli => {
        const fd = daysSince(cli.lastFilterChange);
        return editing === cli.id
          ? <SoloConsumoForm key={cli.id} initial={cli} onSave={onEdit} onCancel={() => setEditing(null)} />
          : (
            <div key={cli.id} style={S.card}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{cli.cafeteria}</span>
                    <Badge color={cli.status === "activo" ? C.green : C.muted} text={cli.status === "activo" ? "Activo" : "Inactivo"} />
                    {fd !== null && fd > 180 && <Badge color={C.red} text="⚠ Filtro +180d" />}
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 13, color: C.text2, marginBottom: 10, flexWrap: "wrap" }}>
                    {cli.contact && <span>👤 {cli.contact}</span>}
                    {cli.phone   && <span>📞 {cli.phone}</span>}
                    {cli.address && <span>📍 {cli.address}</span>}
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <InfoChip label="Café" value={cli.coffeeBrand || "—"} />
                    <InfoChip label="Consumo" value={`${cli.kgMonth} kg/mes`} />
                    {fd !== null && <InfoChip label="Filtro agua" value={`${fd} días`} alert={fd > 180} />}
                    {cli.machineBrand && <InfoChip label="Máquina" value={`${cli.machineBrand} ${cli.machineModel}`} />}
                    {cli.molinoBrand  && <InfoChip label="Molino" value={`${cli.molinoBrand} ${cli.molinoModel}`} />}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ ...S.btn, ...S.ghost, padding: "6px 14px" }} onClick={() => { setEditing(cli.id); setAdding(false); }}>Editar</button>
                  <button style={{ ...S.btn, ...S.danger, padding: "6px 14px" }} onClick={() => onDel(cli.id)}>×</button>
                </div>
              </div>
            </div>
          );
      })}
    </div>
  );
}

function SoloConsumoForm({ initial, onSave, onCancel }: { initial?: ClientePropio; onSave: (d: Omit<ClientePropio, "id">) => void; onCancel: () => void }) {
  const [form, setForm] = useState(initial ? { ...initial } : { ...BLANK_CLI });
  const set = (k: keyof typeof BLANK_CLI) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <div style={S.form}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 18 }}>{initial ? "Editar cliente" : "Nuevo cliente"}</h3>
      <Grid><Field label="Cafetería *"><input style={S.input} value={form.cafeteria} onChange={set("cafeteria")} /></Field><Field label="Contacto"><input style={S.input} value={form.contact} onChange={set("contact")} /></Field><Field label="Teléfono"><input style={S.input} value={form.phone} onChange={set("phone")} /></Field><Field label="Dirección"><input style={S.input} value={form.address} onChange={set("address")} /></Field></Grid>
      <div style={S.divider} />
      <Grid>
        <Field label="Café que consume"><input style={S.input} value={form.coffeeBrand} onChange={set("coffeeBrand")} /></Field>
        <Field label="kg/mes promedio"><input style={S.input} type="number" min={0} step={.5} value={form.kgMonth} onChange={e => setForm(f => ({ ...f, kgMonth: parseFloat(e.target.value) || 0 }))} /></Field>
        <Field label="Último filtro de agua"><input style={S.input} type="date" value={form.lastFilterChange} onChange={set("lastFilterChange")} /></Field>
        <Field label="Estado"><select style={S.select} value={form.status} onChange={set("status")}><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></Field>
      </Grid>
      <div style={S.divider} />
      <Grid cols={3}>
        <Field label="Marca máquina"><input style={S.input} value={form.machineBrand} onChange={set("machineBrand")} /></Field>
        <Field label="Modelo"><input style={S.input} value={form.machineModel} onChange={set("machineModel")} /></Field>
        <Field label="Serie"><input style={S.input} value={form.machineSerial} onChange={set("machineSerial")} /></Field>
        <Field label="Marca molino"><input style={S.input} value={form.molinoBrand} onChange={set("molinoBrand")} /></Field>
        <Field label="Modelo"><input style={S.input} value={form.molinoModel} onChange={set("molinoModel")} /></Field>
        <Field label="Serie"><input style={S.input} value={form.molinoSerial} onChange={set("molinoSerial")} /></Field>
      </Grid>
      <Field label="Notas"><textarea style={{ ...S.input, height: 56, resize: "vertical" }} value={form.notes} onChange={set("notes")} /></Field>
      <div style={{ display: "flex", gap: 10 }}>
        <button style={{ ...S.btn, ...S.primary }} disabled={!form.cafeteria.trim()} onClick={() => form.cafeteria.trim() && onSave(form)}>Guardar</button>
        <button style={{ ...S.btn, ...S.ghost }} onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EQUIPMENT (shared)
// ══════════════════════════════════════════════════════════════════════════════
function MaintenanceSection({ maintenances, onChange }: { maintenances: Maintenance[]; onChange: (l: Maintenance[]) => void }) {
  const [open, setOpen] = useState(false);
  const blank = { date: new Date().toISOString().slice(0, 10), type: "Preventivo", description: "", technician: "" };
  const [form, setForm] = useState(blank);
  const add = () => { if (!form.description.trim()) return; onChange([...maintenances, { ...form, id: uid() }]); setForm(blank); setOpen(false); };
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={S.sectionLabel}>Mantenimientos ({maintenances.length})</div>
        <button style={{ ...S.btn, ...S.ghost, padding: "5px 12px", fontSize: 12 }} onClick={() => setOpen(o => !o)}>{open ? "Cancelar" : "+ Registrar"}</button>
      </div>
      {open && (
        <div style={{ background: "#F8F4EF", borderRadius: 4, padding: 14, marginBottom: 10 }}>
          <Grid>
            <Field label="Fecha"><input style={S.input} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></Field>
            <Field label="Tipo"><select style={S.select} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>{["Preventivo", "Correctivo", "Limpieza", "Cambio de pieza", "Calibración", "Otro"].map(t => <option key={t}>{t}</option>)}</select></Field>
          </Grid>
          <Field label="Descripción *"><textarea style={{ ...S.input, height: 56, resize: "vertical" }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></Field>
          <Field label="Técnico"><input style={S.input} value={form.technician} onChange={e => setForm(f => ({ ...f, technician: e.target.value }))} /></Field>
          <button style={{ ...S.btn, ...S.primary }} onClick={add}>Guardar</button>
        </div>
      )}
      {maintenances.length === 0 ? <p style={{ fontSize: 12, color: C.muted }}>Sin mantenimientos</p>
        : [...maintenances].reverse().map(m => (
          <div key={m.id} style={{ display: "flex", gap: 12, paddingBottom: 10, marginBottom: 10, borderBottom: `1px solid #EDE8E0` }}>
            <div style={{ minWidth: 52, fontSize: 11, color: C.muted }}>{m.date}</div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 11, background: "#F0EBE3", color: C.text2, borderRadius: 2, padding: "1px 7px", fontWeight: 600 }}>{m.type}</span>
              <p style={{ fontSize: 13, marginTop: 4 }}>{m.description}</p>
              {m.technician && <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Técnico: {m.technician}</p>}
            </div>
            <button onClick={() => onChange(maintenances.filter(x => x.id !== m.id))} style={{ background: "none", border: "none", color: "#CCC", fontSize: 16, cursor: "pointer" }}>×</button>
          </div>
        ))
      }
    </div>
  );
}

function EquipFormPanel<T extends Machine | Molino>({ initial, onSave, onCancel, title }: { initial?: T; onSave: (d: Omit<T, "id">) => void; onCancel: () => void; title: string }) {
  const EL: Record<EquipStatus, string> = { disponible: "Disponible", en_comodato: "En comodato", mantenimiento: "Mantenimiento", baja: "Baja" };
  const blank = { brand: "", model: "", serial: "", status: "disponible" as EquipStatus, notes: "", maintenances: [] as Maintenance[] };
  const [form, setForm] = useState(initial ? { ...blank, ...initial } : { ...blank });
  return (
    <div style={S.form}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 18 }}>{title}</h3>
      <Grid>
        <Field label="Marca *"><input style={S.input} value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} /></Field>
        <Field label="Modelo *"><input style={S.input} value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} /></Field>
        <Field label="N° de serie *"><input style={S.input} value={form.serial} onChange={e => setForm(f => ({ ...f, serial: e.target.value }))} /></Field>
        <Field label="Estado"><select style={S.select} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as EquipStatus }))}>{(Object.keys(EL) as EquipStatus[]).map(k => <option key={k} value={k}>{EL[k]}</option>)}</select></Field>
      </Grid>
      <Field label="Notas"><textarea style={{ ...S.input, height: 56, resize: "vertical" }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></Field>
      <div style={S.divider} />
      <MaintenanceSection maintenances={form.maintenances} onChange={list => setForm(f => ({ ...f, maintenances: list }))} />
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button style={{ ...S.btn, ...S.primary }} disabled={!form.brand || !form.model || !form.serial} onClick={() => (form.brand && form.model && form.serial) && onSave(form as Omit<T, "id">)}>Guardar</button>
        <button style={{ ...S.btn, ...S.ghost }} onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

function EquipSection<T extends Machine | Molino>({ items, setItems, storageKey, noun, title, description }: {
  items: T[]; setItems: (v: T[]) => void; storageKey: string; noun: string; title: string; description: string;
}) {
  const EL: Record<EquipStatus, string> = { disponible: "Disponible", en_comodato: "En comodato", mantenimiento: "Mantenimiento", baja: "Baja" };
  const EC: Record<EquipStatus, string> = { disponible: C.green, en_comodato: C.accent, mantenimiento: "#8B5010", baja: C.muted };
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const persist = (l: T[]) => { setItems(l); try { localStorage.setItem(storageKey, JSON.stringify(l)); } catch { /**/ } };
  const onAdd   = (d: Omit<T, "id">) => { persist([...items, { ...d, id: uid() } as T]); setAdding(false); };
  const onEdit  = (d: Omit<T, "id">) => { persist(items.map(i => i.id === editing ? { ...d, id: editing } as T : i)); setEditing(null); };
  const onDel   = (id: string) => { if (!confirm("¿Eliminar?")) return; persist(items.filter(i => i.id !== id)); };
  const updM    = (id: string, list: Maintenance[]) => persist(items.map(i => i.id === id ? { ...i, maintenances: list } : i));
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
        <div><h1 style={{ fontSize: 20, fontWeight: 700 }}>{title}</h1><p style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{description}</p></div>
        <button style={{ ...S.btn, ...S.accent }} onClick={() => { setAdding(true); setEditing(null); }}>+ Agregar {noun}</button>
      </div>
      <div style={{ display: "flex", gap: 12, margin: "20px 0" }}>
        {(Object.keys(EL) as EquipStatus[]).map(k => (
          <div key={k} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 18px", textAlign: "center", minWidth: 110 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: EC[k] }}>{items.filter(i => i.status === k).length}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{EL[k]}</div>
          </div>
        ))}
      </div>
      {adding && <EquipFormPanel title={`Nueva ${noun}`} onSave={onAdd as (d: Omit<Machine | Molino, "id">) => void} onCancel={() => setAdding(false)} />}
      {items.length === 0 && !adding && <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}><div style={{ fontSize: 40, marginBottom: 10 }}>📦</div><p>Sin {noun}s registradas</p></div>}
      {items.map(item => editing === item.id
        ? <EquipFormPanel key={item.id} title={`Editar ${noun}`} initial={item} onSave={onEdit as (d: Omit<Machine | Molino, "id">) => void} onCancel={() => setEditing(null)} />
        : (
          <div key={item.id} style={S.card}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{item.brand} {item.model}</span>
                  <Badge color={EC[item.status]} text={EL[item.status]} />
                  {item.maintenances.length > 0 && <Badge color={C.text2} text={`${item.maintenances.length} mant.`} />}
                </div>
                <div style={{ fontSize: 13, color: C.text2 }}>S/N: <strong>{item.serial}</strong></div>
                {item.maintenances.length > 0 && <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Último: {[...item.maintenances].sort((a, b) => b.date.localeCompare(a.date))[0].date} — {[...item.maintenances].sort((a, b) => b.date.localeCompare(a.date))[0].type}</div>}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ ...S.btn, ...S.ghost, padding: "6px 12px", fontSize: 12 }} onClick={() => setExpanded(expanded === item.id ? null : item.id)}>{expanded === item.id ? "Ocultar" : "Mantenimiento"}</button>
                <button style={{ ...S.btn, ...S.ghost, padding: "6px 12px" }} onClick={() => { setEditing(item.id); setAdding(false); setExpanded(null); }}>Editar</button>
                <button style={{ ...S.btn, ...S.danger, padding: "6px 12px" }} onClick={() => onDel(item.id)}>×</button>
              </div>
            </div>
            {expanded === item.id && (
              <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                <MaintenanceSection maintenances={item.maintenances} onChange={list => updM(item.id, list)} />
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════
type Tab = "dashboard" | "clientes" | "pedidos" | "comodatos" | "solo-consumo" | "maquinas" | "molinos";

const NAV: Array<{ key: Tab; icon: string; label: string; group?: string }> = [
  { key: "dashboard",    icon: "◎",  label: "Dashboard" },
  { key: "clientes",     icon: "👥", label: "Clientes",      group: "Clientes" },
  { key: "comodatos",    icon: "☕", label: "Comodatos",     group: "Clientes" },
  { key: "solo-consumo", icon: "🏪", label: "Solo consumo",  group: "Clientes" },
  { key: "pedidos",      icon: "📦", label: "Pedidos",       group: "Operaciones" },
  { key: "maquinas",     icon: "⚙️", label: "Máquinas",      group: "Inventario" },
  { key: "molinos",      icon: "🔧", label: "Molinos",       group: "Inventario" },
];

export default function AdminPage() {
  const [authed, setAuthed]       = useState(false);
  const [pass, setPass]           = useState("");
  const [passErr, setPassErr]     = useState(false);
  const [tab, setTab]             = useState<Tab>("dashboard");
  const [machines, setMachines]   = useState<Machine[]>([]);
  const [molinos, setMolinos]     = useState<Molino[]>([]);
  const [comodatos, setComodatos] = useState<ComodatoRecord[]>([]);
  const [clientes, setClientes]   = useState<ClientePropio[]>([]);
  const [orders, setOrders]       = useState<Order[]>([]);

  useEffect(() => {
    if (sessionStorage.getItem(KEY_AUTH) === "1") setAuthed(true);
    try {
      const m  = localStorage.getItem(KEY_MACHINES);
      const mo = localStorage.getItem(KEY_MOLINOS);
      const c  = localStorage.getItem(KEY_COMODATOS);
      const cl = localStorage.getItem(KEY_CLIENTES);
      const or = localStorage.getItem(KEY_ORDERS);
      if (m)  setMachines(JSON.parse(m));
      if (mo) setMolinos(JSON.parse(mo));
      if (c)  setComodatos(JSON.parse(c));
      if (cl) setClientes(JSON.parse(cl));
      if (or) setOrders(JSON.parse(or));
    } catch { /* empty */ }
  }, []);

  const setMachinesP  = (l: Machine[])       => { setMachines(l);  try { localStorage.setItem(KEY_MACHINES,  JSON.stringify(l)); } catch { /**/ } };
  const setMolinosP   = (l: Molino[])        => { setMolinos(l);   try { localStorage.setItem(KEY_MOLINOS,   JSON.stringify(l)); } catch { /**/ } };
  const setOrdersP    = (l: Order[])         => { setOrders(l);    try { localStorage.setItem(KEY_ORDERS,    JSON.stringify(l)); } catch { /**/ } };

  const login = () => {
    if (pass === ADMIN_PASS) { sessionStorage.setItem(KEY_AUTH, "1"); setAuthed(true); }
    else setPassErr(true);
  };

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: "48px 52px", width: 360, boxShadow: "0 8px 32px rgba(26,14,5,.08)" }}>
          <img src="/logo-origen.svg" alt="Origen" style={{ height: 36, margin: "0 auto 32px" }} />
          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, textAlign: "center" }}>Panel de administración</h1>
          <Field label="Contraseña">
            <input style={{ ...S.input, ...(passErr ? { borderColor: C.red } : {}) }}
              type="password" placeholder="••••••••" value={pass}
              onChange={e => { setPass(e.target.value); setPassErr(false); }}
              onKeyDown={e => e.key === "Enter" && login()} />
            {passErr && <p style={{ fontSize: 12, color: C.red, marginTop: 5 }}>Contraseña incorrecta</p>}
          </Field>
          <button style={{ ...S.btn, ...S.primary, width: "100%", padding: 13, fontSize: 14 }} onClick={login}>Ingresar</button>
        </div>
      </div>
    );
  }

  const pendingCount = orders.filter(o => o.status === "pendiente").length;

  // Group nav items
  const groups = ["", "Clientes", "Operaciones", "Inventario"];
  const byGroup = (g: string) => NAV.filter(n => (n.group ?? "") === g);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside style={{
        width: 220, flexShrink: 0, background: C.sidebar,
        display: "flex", flexDirection: "column",
        position: "sticky", top: 0, height: "100vh",
        overflow: "hidden",
      }}>
        {/* Logo */}
        <div style={{ padding: "24px 20px 20px" }}>
          <img src="/logo-origen.svg" alt="Origen" style={{ height: 28, filter: "brightness(0) invert(1)" }} />
        </div>
        <div style={{ height: 1, background: "rgba(255,255,255,.1)", marginBottom: 8 }} />

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {groups.map(g => {
            const items = byGroup(g);
            if (items.length === 0) return null;
            return (
              <div key={g}>
                {g && <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.35)", letterSpacing: ".10em", textTransform: "uppercase", padding: "14px 20px 6px" }}>{g}</div>}
                {items.map(n => {
                  const active = tab === n.key;
                  const hasBadge = n.key === "pedidos" && pendingCount > 0;
                  return (
                    <button key={n.key} onClick={() => setTab(n.key)} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      width: "100%", padding: "10px 20px",
                      background: active ? "rgba(196,132,58,.25)" : "none",
                      border: "none", borderLeft: active ? `3px solid ${C.accent}` : "3px solid transparent",
                      color: active ? C.white : "rgba(255,255,255,.6)",
                      fontSize: 13, fontWeight: active ? 600 : 400,
                      cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                      transition: "background .15s, color .15s",
                    }}>
                      <span style={{ fontSize: 15, flexShrink: 0 }}>{n.icon}</span>
                      <span style={{ flex: 1 }}>{n.label}</span>
                      {hasBadge && (
                        <span style={{ background: C.orange, color: C.white, borderRadius: 20, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>{pendingCount}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,.1)" }}>
          <a href="/" style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.4)", textDecoration: "none", marginBottom: 10 }}>← Ir al catálogo</a>
          <button onClick={() => { sessionStorage.removeItem(KEY_AUTH); setAuthed(false); }}
            style={{ ...S.btn, background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.5)", padding: "7px 14px", fontSize: 12, width: "100%" }}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Content ──────────────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: "36px 40px 80px", overflowY: "auto" }}>
        {tab === "dashboard"    && <Dashboard orders={orders} comodatos={comodatos} clientes={clientes} />}
        {tab === "clientes"     && <ClientesSection comodatos={comodatos} clientes={clientes} orders={orders} machines={machines} molinos={molinos} onGoToComodatos={() => setTab("comodatos")} />}
        {tab === "pedidos"      && <PedidosSection orders={orders} setOrders={setOrdersP} comodatos={comodatos} clientes={clientes} />}
        {tab === "comodatos"    && <ComodatosSection records={comodatos} setRecords={setComodatos} machines={machines} molinos={molinos} />}
        {tab === "solo-consumo" && <SoloConsumoSection clientes={clientes} setClientes={setClientes} />}
        {tab === "maquinas"     && <EquipSection items={machines} setItems={setMachinesP} storageKey={KEY_MACHINES} noun="máquina" title="Máquinas" description="Stock de máquinas de espresso disponibles y en comodato" />}
        {tab === "molinos"      && <EquipSection items={molinos} setItems={setMolinosP} storageKey={KEY_MOLINOS} noun="molino" title="Molinos" description="Stock de molinos disponibles y en comodato" />}
      </main>
    </div>
  );
}
