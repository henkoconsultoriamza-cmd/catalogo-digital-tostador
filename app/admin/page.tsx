"use client";

import { useEffect, useRef, useState } from "react";

// ── Storage keys ──────────────────────────────────────────────────────────────
const KEY_MACHINES  = "origen_machines_v1";
const KEY_MOLINOS   = "origen_molinos_v1";
const KEY_COMODATOS = "origen_comodatos_v2";
const KEY_CLIENTES  = "origen_clientes_v1";
const KEY_ORDERS    = "origen_orders_v1";
const KEY_PRODUCTS  = "origen_products_v1";
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

type AdminProduct = {
  id: string; sku: string; name: string; category: string; description: string;
  price: number; salePrice?: number; minQty: number;
  image: string; imageColor: string; imageIcon: string;
  tag?: string; onSale?: boolean;
  specs: Array<{ key: string; value: string }>;
  active: boolean;
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
  bg:      "#F1F5F9",   // slate-100
  white:   "#FFFFFF",
  text:    "#0F172A",   // slate-900
  text2:   "#475569",   // slate-600
  muted:   "#94A3B8",   // slate-400
  border:  "#E2E8F0",   // slate-200
  border2: "#CBD5E1",
  accent:  "#C4843A",
  accentL: "#FDF3E7",
  green:   "#059669",
  greenL:  "#ECFDF5",
  red:     "#DC2626",
  redL:    "#FEF2F2",
  orange:  "#D97706",
  orangeL: "#FFFBEB",
  sidebar: "#0F172A",
  sidebarH:"rgba(255,255,255,.06)",
  sidebarA:"rgba(196,132,58,.15)",
};

const inputBase: React.CSSProperties = {
  width: "100%", border: `1px solid ${C.border}`, borderRadius: 6,
  padding: "9px 12px", fontSize: 13.5, outline: "none",
  background: C.white, color: C.text, fontFamily: "inherit",
  transition: "border-color .15s, box-shadow .15s",
};
const S = {
  input:  inputBase,
  select: inputBase,
  btn:    { border: "none", borderRadius: 6, padding: "9px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", letterSpacing: "-.01em" } as React.CSSProperties,
  primary:{ background: C.text, color: C.white } as React.CSSProperties,
  accent: { background: C.accent, color: C.white } as React.CSSProperties,
  ghost:  { background: C.white, border: `1px solid ${C.border2}`, color: C.text2 } as React.CSSProperties,
  danger: { background: C.white, border: `1px solid ${C.border2}`, color: C.red } as React.CSSProperties,
  card:   { background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: "18px 22px", marginBottom: 8, boxShadow: "0 1px 3px rgba(15,23,42,.04)" } as React.CSSProperties,
  form:   { background: "#F8FAFC", border: `1px solid ${C.border}`, borderRadius: 10, padding: 24, marginBottom: 20, boxShadow: "inset 0 1px 2px rgba(0,0,0,.02)" } as React.CSSProperties,
  divider:{ height: 1, background: C.border, margin: "20px 0" } as React.CSSProperties,
  sectionLabel: { fontSize: 10.5, fontWeight: 600, color: C.muted, letterSpacing: ".08em", textTransform: "uppercase" as const, marginBottom: 12 },
};

// ── Micro components ──────────────────────────────────────────────────────────
const Badge = ({ color, bg, text }: { color: string; bg?: string; text: string }) => (
  <span style={{
    display: "inline-flex", alignItems: "center",
    background: bg ?? color + "18", color,
    borderRadius: 9999, padding: "2px 9px", fontSize: 11, fontWeight: 600, letterSpacing: ".02em",
  }}>{text}</span>
);

const Field = ({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) => (
  <div style={{ marginBottom: 14, ...(span2 ? { gridColumn: "span 2" } : {}) }}>
    <label style={{ display: "block", fontSize: 11.5, fontWeight: 500, color: C.text2, marginBottom: 5, letterSpacing: "-.01em" }}>{label}</label>
    {children}
  </div>
);

const Grid = ({ cols = 2, children }: { cols?: number; children: React.ReactNode }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14 }}>{children}</div>
);

const InfoChip = ({ label, value, accent, alert }: { label: string; value: string; accent?: boolean; alert?: boolean }) => (
  <div style={{
    background: alert ? C.redL : accent ? C.accentL : "#F8FAFC",
    borderRadius: 6, padding: "7px 11px", fontSize: 12,
    border: `1px solid ${alert ? C.red + "30" : C.border}`,
  }}>
    <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 2 }}>{label}</div>
    <div style={{ color: alert ? C.red : accent ? C.accent : C.text, fontWeight: 600, fontSize: 12.5 }}>{value}</div>
  </div>
);

// ── Panel card ────────────────────────────────────────────────────────────────
const Panel = ({ title, sub, children, mb }: { title: string; sub?: React.ReactNode; children: React.ReactNode; mb?: boolean }) => (
  <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: "20px 22px", boxShadow: "0 1px 3px rgba(15,23,42,.04)", ...(mb ? { marginBottom: 16 } : {}) }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, color: C.text, letterSpacing: "-.01em" }}>{title}</h2>
      {sub && <span style={{ fontSize: 12, color: C.muted }}>{sub}</span>}
    </div>
    {children}
  </div>
);

const Empty = ({ text }: { text: string }) => (
  <p style={{ fontSize: 13, color: C.muted, padding: "16px 0" }}>{text}</p>
);

// ── Page section header ────────────────────────────────────────────────────────
const PageHeader = ({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) => (
  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: "-.02em" }}>{title}</h1>
      {sub && <p style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>{sub}</p>}
    </div>
    {action}
  </div>
);

// ── Pill tabs ──────────────────────────────────────────────────────────────────
const PillTabs = <T extends string>({ options, value, onChange, labels }: { options: readonly T[]; value: T; onChange: (v: T) => void; labels?: Partial<Record<T, string>> }) => (
  <div style={{ display: "flex", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 3, width: "fit-content" }}>
    {options.map(o => (
      <button key={o} onClick={() => onChange(o)} style={{
        padding: "6px 14px", fontSize: 12.5, fontFamily: "inherit", cursor: "pointer", borderRadius: 6,
        background: value === o ? C.white : "none",
        color: value === o ? C.text : C.muted,
        border: "none", fontWeight: value === o ? 500 : 400,
        boxShadow: value === o ? "0 1px 2px rgba(15,23,42,.06)" : "none",
        transition: "all .15s",
      }}>{labels?.[o] ?? o}</button>
    ))}
  </div>
);

// ── Stat card ─────────────────────────────────────────────────────────────────
const Stat = ({ label, value, sub, color = C.accent, stripe }: { label: string; value: string | number; sub?: string; color?: string; stripe?: boolean }) => (
  <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: "20px 22px", boxShadow: "0 1px 3px rgba(15,23,42,.04)", ...(stripe ? { borderTop: `3px solid ${color}` } : {}) }}>
    <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1, letterSpacing: "-.02em" }}>{value}</div>
    <div style={{ fontSize: 13, color: C.text2, marginTop: 6, fontWeight: 400 }}>{label}</div>
    {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</div>}
  </div>
);

// ── Progress bar ──────────────────────────────────────────────────────────────
const ProgressBar = ({ name, phone, actual, target }: { name: string; phone?: string; actual: number; target: number }) => {
  const pct   = target > 0 ? Math.min((actual / target) * 100, 100) : 0;
  const over  = actual > target && target > 0;
  const color = pct < 60 ? C.red : pct < 90 ? C.orange : C.green;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{name}</span>
          {phone && <span style={{ fontSize: 11, color: C.muted, marginLeft: 8 }}>{phone}</span>}
        </div>
        <div style={{ textAlign: "right", fontSize: 13 }}>
          <span style={{ fontWeight: 600, color }}>{actual.toFixed(1)} kg</span>
          <span style={{ color: C.muted }}> / {target} kg</span>
          {over && <span style={{ color: C.green, marginLeft: 6, fontSize: 11, fontWeight: 600 }}>+{(actual - target).toFixed(1)}</span>}
        </div>
      </div>
      <div style={{ background: C.border, borderRadius: 99, height: 5, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width .5s ease" }} />
      </div>
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
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: "-.02em" }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>{monthLabel}</p>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 28 }}>
        <Stat stripe label="Pedidos este mes" value={kpiPedidos} color={C.text} />
        <Stat stripe label="Kg café vendidos" value={`${kpiKg.toFixed(1)} kg`} color={C.accent} />
        <Stat stripe label="Facturación" value={FMT(kpiVentas)} color={C.green} sub={monthLabel} />
        <Stat stripe label="Pendientes" value={kpiPendiente} color={kpiPendiente > 0 ? C.orange : C.muted} />
        <Stat stripe label="Clientes activos" value={kpiClientes} color={C.text} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Consumption vs commitment */}
        <Panel title="Consumo vs. compromiso" sub="comodatos activos">
          {active.filter(c => c.minKgMonth > 0).length === 0
            ? <Empty text="Sin comodatos con compromiso definido" />
            : active.filter(c => c.minKgMonth > 0).map(c => (
                <ProgressBar key={c.id} name={c.cafeteria} phone={c.phone}
                  actual={consumoById[c.id] ?? 0} target={c.minKgMonth} />
              ))
          }
        </Panel>

        {/* Ranking */}
        <Panel title="Ranking de clientes" sub="kg café este mes">
          {ranking.length === 0
            ? <Empty text="Sin pedidos este mes" />
            : ranking.map((c, i) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: i < ranking.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%", flexShrink: 0, fontSize: 11, fontWeight: 700,
                    background: i === 0 ? C.accent : i < 3 ? C.text2 : C.border,
                    color: i < 3 ? C.white : C.text2,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                    {c.phone && <div style={{ fontSize: 11, color: C.muted }}>{c.phone}</div>}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: C.accent }}>{c.kg.toFixed(1)} kg</div>
                </div>
              ))
          }
        </Panel>
      </div>

      {/* Kg por tipo de café */}
      <Panel title="Kg por tipo de café" sub={<span style={{ fontSize: 16, fontWeight: 700, color: C.accent }}>{totalKgCoffee.toFixed(1)} kg total</span>} mb>
        {coffeeRanking.length === 0
          ? <Empty text="Sin pedidos de café este mes" />
          : coffeeRanking.map(([name, kg], i) => {
              const pct = totalKgCoffee > 0 ? (kg / totalKgCoffee) * 100 : 0;
              const cols = [C.accent, "#7C5C3A", "#94A3B8", "#CBD5E1", "#E2E8F0"];
              const col  = cols[Math.min(i, cols.length - 1)];
              return (
                <div key={name} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: col, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{name}</span>
                    </div>
                    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: C.muted }}>{pct.toFixed(1)}%</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.text, minWidth: 55, textAlign: "right" }}>{kg.toFixed(1)} kg</span>
                    </div>
                  </div>
                  <div style={{ background: C.border, borderRadius: 99, height: 4 }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: col, borderRadius: 99, transition: "width .5s ease" }} />
                  </div>
                </div>
              );
            })
        }
      </Panel>

      {/* Revenue by category */}
      {Object.keys(catRevenue).length > 0 && (
        <Panel title="Facturación por categoría" mb>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {Object.entries(catRevenue).sort((a, b) => b[1] - a[1]).map(([cat, rev]) => {
              const pct = kpiVentas > 0 ? (rev / kpiVentas) * 100 : 0;
              return (
                <div key={cat} style={{ flex: "1 1 120px", background: C.bg, borderRadius: 8, padding: "14px 16px", border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{cat}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.02em" }}>{FMT(rev)}</div>
                  <div style={{ fontSize: 11, color: C.accent, marginTop: 3, fontWeight: 500 }}>{pct.toFixed(0)}% del total</div>
                </div>
              );
            })}
          </div>
        </Panel>
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
function NewClientButton({ onComodato, onPropio }: { onComodato: () => void; onPropio: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button style={{ ...S.btn, ...S.accent }} onClick={() => setOpen(o => !o)}>
        + Nuevo cliente ▾
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setOpen(false)} />
          <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 100, background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, boxShadow: "0 8px 24px rgba(15,23,42,.12)", overflow: "hidden", minWidth: 200 }}>
            <button onClick={() => { setOpen(false); onComodato(); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "11px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: C.text, fontFamily: "inherit" }}>
              <div style={{ fontWeight: 500 }}>☕ Con comodato</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>Máquina entregada por vos</div>
            </button>
            <div style={{ height: 1, background: C.border }} />
            <button onClick={() => { setOpen(false); onPropio(); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "11px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: C.text, fontFamily: "inherit" }}>
              <div style={{ fontWeight: 500 }}>🏪 Solo consumo</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>Cliente con máquina propia</div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ClientesSection({ comodatos, clientes, orders, machines, molinos, onGoToComodatos, onGoToSoloConsumo }: {
  comodatos: ComodatoRecord[]; clientes: ClientePropio[]; orders: Order[];
  machines: Machine[]; molinos: Molino[]; onGoToComodatos: () => void; onGoToSoloConsumo: () => void;
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
      <PageHeader title="Clientes" sub="Vista unificada de todos tus clientes"
        action={<NewClientButton onComodato={onGoToComodatos} onPropio={onGoToSoloConsumo} />} />

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total", val: totals.total, color: C.text },
          { label: "Activos", val: totals.activos, color: C.green },
          { label: "Comodatos", val: totals.comodatos, color: C.accent },
          { label: "Máq. propia", val: totals.propios, color: C.text2 },
        ].map(k => (
          <div key={k.label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px", boxShadow: "0 1px 3px rgba(15,23,42,.04)" }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: k.color, letterSpacing: "-.02em" }}>{k.val}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input style={{ ...S.input, maxWidth: 240 }} placeholder="Buscar por nombre o teléfono…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <PillTabs options={["all", "comodato", "propio"] as const} value={typeFilter} onChange={setTypeFilter}
          labels={{ all: "Todos", comodato: "Comodatos", propio: "Máq. propia" }} />
        <PillTabs options={["all", "activo", "inactivo"] as const} value={statusFilter} onChange={setStatusFilter}
          labels={{ all: "Todos", activo: "Activos", inactivo: "Inactivos" }} />
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
      <PageHeader title="Pedidos" sub="Pedidos del catálogo y manuales"
        action={<button style={{ ...S.btn, ...S.accent }} onClick={() => { setAdding(true); setEditing(null); }}>+ Nuevo manual</button>} />

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {(["pendiente", "confirmado", "entregado", "cancelado"] as const).map(s => (
          <div key={s} onClick={() => setStatusF(statusF === s ? "all" : s)}
            style={{ background: C.white, border: `1px solid ${statusF === s ? C.accent : C.border}`, borderRadius: 10, padding: "16px 18px", cursor: "pointer", boxShadow: "0 1px 3px rgba(15,23,42,.04)", transition: "border-color .15s" }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: SC[s], letterSpacing: "-.02em" }}>{orders.filter(o => o.status === s).length}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{s.charAt(0).toUpperCase() + s.slice(1)}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input style={{ ...S.input, maxWidth: 220 }} placeholder="Buscar cliente…" value={search} onChange={e => setSearch(e.target.value)} />
        <PillTabs options={["all", "pendiente", "confirmado", "entregado", "cancelado"] as const} value={statusF} onChange={setStatusF}
          labels={{ all: "Todos", pendiente: "Pendiente", confirmado: "Confirmado", entregado: "Entregado", cancelado: "Cancelado" }} />
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
      <PageHeader title="Comodatos" sub="Máquinas entregadas en comodato a cafeterías"
        action={<button style={{ ...S.btn, ...S.accent }} onClick={() => { setAdding(true); setEditing(null); }}>+ Nuevo comodato</button>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        {(["activo", "suspendido", "finalizado"] as const).map(k => (
          <div key={k} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px", boxShadow: "0 1px 3px rgba(15,23,42,.04)" }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: CC[k], letterSpacing: "-.02em" }}>{records.filter(r => r.status === k).length}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{k.charAt(0).toUpperCase() + k.slice(1)}s</div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 20 }}>
        <PillTabs options={["all", "activo", "suspendido", "finalizado"] as const} value={filter} onChange={setFilter}
          labels={{ all: "Todos", activo: "Activos", suspendido: "Suspendidos", finalizado: "Finalizados" }} />
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
      <PageHeader title="Solo consumo" sub="Clientes con máquina propia"
        action={<button style={{ ...S.btn, ...S.accent }} onClick={() => { setAdding(true); setEditing(null); }}>+ Nuevo cliente</button>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 24, maxWidth: 300 }}>
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px", boxShadow: "0 1px 3px rgba(15,23,42,.04)" }}>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.02em" }}>{clientes.length}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Total</div>
        </div>
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px", boxShadow: "0 1px 3px rgba(15,23,42,.04)" }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: C.green, letterSpacing: "-.02em" }}>{clientes.filter(c => c.status === "activo").length}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Activos</div>
        </div>
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
      <PageHeader title={title} sub={description}
        action={<button style={{ ...S.btn, ...S.accent }} onClick={() => { setAdding(true); setEditing(null); }}>+ Agregar {noun}</button>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {(Object.keys(EL) as EquipStatus[]).map(k => (
          <div key={k} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px", boxShadow: "0 1px 3px rgba(15,23,42,.04)" }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: EC[k], letterSpacing: "-.02em" }}>{items.filter(i => i.status === k).length}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{EL[k]}</div>
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
// PRODUCTOS
// ══════════════════════════════════════════════════════════════════════════════
const PRODUCT_CATEGORIES = ["Café", "Syrups", "Salsas", "Accesorios", "Otro"];
const EMOJI_OPTIONS = ["☕","🍶","🍫","🌰","🍓","🍯","🌿","🥛","🍮","🔧","📏","🌡️","🫙","🧃","🍵","📦","⭐","🎯"];

const BLANK_PRODUCT: Omit<AdminProduct, "id"> = {
  sku: "", name: "", category: "Café", description: "",
  price: 0, salePrice: undefined, minQty: 1,
  image: "", imageColor: "#C4843A", imageIcon: "☕",
  tag: "", onSale: false, specs: [], active: true,
};

function ProductosSection({ products, setProducts }: { products: AdminProduct[]; setProducts: (v: AdminProduct[]) => void }) {
  const [adding, setAdding]     = useState(false);
  const [editing, setEditing]   = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState("all");
  const [search, setSearch]     = useState("");

  const persist = (l: AdminProduct[]) => {
    setProducts(l);
    try { localStorage.setItem(KEY_PRODUCTS, JSON.stringify(l)); } catch { /**/ }
  };
  const onSave  = (d: Omit<AdminProduct, "id">) => { persist([...products, { ...d, id: uid() }]); setAdding(false); };
  const onEdit  = (d: Omit<AdminProduct, "id">) => { persist(products.map(p => p.id === editing ? { ...d, id: editing! } : p)); setEditing(null); };
  const onDel   = (id: string) => { if (!confirm("¿Eliminar producto?")) return; persist(products.filter(p => p.id !== id)); };
  const toggle  = (id: string) => persist(products.map(p => p.id === id ? { ...p, active: !p.active } : p));

  const visible = products
    .filter(p => catFilter === "all" || p.category === catFilter)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()));

  const byCat: Record<string, number> = {};
  products.forEach(p => { byCat[p.category] = (byCat[p.category] ?? 0) + 1; });

  return (
    <div>
      <PageHeader title="Productos" sub="Catálogo visible en la tienda — los cambios se reflejan en tiempo real"
        action={<button style={{ ...S.btn, ...S.accent }} onClick={() => { setAdding(true); setEditing(null); }}>+ Agregar producto</button>} />

      <div style={{ display: "flex", gap: 10, margin: "0 0 24px", flexWrap: "wrap" }}>
        {[{ label: "Total", val: products.length, color: C.text }, { label: "Activos", val: products.filter(p => p.active).length, color: C.green },
          ...PRODUCT_CATEGORIES.filter(c => c !== "Otro" && byCat[c]).map(c => ({ label: c, val: byCat[c], color: C.accent }))
        ].map(k => (
          <div key={k.label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px", boxShadow: "0 1px 3px rgba(15,23,42,.04)", minWidth: 80, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color, letterSpacing: "-.02em" }}>{k.val}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input style={{ ...S.input, maxWidth: 220 }} placeholder="Buscar por nombre o SKU…" value={search} onChange={e => setSearch(e.target.value)} />
        <div style={{ display: "flex", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 3 }}>
          {(["all", ...PRODUCT_CATEGORIES] as string[]).map(f => (
            <button key={f} onClick={() => setCatFilter(f)} style={{
              padding: "6px 13px", fontSize: 12.5, fontFamily: "inherit", cursor: "pointer", borderRadius: 6,
              background: catFilter === f ? C.white : "none", color: catFilter === f ? C.text : C.muted,
              border: "none", fontWeight: catFilter === f ? 500 : 400,
              boxShadow: catFilter === f ? "0 1px 2px rgba(15,23,42,.06)" : "none",
            }}>{f === "all" ? "Todos" : f}</button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: C.muted }}>{visible.length} producto{visible.length !== 1 ? "s" : ""}</span>
      </div>

      {adding && <ProductForm onSave={onSave} onCancel={() => setAdding(false)} />}

      {visible.length === 0 && !adding && (
        <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🛍️</div>
          <p style={{ marginBottom: 16 }}>Sin productos cargados</p>
          <p style={{ fontSize: 12 }}>El catálogo mostrará los productos de ejemplo hasta que cargues los tuyos</p>
        </div>
      )}

      {visible.map(p => editing === p.id
        ? <ProductForm key={p.id} initial={p} onSave={onEdit} onCancel={() => setEditing(null)} />
        : (
          <div key={p.id} style={{ ...S.card, opacity: p.active ? 1 : .55 }}>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              {/* Thumbnail */}
              <div style={{
                width: 68, height: 68, borderRadius: 6, flexShrink: 0, overflow: "hidden",
                background: p.imageColor || "#EAE4DC", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {p.image
                  ? <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontSize: 28 }}>{p.imageIcon}</span>
                }
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{p.name}</span>
                  <Badge color={C.text2} text={p.category} />
                  {!p.active && <Badge color={C.muted} text="Oculto" />}
                  {p.tag && <Badge color={C.accent} text={p.tag} />}
                  {p.onSale && <Badge color={C.green} text="Oferta" />}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>SKU: {p.sku || "—"}</div>
                {p.description && <p style={{ fontSize: 13, color: C.text2, marginBottom: 8, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.description}</p>}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <InfoChip label="Precio" value={`$ ${p.price.toLocaleString("es-AR")}`} accent />
                  {p.salePrice && p.salePrice > 0 && <InfoChip label="Precio oferta" value={`$ ${p.salePrice.toLocaleString("es-AR")}`} />}
                  <InfoChip label="Mínimo" value={`${p.minQty} ${p.minQty === 1 ? "unidad" : "unidades"}`} />
                  {p.specs.length > 0 && <InfoChip label="Especificaciones" value={`${p.specs.length} campo${p.specs.length !== 1 ? "s" : ""}`} />}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                <button style={{ ...S.btn, ...(p.active ? S.ghost : { ...S.ghost, borderColor: C.green, color: C.green }), padding: "6px 14px", fontSize: 12 }} onClick={() => toggle(p.id)}>
                  {p.active ? "Ocultar" : "Publicar"}
                </button>
                <button style={{ ...S.btn, ...S.ghost, padding: "6px 14px", fontSize: 12 }} onClick={() => { setEditing(p.id); setAdding(false); }}>Editar</button>
                <button style={{ ...S.btn, ...S.danger, padding: "6px 14px", fontSize: 12 }} onClick={() => onDel(p.id)}>Eliminar</button>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}

// ── Product form ──────────────────────────────────────────────────────────────
function ProductForm({ initial, onSave, onCancel }: {
  initial?: AdminProduct;
  onSave: (d: Omit<AdminProduct, "id">) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Omit<AdminProduct, "id">>(initial
    ? { ...BLANK_PRODUCT, ...initial }
    : { ...BLANK_PRODUCT }
  );
  const set = (k: keyof Omit<AdminProduct, "id" | "specs" | "onSale" | "active">) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const setSpec = (i: number, k: "key" | "value", v: string) =>
    setForm(f => ({ ...f, specs: f.specs.map((s, j) => j === i ? { ...s, [k]: v } : s) }));
  const addSpec  = () => setForm(f => ({ ...f, specs: [...f.specs, { key: "", value: "" }] }));
  const delSpec  = (i: number) => setForm(f => ({ ...f, specs: f.specs.filter((_, j) => j !== i) }));

  return (
    <div style={S.form}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 18 }}>{initial ? "Editar producto" : "Nuevo producto"}</h3>

      {/* Basic */}
      <Grid>
        <Field label="Nombre *"><input style={S.input} value={form.name} onChange={set("name")} placeholder="ej. Colombia Huila 1 kg" /></Field>
        <Field label="SKU"><input style={S.input} value={form.sku} onChange={set("sku")} placeholder="ej. CF-COL-1KG" /></Field>
        <Field label="Categoría">
          <select style={S.select} value={form.category} onChange={set("category")}>
            {PRODUCT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Etiqueta (tag)"><input style={S.input} value={form.tag ?? ""} onChange={set("tag")} placeholder="ej. Nuevo · Más vendido · Temporada" /></Field>
      </Grid>

      <Field label="Descripción">
        <textarea style={{ ...S.input, height: 80, resize: "vertical" }} value={form.description} onChange={set("description")} placeholder="Descripción para el catálogo" />
      </Field>

      <div style={S.divider} />

      {/* Pricing */}
      <div style={S.sectionLabel}>Precio y disponibilidad</div>
      <Grid>
        <Field label="Precio *"><input style={S.input} type="number" min={0} value={form.price} onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} /></Field>
        <Field label="Precio oferta"><input style={S.input} type="number" min={0} value={form.salePrice ?? ""} placeholder="Dejar vacío si no aplica"
          onChange={e => setForm(f => ({ ...f, salePrice: e.target.value ? parseFloat(e.target.value) : undefined }))} /></Field>
        <Field label="Cantidad mínima"><input style={S.input} type="number" min={1} value={form.minQty} onChange={e => setForm(f => ({ ...f, minQty: parseInt(e.target.value) || 1 }))} /></Field>
        <Field label="Estado">
          <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
              <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} style={{ width: 15, height: 15 }} />
              Visible en catálogo
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
              <input type="checkbox" checked={!!form.onSale} onChange={e => setForm(f => ({ ...f, onSale: e.target.checked }))} style={{ width: 15, height: 15 }} />
              En oferta
            </label>
          </div>
        </Field>
      </Grid>

      <div style={S.divider} />

      {/* Image */}
      <div style={S.sectionLabel}>Imagen</div>
      <Grid>
        <Field label="URL de imagen" span2>
          <input style={S.input} value={form.image} onChange={set("image")} placeholder="https://… (Unsplash, tu CDN, etc.)" />
        </Field>
        <Field label="Color de fondo (hex)">
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input type="color" value={form.imageColor} onChange={e => setForm(f => ({ ...f, imageColor: e.target.value }))}
              style={{ width: 40, height: 36, border: "none", borderRadius: 4, cursor: "pointer", padding: 2 }} />
            <input style={{ ...S.input, maxWidth: 110 }} value={form.imageColor} onChange={set("imageColor")} />
          </div>
        </Field>
        <Field label="Ícono (si no hay imagen)">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            {EMOJI_OPTIONS.map(e => (
              <button key={e} type="button" onClick={() => setForm(f => ({ ...f, imageIcon: e }))}
                style={{ fontSize: 20, padding: 4, cursor: "pointer", background: form.imageIcon === e ? C.accent + "30" : "none", border: form.imageIcon === e ? `2px solid ${C.accent}` : "2px solid transparent", borderRadius: 4 }}>
                {e}
              </button>
            ))}
          </div>
        </Field>
      </Grid>

      {/* Preview */}
      {(form.image || form.imageIcon) && (
        <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "10px 0 18px", padding: "12px 16px", background: "#F5F0E8", borderRadius: 6 }}>
          <div style={{ width: 56, height: 56, borderRadius: 6, overflow: "hidden", background: form.imageColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {form.image
              ? <img src={form.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              : <span style={{ fontSize: 26 }}>{form.imageIcon}</span>
            }
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{form.name || "Nombre del producto"}</div>
            <div style={{ fontSize: 13, color: C.accent, fontWeight: 700 }}>$ {(form.salePrice && form.onSale ? form.salePrice : form.price).toLocaleString("es-AR")}</div>
          </div>
        </div>
      )}

      <div style={S.divider} />

      {/* Specs */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={S.sectionLabel}>Especificaciones</div>
        <button style={{ ...S.btn, ...S.ghost, padding: "5px 12px", fontSize: 12 }} onClick={addSpec}>+ Agregar</button>
      </div>
      {form.specs.length === 0
        ? <p style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Sin especificaciones — aparecerán en el detalle del producto</p>
        : form.specs.map((sp, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 10, marginBottom: 10, alignItems: "center" }}>
            <input style={S.input} value={sp.key} onChange={e => setSpec(i, "key", e.target.value)} placeholder="ej. Origen" />
            <input style={S.input} value={sp.value} onChange={e => setSpec(i, "value", e.target.value)} placeholder="ej. Colombia Huila" />
            <button onClick={() => delSpec(i)} style={{ background: "none", border: "none", color: "#CCC", fontSize: 18, cursor: "pointer", padding: "0 4px" }}>×</button>
          </div>
        ))
      }

      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button style={{ ...S.btn, ...S.primary }} disabled={!form.name.trim() || form.price <= 0}
          onClick={() => form.name.trim() && form.price > 0 && onSave(form)}>
          Guardar
        </button>
        <button style={{ ...S.btn, ...S.ghost }} onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════
type Tab = "dashboard" | "clientes" | "pedidos" | "comodatos" | "solo-consumo" | "maquinas" | "molinos" | "productos";

const NAV: Array<{ key: Tab; icon: string; label: string; group?: string }> = [
  { key: "dashboard",    icon: "◎",  label: "Dashboard" },
  { key: "clientes",     icon: "👥", label: "Clientes",      group: "Clientes" },
  { key: "comodatos",    icon: "☕", label: "Comodatos",     group: "Clientes" },
  { key: "solo-consumo", icon: "🏪", label: "Solo consumo",  group: "Clientes" },
  { key: "pedidos",      icon: "📦", label: "Pedidos",       group: "Operaciones" },
  { key: "productos",    icon: "🛍️", label: "Productos",     group: "Catálogo" },
  { key: "maquinas",     icon: "⚙️", label: "Máquinas",      group: "Inventario" },
  { key: "molinos",      icon: "🔧", label: "Molinos",       group: "Inventario" },
];

// ── Demo seed ─────────────────────────────────────────────────────────────────
function buildDemoData() {
  const id = uid;
  const today = new Date();
  const dateStr = (daysAgo: number) => {
    const d = new Date(today); d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  };

  const machines: Machine[] = [
    { id: "m1", brand: "La Marzocco", model: "Linea Mini", serial: "LM-2021-0441", status: "en_comodato", notes: "Revisión anual en diciembre", maintenances: [{ id: id(), date: dateStr(45), type: "Preventivo", description: "Cambio de juntas y limpieza de grupos", technician: "Técnico Espresso SRL" }] },
    { id: "m2", brand: "Rancilio",    model: "Silvia Pro X",  serial: "RP-2022-1182", status: "en_comodato", notes: "", maintenances: [] },
    { id: "m3", brand: "Breville",    model: "Oracle Touch",  serial: "BRV-2023-0093", status: "disponible", notes: "Nueva en stock", maintenances: [] },
    { id: "m4", brand: "Victoria Arduino", model: "Black Eagle Maverick", serial: "VA-2020-0077", status: "en_comodato", notes: "", maintenances: [{ id: id(), date: dateStr(120), type: "Correctivo", description: "Reemplazo bomba de agua", technician: "Técnico Espresso SRL" }] },
    { id: "m5", brand: "Nuova Simonelli", model: "Oscar II", serial: "NS-2022-3310", status: "mantenimiento", notes: "En reparación — falla caldera", maintenances: [] },
  ];

  const molinos: Molino[] = [
    { id: "mo1", brand: "Baratza",   model: "Sette 270",   serial: "BZ-270-0041",  status: "en_comodato",   notes: "", maintenances: [] },
    { id: "mo2", brand: "Eureka",    model: "Mignon Silenzio", serial: "EU-MS-0219", status: "en_comodato",   notes: "", maintenances: [{ id: id(), date: dateStr(30), type: "Limpieza", description: "Limpieza profunda de burras y cámara", technician: "Interno" }] },
    { id: "mo3", brand: "Mahlkönig", model: "EK43",        serial: "MK-EK-0558",   status: "en_comodato",   notes: "", maintenances: [] },
    { id: "mo4", brand: "Mazzer",    model: "Mini Elettronico", serial: "MZ-ME-0991", status: "disponible", notes: "", maintenances: [] },
    { id: "mo5", brand: "Anfim",     model: "CAIMANO On Demand", serial: "AF-CAI-0143", status: "disponible", notes: "", maintenances: [] },
  ];

  const comodatos: ComodatoRecord[] = [
    { id: "co1", cafeteria: "Café Amaranto", contact: "Lucía Pereyra", phone: "2616-421098", address: "San Martín 487, Mendoza", machineId: "m1", molinoId: "mo1", installDate: dateStr(210), minKgMonth: 12, coffeeType: "Colombia Huila", lastFilterChange: dateStr(65), contractSigned: true, contractFileName: "", contractFileData: "", status: "activo", notes: "" },
    { id: "co2", cafeteria: "Roastery Palermo", contact: "Martín Goñi", phone: "11-4532-8871", address: "Thames 1904, CABA", machineId: "m2", molinoId: "mo2", installDate: dateStr(380), minKgMonth: 20, coffeeType: "Brasil Cerrado Natural", lastFilterChange: dateStr(200), contractSigned: true, contractFileName: "", contractFileData: "", status: "activo", notes: "Filtro vencido — avisar" },
    { id: "co3", cafeteria: "Tostado Café Club", contact: "Valentina Ruiz", phone: "351-4110092", address: "Colón 230, Córdoba", machineId: "m4", molinoId: "mo3", installDate: dateStr(95), minKgMonth: 15, coffeeType: "Etiopía Yirgacheffe", lastFilterChange: dateStr(30), contractSigned: true, contractFileName: "", contractFileData: "", status: "activo", notes: "" },
    { id: "co4", cafeteria: "Brûlée Specialty", contact: "Diego Aranda", phone: "2664-580123", address: "Rivadavia 901, San Luis", machineId: "m5", molinoId: "", installDate: dateStr(50), minKgMonth: 8, coffeeType: "Perú Cajamarca", lastFilterChange: dateStr(50), contractSigned: false, contractFileName: "", contractFileData: "", status: "suspendido", notes: "Máquina en reparación" },
  ];

  const clientes: ClientePropio[] = [
    { id: "cl1", cafeteria: "Espresso House", contact: "Fernanda Moya", phone: "261-4990021", address: "Belgrano 1203, Mendoza", coffeeBrand: "Bolivia Caranavi", kgMonth: 6, lastFilterChange: dateStr(40), machineBrand: "Rancilio", machineModel: "Classe 5 USB", machineSerial: "RC-2019-0444", molinoBrand: "Baratza", molinoModel: "Virtuoso+", molinoSerial: "BZ-V-0871", status: "activo", notes: "" },
    { id: "cl2", cafeteria: "Kaffa Brew Bar", contact: "Ignacio Suárez", phone: "11-6203-4421", address: "Malabia 556, CABA", coffeeBrand: "Colombia Huila", kgMonth: 9, lastFilterChange: dateStr(90), machineBrand: "Nuova Simonelli", machineModel: "Appia Life", machineSerial: "NS-AL-1022", molinoBrand: "Mazzer", molinoModel: "Mini Elettronico", molinoSerial: "MZ-ME-0312", status: "activo", notes: "" },
    { id: "cl3", cafeteria: "La Molienda Vieja", contact: "Rosa Blanco", phone: "299-4561230", address: "Alem 740, Neuquén", coffeeBrand: "Brasil Cerrado Natural", kgMonth: 4, lastFilterChange: dateStr(195), machineBrand: "Breville", machineModel: "Barista Express", machineSerial: "BRV-BE-0551", molinoBrand: "Eureka", molinoModel: "Atom 75", molinoSerial: "EU-A75-0108", status: "activo", notes: "Cambiar filtro urgente" },
    { id: "cl4", cafeteria: "Norte Café", contact: "Sebastián Paz", phone: "381-4219900", address: "Las Heras 308, Tucumán", coffeeBrand: "Perú Cajamarca", kgMonth: 5, lastFilterChange: dateStr(15), machineBrand: "Gaggia", machineModel: "Classic Pro", machineSerial: "GG-CP-2020-033", molinoBrand: "Baratza", molinoModel: "Preciso", molinoSerial: "BZ-P-0294", status: "activo", notes: "" },
  ];

  // Orders spread over last 30 days
  const allClientIds = [
    { id: "co1", name: "Café Amaranto",     type: "comodato" as const },
    { id: "co2", name: "Roastery Palermo",  type: "comodato" as const },
    { id: "co3", name: "Tostado Café Club", type: "comodato" as const },
    { id: "cl1", name: "Espresso House",    type: "propio" as const },
    { id: "cl2", name: "Kaffa Brew Bar",    type: "propio" as const },
    { id: "cl3", name: "La Molienda Vieja", type: "propio" as const },
    { id: "cl4", name: "Norte Café",        type: "propio" as const },
  ];
  const coffeeTypes = ["Colombia Huila", "Brasil Cerrado Natural", "Etiopía Yirgacheffe", "Perú Cajamarca", "Bolivia Caranavi"];
  const statuses: Order["status"][] = ["entregado", "entregado", "entregado", "confirmado", "pendiente"];

  const orders: Order[] = Array.from({ length: 20 }, (_, i) => {
    const cli = allClientIds[i % allClientIds.length];
    const coffee = coffeeTypes[i % coffeeTypes.length];
    const kgQty = [2, 3, 5, 10, 12, 8, 6, 4][i % 8];
    const hasSyrup = i % 3 === 0;
    const lines: OrderLine[] = [
      { id: id(), description: coffee, category: "Café", qty: kgQty, unit: "kg", unitPrice: 12500 },
      ...(hasSyrup ? [{ id: id(), description: "Syrup Vainilla", category: "Syrups", qty: 2, unit: "botella", unitPrice: 2800 }] : []),
    ];
    return {
      id: id(), date: dateStr(i * 1.5 | 0),
      clientId: cli.id, clientName: cli.name, clientType: cli.type,
      lines, total: lines.reduce((s, l) => s + l.qty * l.unitPrice, 0),
      kgCafe: kgQty, status: statuses[i % statuses.length],
      notes: i % 4 === 0 ? "Entrega en horario de tarde" : "",
    };
  });

  return { machines, molinos, comodatos, clientes, orders };
}

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
  const [products, setProducts]   = useState<AdminProduct[]>([]);

  useEffect(() => {
    if (sessionStorage.getItem(KEY_AUTH) === "1") setAuthed(true);
    try {
      const m  = localStorage.getItem(KEY_MACHINES);
      const mo = localStorage.getItem(KEY_MOLINOS);
      const c  = localStorage.getItem(KEY_COMODATOS);
      const cl = localStorage.getItem(KEY_CLIENTES);
      const or = localStorage.getItem(KEY_ORDERS);
      const pr = localStorage.getItem(KEY_PRODUCTS);
      if (m)  setMachines(JSON.parse(m));
      if (mo) setMolinos(JSON.parse(mo));
      if (c)  setComodatos(JSON.parse(c));
      if (cl) setClientes(JSON.parse(cl));
      if (or) setOrders(JSON.parse(or));
      if (pr) setProducts(JSON.parse(pr));
    } catch { /* empty */ }
  }, []);

  const setMachinesP  = (l: Machine[])       => { setMachines(l);  try { localStorage.setItem(KEY_MACHINES,  JSON.stringify(l)); } catch { /**/ } };
  const setMolinosP   = (l: Molino[])        => { setMolinos(l);   try { localStorage.setItem(KEY_MOLINOS,   JSON.stringify(l)); } catch { /**/ } };
  const setOrdersP    = (l: Order[])         => { setOrders(l);    try { localStorage.setItem(KEY_ORDERS,    JSON.stringify(l)); } catch { /**/ } };

  const loadDemo = () => {
    const d = buildDemoData();
    setMachinesP(d.machines); setMolinosP(d.molinos);
    setComodatos(d.comodatos); try { localStorage.setItem(KEY_COMODATOS, JSON.stringify(d.comodatos)); } catch { /**/ }
    setClientes(d.clientes);  try { localStorage.setItem(KEY_CLIENTES,  JSON.stringify(d.clientes));  } catch { /**/ }
    setOrdersP(d.orders);
  };
  const hasData = machines.length + molinos.length + comodatos.length + clientes.length + orders.length > 0;

  const login = () => {
    if (pass === ADMIN_PASS) { sessionStorage.setItem(KEY_AUTH, "1"); setAuthed(true); }
    else setPassErr(true);
  };

  if (!authed) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "stretch",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}>
        {/* ── Left: dark coffee panel ─────────────────────────────────── */}
        <div style={{
          flex: "0 0 46%", position: "relative", overflow: "hidden",
          background: "#0F0A06",
        }}>
          {/* Coffee photo as background */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "url('https://images.unsplash.com/photo-1690983323458-ec4a54fc9552?w=900&q=85')",
            backgroundSize: "cover", backgroundPosition: "center",
            opacity: 0.65,
          }} />
          {/* Gradient overlay — dark at bottom for text legibility, lighter at top */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,5,2,.95) 0%, rgba(10,5,2,.45) 55%, rgba(10,5,2,.15) 100%)" }} />

          {/* Content */}
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", padding: "44px 48px" }}>
            {/* Top: logo mark */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.accent }} />
              <span style={{ color: "rgba(255,255,255,.35)", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 600 }}>Sistema de gestión</span>
            </div>

            {/* Bottom: brand */}
            <div>
              <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: C.accent, fontWeight: 700, marginBottom: 14 }}>Origen · Tostadores</div>
              <h2 style={{ fontSize: 34, fontWeight: 800, color: "#fff", lineHeight: 1.15, letterSpacing: "-.03em", marginBottom: 16 }}>
                Gestioná tu<br/>negocio de café<br/>en un solo lugar.
              </h2>
              <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
                {["Catálogo", "Pedidos", "Clientes", "Comodatos"].map(t => (
                  <span key={t} style={{ fontSize: 11.5, color: "rgba(255,255,255,.38)", fontWeight: 500 }}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: login form ────────────────────────────────────────── */}
        <div style={{ flex: 1, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 40px" }}>
          <div style={{ width: "100%", maxWidth: 360 }}>

            {/* Logo */}
            <img src="/logo-origen.svg" alt="Origen Tostadores" style={{ height: 38, display: "block", marginBottom: 44 }} />

            {/* Heading */}
            <div style={{ marginBottom: 36 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0F172A", letterSpacing: "-.04em", lineHeight: 1.2, marginBottom: 8 }}>
                Bienvenido de vuelta
              </h1>
              <p style={{ fontSize: 14, color: "#94A3B8", lineHeight: 1.5 }}>
                Ingresá tu contraseña para acceder al panel.
              </p>
            </div>

            {/* Password field */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 7, letterSpacing: ".01em" }}>
                Contraseña
              </label>
              <input
                style={{
                  width: "100%", border: `1.5px solid ${passErr ? C.red : "#E2E8F0"}`,
                  borderRadius: 8, padding: "12px 14px", fontSize: 15,
                  outline: "none", background: "#fff", color: "#0F172A",
                  fontFamily: "inherit", transition: "border-color .15s, box-shadow .15s",
                  boxSizing: "border-box",
                }}
                type="password" placeholder="••••••••" value={pass}
                onChange={e => { setPass(e.target.value); setPassErr(false); }}
                onKeyDown={e => e.key === "Enter" && login()}
                autoFocus
              />
              {passErr && <p style={{ fontSize: 12, color: C.red, marginTop: 6, fontWeight: 500 }}>Contraseña incorrecta. Intentá de nuevo.</p>}
            </div>

            {/* Submit */}
            <button
              onClick={login}
              style={{
                width: "100%", padding: "13px 0", fontSize: 14.5, fontWeight: 700,
                background: "#0F172A", color: "#fff", border: "none", borderRadius: 8,
                cursor: "pointer", fontFamily: "inherit", letterSpacing: "-.01em",
                transition: "opacity .15s",
              }}
            >
              Ingresar al panel
            </button>

            {/* Demo badge */}
            <div style={{
              marginTop: 28, padding: "14px 18px",
              background: "#FFFBF5", borderRadius: 10,
              border: "1.5px dashed #E8C99A",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <p style={{ fontSize: 10.5, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 3 }}>
                  Acceso demo
                </p>
                <p style={{ fontSize: 18, fontWeight: 800, color: C.accent, letterSpacing: ".04em", fontFamily: "monospace" }}>
                  {ADMIN_PASS}
                </p>
              </div>
              <div style={{ fontSize: 24 }}>☕</div>
            </div>

            <p style={{ marginTop: 32, fontSize: 11.5, color: "#CBD5E1", textAlign: "center" }}>
              © {new Date().getFullYear()} Origen Tostadores · Panel interno
            </p>
          </div>
        </div>
      </div>
    );
  }

  const pendingCount = orders.filter(o => o.status === "pendiente").length;

  // Group nav items
  const groups = ["", "Clientes", "Operaciones", "Catálogo", "Inventario"];
  const byGroup = (g: string) => NAV.filter(n => (n.group ?? "") === g);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside style={{
        width: 232, flexShrink: 0, background: C.sidebar,
        display: "flex", flexDirection: "column",
        position: "sticky", top: 0, height: "100vh",
        overflow: "hidden",
      }}>
        {/* Brand */}
        <div style={{ padding: "22px 20px 18px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: C.white, flexShrink: 0, letterSpacing: "-.02em" }}>OT</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.white, lineHeight: 1.2 }}>Origen</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", letterSpacing: ".04em", textTransform: "uppercase" }}>Tostadores</div>
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(255,255,255,.07)", marginBottom: 6 }} />

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "6px 10px" }}>
          {groups.map(g => {
            const items = byGroup(g);
            if (items.length === 0) return null;
            return (
              <div key={g}>
                {g && <div style={{ fontSize: 9.5, fontWeight: 600, color: "rgba(255,255,255,.28)", letterSpacing: ".12em", textTransform: "uppercase", padding: "14px 10px 5px" }}>{g}</div>}
                {items.map(n => {
                  const isActive = tab === n.key;
                  const hasBadge = n.key === "pedidos" && pendingCount > 0;
                  return (
                    <button key={n.key} onClick={() => setTab(n.key)} style={{
                      display: "flex", alignItems: "center", gap: 9,
                      width: "100%", padding: "8px 10px", borderRadius: 7,
                      background: isActive ? C.sidebarA : "none",
                      border: "none",
                      color: isActive ? C.white : "rgba(255,255,255,.55)",
                      fontSize: 13, fontWeight: isActive ? 500 : 400,
                      cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                      marginBottom: 1, transition: "background .12s, color .12s",
                    }}>
                      <span style={{ fontSize: 14, flexShrink: 0, opacity: isActive ? 1 : .75 }}>{n.icon}</span>
                      <span style={{ flex: 1, letterSpacing: "-.01em" }}>{n.label}</span>
                      {hasBadge && (
                        <span style={{ background: C.orange, color: C.white, borderRadius: 9999, padding: "1px 7px", fontSize: 10.5, fontWeight: 600, lineHeight: "18px" }}>{pendingCount}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: "14px 10px 16px", borderTop: "1px solid rgba(255,255,255,.07)" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,.35)", textDecoration: "none", padding: "6px 10px", marginBottom: 4 }}>
            <span style={{ fontSize: 13 }}>←</span> Ver catálogo
          </a>
          <button onClick={() => { sessionStorage.removeItem(KEY_AUTH); setAuthed(false); }}
            style={{ ...S.btn, background: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.4)", padding: "7px 12px", fontSize: 12, width: "100%", border: "1px solid rgba(255,255,255,.08)" }}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Content ──────────────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: "40px 44px 80px", overflowY: "auto", minWidth: 0 }}>
        {tab === "dashboard" && !hasData && (
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: "28px 32px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Sistema vacío</div>
              <div style={{ fontSize: 13, color: C.muted }}>Cargá datos de ejemplo para ver cómo funciona el panel con información real.</div>
            </div>
            <button style={{ ...S.btn, ...S.primary, whiteSpace: "nowrap" }} onClick={loadDemo}>Cargar datos demo</button>
          </div>
        )}
        {tab === "dashboard"    && <Dashboard orders={orders} comodatos={comodatos} clientes={clientes} />}
        {tab === "clientes"     && <ClientesSection comodatos={comodatos} clientes={clientes} orders={orders} machines={machines} molinos={molinos} onGoToComodatos={() => setTab("comodatos")} onGoToSoloConsumo={() => setTab("solo-consumo")} />}
        {tab === "pedidos"      && <PedidosSection orders={orders} setOrders={setOrdersP} comodatos={comodatos} clientes={clientes} />}
        {tab === "comodatos"    && <ComodatosSection records={comodatos} setRecords={setComodatos} machines={machines} molinos={molinos} />}
        {tab === "solo-consumo" && <SoloConsumoSection clientes={clientes} setClientes={setClientes} />}
        {tab === "productos"    && <ProductosSection products={products} setProducts={setProducts} />}
        {tab === "maquinas"     && <EquipSection items={machines} setItems={setMachinesP} storageKey={KEY_MACHINES} noun="máquina" title="Máquinas" description="Stock de máquinas de espresso disponibles y en comodato" />}
        {tab === "molinos"      && <EquipSection items={molinos} setItems={setMolinosP} storageKey={KEY_MOLINOS} noun="molino" title="Molinos" description="Stock de molinos disponibles y en comodato" />}
      </main>
    </div>
  );
}
