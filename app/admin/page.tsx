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

type Machine = { id: string; brand: string; model: string; serial: string; status: EquipStatus; notes: string; maintenances: Maintenance[] };
type Molino   = { id: string; brand: string; model: string; serial: string; status: EquipStatus; notes: string; maintenances: Maintenance[] };

type ComodatoRecord = {
  id: string; cafeteria: string; contact: string; phone: string; address: string;
  machineId: string; molinoId: string;
  installDate: string; minKgMonth: number; coffeeType: string; lastFilterChange: string;
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

type OrderLine = {
  id: string;
  description: string;
  category: "Café" | "Syrups" | "Salsas" | "Accesorios" | "Otro";
  qty: number;
  unit: "kg" | "u." | "botella" | "caja";
  unitPrice: number;
};

type Order = {
  id: string;
  date: string;
  clientId: string;
  clientName: string;
  clientType: "comodato" | "propio" | "otro";
  lines: OrderLine[];
  total: number;
  kgCafe: number;
  status: "pendiente" | "confirmado" | "entregado" | "cancelado";
  notes: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const FMT = (n: number) => "$ " + n.toLocaleString("es-AR", { maximumFractionDigits: 0 });

const calcOrderTotal = (lines: OrderLine[]) =>
  lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);

const calcOrderKg = (lines: OrderLine[]) =>
  lines.filter(l => l.category === "Café" && l.unit === "kg")
    .reduce((s, l) => s + l.qty, 0);

const thisMonth = () => new Date().toISOString().slice(0, 7); // "2026-10"

const daysSince = (d: string) => d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : null;

// ── Shared UI ─────────────────────────────────────────────────────────────────
const S = {
  input:  { width: "100%", border: "1.5px solid #DDD5C8", borderRadius: 3, padding: "8px 11px", fontSize: 14, outline: "none", background: "#fff", color: "#1A0E05", fontFamily: "inherit" } as React.CSSProperties,
  select: { width: "100%", border: "1.5px solid #DDD5C8", borderRadius: 3, padding: "8px 11px", fontSize: 14, outline: "none", background: "#fff", color: "#1A0E05", fontFamily: "inherit" } as React.CSSProperties,
  btn:        { border: "none", borderRadius: 3, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" } as React.CSSProperties,
  btnPrimary: { background: "#1A0E05", color: "#fff" } as React.CSSProperties,
  btnAccent:  { background: "#C4843A", color: "#fff" } as React.CSSProperties,
  btnGhost:   { background: "none", border: "1.5px solid #DDD5C8", color: "#5A3E28" } as React.CSSProperties,
  btnDanger:  { background: "none", border: "1.5px solid #DDD5C8", color: "#CC3300" } as React.CSSProperties,
  card: { background: "#fff", border: "1px solid #DDD5C8", borderRadius: 6, padding: "20px 22px", marginBottom: 10 } as React.CSSProperties,
  formBox: { background: "#FBF8F4", border: "1.5px solid #C4843A40", borderRadius: 6, padding: 24, marginBottom: 20 } as React.CSSProperties,
  section: { fontSize: 11, fontWeight: 700, color: "#A08060", letterSpacing: ".08em", textTransform: "uppercase" as const, marginBottom: 12 },
  divider: { height: 1, background: "#EAE4DC", margin: "20px 0" } as React.CSSProperties,
};

const badge = (color: string, text: string) => (
  <span style={{
    display: "inline-block",
    background: color + "18", color, border: `1px solid ${color}40`,
    borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600, letterSpacing: ".04em",
  }}>{text}</span>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#5A3E28", marginBottom: 5, letterSpacing: ".04em" }}>{label}</label>
    {children}
  </div>
);

const Grid = ({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14 }}>{children}</div>
);

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = "#1A0E05", icon }: {
  label: string; value: string | number; sub?: string; color?: string; icon: string;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid #DDD5C8", borderRadius: 8, padding: "20px 22px" }}>
      <div style={{ fontSize: 24, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, color: "#5A3E28", marginTop: 5, fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#A08060", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ── Consumption bar ───────────────────────────────────────────────────────────
function ConsumptionBar({ name, actual, target, phone }: { name: string; actual: number; target: number; phone?: string }) {
  const pct = target > 0 ? Math.min((actual / target) * 100, 100) : 0;
  const over = target > 0 && actual > target;
  const color = pct < 60 ? "#CC3300" : pct < 90 ? "#C4843A" : "#1A7A3A";

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#1A0E05" }}>{name}</span>
          {phone && <span style={{ fontSize: 12, color: "#A08060", marginLeft: 8 }}>{phone}</span>}
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color }}>
            {actual.toFixed(1)} kg
          </span>
          <span style={{ fontSize: 12, color: "#A08060" }}> / {target} kg mín.</span>
          {over && <span style={{ fontSize: 11, color: "#1A7A3A", marginLeft: 6 }}>✓ +{(actual - target).toFixed(1)} kg</span>}
        </div>
      </div>
      <div style={{ background: "#EAE4DC", borderRadius: 4, height: 8, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 4,
          width: `${pct}%`,
          background: color,
          transition: "width .4s ease",
        }} />
      </div>
      <div style={{ fontSize: 11, color, marginTop: 3 }}>
        {target === 0 ? "Sin compromiso definido" : `${pct.toFixed(0)}% del compromiso mensual`}
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({
  orders, comodatos, clientes,
}: {
  orders: Order[];
  comodatos: ComodatoRecord[];
  clientes: ClientePropio[];
}) {
  const month = thisMonth();
  const monthOrders = orders.filter(o => o.date.startsWith(month));
  const activeComodatos = comodatos.filter(c => c.status === "activo");

  // KPIs
  const totalPedidosMes  = monthOrders.length;
  const totalKgMes       = monthOrders.reduce((s, o) => s + o.kgCafe, 0);
  const totalVentasMes   = monthOrders.reduce((s, o) => s + o.total, 0);
  const pedidosPendientes = orders.filter(o => o.status === "pendiente").length;

  // Consumption per comodato client this month
  const consumoByClient: Record<string, number> = {};
  monthOrders.forEach(o => {
    if (o.clientId && o.kgCafe > 0) {
      consumoByClient[o.clientId] = (consumoByClient[o.clientId] ?? 0) + o.kgCafe;
    }
  });

  // Top clients by kg this month
  const allClients = [
    ...activeComodatos.map(c => ({ id: c.id, name: c.cafeteria, phone: c.phone, type: "comodato" as const })),
    ...clientes.filter(c => c.status === "activo").map(c => ({ id: c.id, name: c.cafeteria, phone: c.phone, type: "propio" as const })),
  ];
  const ranking = [...allClients]
    .map(c => ({ ...c, kg: consumoByClient[c.id] ?? 0 }))
    .sort((a, b) => b.kg - a.kg)
    .filter(c => c.kg > 0)
    .slice(0, 8);

  // Revenue by category this month
  const catRevenue: Record<string, number> = {};
  monthOrders.forEach(o => o.lines.forEach(l => {
    catRevenue[l.category] = (catRevenue[l.category] ?? 0) + l.qty * l.unitPrice;
  }));

  const monthLabel = new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        <KpiCard icon="📦" label="Pedidos este mes" value={totalPedidosMes} sub={monthLabel} />
        <KpiCard icon="☕" label="Kg café este mes" value={`${totalKgMes.toFixed(1)} kg`} color="#C4843A" />
        <KpiCard icon="💰" label="Facturación estimada" value={FMT(totalVentasMes)} color="#1A7A3A" sub={monthLabel} />
        <KpiCard icon="⏳" label="Pedidos pendientes" value={pedidosPendientes} color={pedidosPendientes > 0 ? "#CC5500" : "#1A0E05"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>

        {/* Consumption indicators */}
        <div style={{ background: "#fff", border: "1px solid #DDD5C8", borderRadius: 8, padding: "22px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>Consumo vs. compromiso</h2>
            <span style={{ fontSize: 12, color: "#A08060" }}>{monthLabel}</span>
          </div>
          {activeComodatos.filter(c => c.minKgMonth > 0).length === 0 ? (
            <p style={{ fontSize: 13, color: "#A08060", padding: "20px 0" }}>No hay comodatos activos con compromiso de consumo</p>
          ) : (
            activeComodatos.filter(c => c.minKgMonth > 0).map(c => (
              <ConsumptionBar
                key={c.id}
                name={c.cafeteria}
                phone={c.phone}
                actual={consumoByClient[c.id] ?? 0}
                target={c.minKgMonth}
              />
            ))
          )}
        </div>

        {/* Ranking */}
        <div style={{ background: "#fff", border: "1px solid #DDD5C8", borderRadius: 8, padding: "22px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>Ranking de clientes</h2>
            <span style={{ fontSize: 12, color: "#A08060" }}>por kg este mes</span>
          </div>
          {ranking.length === 0 ? (
            <p style={{ fontSize: 13, color: "#A08060", padding: "20px 0" }}>Sin pedidos registrados este mes</p>
          ) : (
            ranking.map((c, i) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  background: i === 0 ? "#C4843A" : i === 1 ? "#8B6030" : i === 2 ? "#A08060" : "#EAE4DC",
                  color: i < 3 ? "#fff" : "#5A3E28",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700,
                }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "#A08060" }}>{c.type === "comodato" ? "Comodato" : "Máquina propia"}</div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#C4843A" }}>{c.kg.toFixed(1)} kg</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Revenue by category */}
      {Object.keys(catRevenue).length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #DDD5C8", borderRadius: 8, padding: "22px 24px", marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Ventas por categoría — {monthLabel}</h2>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {Object.entries(catRevenue).sort((a, b) => b[1] - a[1]).map(([cat, rev]) => {
              const pct = totalVentasMes > 0 ? (rev / totalVentasMes) * 100 : 0;
              return (
                <div key={cat} style={{ flex: "1 1 140px", background: "#F5F0E8", borderRadius: 6, padding: "14px 16px" }}>
                  <div style={{ fontSize: 12, color: "#A08060", marginBottom: 4 }}>{cat}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#1A0E05" }}>{FMT(rev)}</div>
                  <div style={{ fontSize: 11, color: "#C4843A", marginTop: 2 }}>{pct.toFixed(0)}% del total</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent orders */}
      <div style={{ background: "#fff", border: "1px solid #DDD5C8", borderRadius: 8, padding: "22px 24px" }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Últimos pedidos</h2>
        {orders.length === 0 ? (
          <p style={{ fontSize: 13, color: "#A08060" }}>Sin pedidos registrados</p>
        ) : (
          [...orders].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6).map(o => {
            const stColor = { pendiente: "#CC5500", confirmado: "#C4843A", entregado: "#1A7A3A", cancelado: "#999" }[o.status];
            return (
              <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "11px 0", borderBottom: "1px solid #EAE4DC" }}>
                <div style={{ width: 72, fontSize: 12, color: "#A08060", flexShrink: 0 }}>{o.date}</div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{o.clientName}</span>
                  <span style={{ fontSize: 12, color: "#A08060", marginLeft: 8 }}>{o.lines.length} ítem{o.lines.length !== 1 ? "s" : ""}</span>
                  {o.kgCafe > 0 && <span style={{ fontSize: 12, color: "#C4843A", marginLeft: 8 }}>☕ {o.kgCafe} kg</span>}
                </div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{FMT(o.total)}</div>
                {badge(stColor, o.status.charAt(0).toUpperCase() + o.status.slice(1))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Order form ────────────────────────────────────────────────────────────────
const BLANK_ORDER: Omit<Order, "id" | "total" | "kgCafe"> = {
  date: new Date().toISOString().slice(0, 10),
  clientId: "", clientName: "", clientType: "otro",
  lines: [], status: "pendiente", notes: "",
};

function OrderForm({
  initial, comodatos, clientes, onSave, onCancel,
}: {
  initial?: Order;
  comodatos: ComodatoRecord[];
  clientes: ClientePropio[];
  onSave: (o: Omit<Order, "id">) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Omit<Order, "id" | "total" | "kgCafe">>(
    initial ? { date: initial.date, clientId: initial.clientId, clientName: initial.clientName, clientType: initial.clientType, lines: initial.lines, status: initial.status, notes: initial.notes }
            : { ...BLANK_ORDER }
  );

  const blankLine = (): OrderLine => ({ id: uid(), description: "", category: "Café", qty: 1, unit: "kg", unitPrice: 0 });
  const [lines, setLines] = useState<OrderLine[]>(initial?.lines ?? [blankLine()]);

  const allClients = [
    ...comodatos.filter(c => c.status === "activo").map(c => ({ id: c.id, name: c.cafeteria, type: "comodato" as const })),
    ...clientes.filter(c => c.status === "activo").map(c => ({ id: c.id, name: c.cafeteria, type: "propio" as const })),
  ];

  const selectClient = (id: string) => {
    if (!id) { setForm(f => ({ ...f, clientId: "", clientName: "", clientType: "otro" })); return; }
    const c = allClients.find(x => x.id === id);
    if (c) setForm(f => ({ ...f, clientId: c.id, clientName: c.name, clientType: c.type }));
  };

  const setLine = (idx: number, key: keyof OrderLine, val: string | number) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [key]: val } : l));
  };

  const total  = calcOrderTotal(lines);
  const kgCafe = calcOrderKg(lines);

  const save = () => {
    if (!form.clientName.trim()) return;
    onSave({ ...form, lines, total, kgCafe });
  };

  return (
    <div style={S.formBox}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 18 }}>{initial ? "Editar pedido" : "Nuevo pedido"}</h3>

      <Grid>
        <Field label="Cliente">
          <select style={S.select} value={form.clientId} onChange={e => selectClient(e.target.value)}>
            <option value="">— Cliente no registrado —</option>
            <optgroup label="Comodatos activos">
              {comodatos.filter(c => c.status === "activo").map(c => <option key={c.id} value={c.id}>{c.cafeteria}</option>)}
            </optgroup>
            <optgroup label="Solo consumo activos">
              {clientes.filter(c => c.status === "activo").map(c => <option key={c.id} value={c.id}>{c.cafeteria}</option>)}
            </optgroup>
          </select>
        </Field>
        <Field label={form.clientId ? "Nombre (automático)" : "Nombre del cliente *"}>
          <input style={S.input} value={form.clientName} readOnly={!!form.clientId}
            onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
            placeholder="ej. Café Amaranto" />
        </Field>
        <Field label="Fecha">
          <input style={S.input} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        </Field>
        <Field label="Estado">
          <select style={S.select} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Order["status"] }))}>
            <option value="pendiente">Pendiente</option>
            <option value="confirmado">Confirmado</option>
            <option value="entregado">Entregado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </Field>
      </Grid>

      {/* Lines */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={S.section}>Líneas del pedido</div>
          <button style={{ ...S.btn, ...S.btnGhost, padding: "5px 12px", fontSize: 12 }} onClick={() => setLines(l => [...l, blankLine()])}>+ Agregar línea</button>
        </div>

        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr .8fr .8fr 1fr auto", gap: 8, marginBottom: 6 }}>
          {["Descripción", "Categoría", "Cantidad", "Unidad", "Precio unit.", ""].map(h => (
            <div key={h} style={{ fontSize: 11, fontWeight: 700, color: "#A08060", letterSpacing: ".05em", textTransform: "uppercase" }}>{h}</div>
          ))}
        </div>

        {lines.map((line, idx) => (
          <div key={line.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr .8fr .8fr 1fr auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <input style={S.input} value={line.description} placeholder="ej. Blend Espresso 1 kg" onChange={e => setLine(idx, "description", e.target.value)} />
            <select style={S.select} value={line.category} onChange={e => setLine(idx, "category", e.target.value)}>
              {(["Café", "Syrups", "Salsas", "Accesorios", "Otro"] as const).map(c => <option key={c}>{c}</option>)}
            </select>
            <input style={{ ...S.input, textAlign: "right" }} type="number" min={0} step={.5} value={line.qty} onChange={e => setLine(idx, "qty", parseFloat(e.target.value) || 0)} />
            <select style={S.select} value={line.unit} onChange={e => setLine(idx, "unit", e.target.value)}>
              {(["kg", "u.", "botella", "caja"] as const).map(u => <option key={u}>{u}</option>)}
            </select>
            <input style={{ ...S.input, textAlign: "right" }} type="number" min={0} step={1} value={line.unitPrice} onChange={e => setLine(idx, "unitPrice", parseFloat(e.target.value) || 0)} />
            <button onClick={() => setLines(l => l.filter((_, i) => i !== idx))} style={{ background: "none", border: "none", color: "#CCC", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
          </div>
        ))}

        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 24, marginTop: 12, padding: "12px 0", borderTop: "1px solid #EAE4DC" }}>
          {kgCafe > 0 && <div style={{ fontSize: 13, color: "#C4843A" }}>☕ <strong>{kgCafe.toFixed(1)} kg</strong> de café</div>}
          <div style={{ fontSize: 15, fontWeight: 700 }}>Total: {FMT(total)}</div>
        </div>
      </div>

      <Field label="Notas">
        <textarea style={{ ...S.input, height: 60, resize: "vertical" }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </Field>

      <div style={{ display: "flex", gap: 10 }}>
        <button style={{ ...S.btn, ...S.btnPrimary }} disabled={!form.clientName.trim()} onClick={save}>Guardar pedido</button>
        <button style={{ ...S.btn, ...S.btnGhost }} onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// ── Orders tab ────────────────────────────────────────────────────────────────
function OrdersTab({ orders, setOrders, comodatos, clientes }: {
  orders: Order[]; setOrders: (v: Order[]) => void;
  comodatos: ComodatoRecord[]; clientes: ClientePropio[];
}) {
  const [adding, setAdding]   = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | Order["status"]>("all");
  const [search, setSearch]   = useState("");

  const persist = (list: Order[]) => {
    setOrders(list);
    try { localStorage.setItem(KEY_ORDERS, JSON.stringify(list)); } catch { /* empty */ }
  };

  const onSave  = (data: Omit<Order, "id">) => { persist([...orders, { ...data, id: uid() }]); setAdding(false); };
  const onEdit  = (data: Omit<Order, "id">) => { persist(orders.map(o => o.id === editing ? { ...data, id: editing! } : o)); setEditing(null); };
  const onDel   = (id: string) => { if (!confirm("¿Eliminar pedido?")) return; persist(orders.filter(o => o.id !== id)); };

  const STATUS_OPTS = ["all", "pendiente", "confirmado", "entregado", "cancelado"] as const;
  const STATUS_COLOR: Record<string, string> = { pendiente: "#CC5500", confirmado: "#C4843A", entregado: "#1A7A3A", cancelado: "#999" };

  const visible = orders
    .filter(o => filterStatus === "all" || o.status === filterStatus)
    .filter(o => !search || o.clientName.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      {/* Stats row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {STATUS_OPTS.filter(s => s !== "all").map(s => (
          <div key={s} style={{ background: "#fff", border: "1px solid #DDD5C8", borderRadius: 6, padding: "12px 18px", minWidth: 110, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: STATUS_COLOR[s] }}>{orders.filter(o => o.status === s).length}</div>
            <div style={{ fontSize: 12, color: "#A08060", marginTop: 2 }}>{s.charAt(0).toUpperCase() + s.slice(1)}{s !== "pendiente" ? "s" : "s"}</div>
          </div>
        ))}
        <button style={{ ...S.btn, ...S.btnAccent, marginLeft: "auto", alignSelf: "center" }} onClick={() => { setAdding(true); setEditing(null); }}>
          + Nuevo pedido
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", background: "#fff", border: "1px solid #DDD5C8", borderRadius: 4 }}>
          {STATUS_OPTS.map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              padding: "7px 14px", fontSize: 12, fontFamily: "inherit", cursor: "pointer",
              background: filterStatus === s ? "#1A0E05" : "none",
              color: filterStatus === s ? "#fff" : "#5A3E28",
              border: "none", borderRadius: 2,
            }}>
              {s === "all" ? "Todos" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <input
          style={{ ...S.input, width: 220, flex: "0 0 auto" }}
          placeholder="Buscar cliente…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {adding && <OrderForm comodatos={comodatos} clientes={clientes} onSave={onSave} onCancel={() => setAdding(false)} />}

      {visible.length === 0 && !adding && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#A08060" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📦</div>
          <p>No hay pedidos {filterStatus !== "all" ? `"${filterStatus}"` : "registrados"}</p>
        </div>
      )}

      {visible.map(o => {
        const stColor = STATUS_COLOR[o.status] ?? "#999";
        return editing === o.id ? (
          <OrderForm key={o.id} initial={o} comodatos={comodatos} clientes={clientes} onSave={onEdit} onCancel={() => setEditing(null)} />
        ) : (
          <div key={o.id} style={S.card}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{o.clientName}</span>
                  {badge(stColor, o.status.charAt(0).toUpperCase() + o.status.slice(1))}
                  <span style={{ fontSize: 12, color: "#A08060" }}>{o.date}</span>
                </div>
                <div style={{ display: "flex", gap: 20, fontSize: 13, color: "#5A3E28", flexWrap: "wrap" }}>
                  <span>{o.lines.length} ítem{o.lines.length !== 1 ? "s" : ""}</span>
                  {o.kgCafe > 0 && <span>☕ {o.kgCafe.toFixed(1)} kg café</span>}
                  <span style={{ fontWeight: 700 }}>{FMT(o.total)}</span>
                </div>
                {/* Lines summary */}
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {o.lines.map(l => (
                    <span key={l.id} style={{ fontSize: 12, background: "#F5F0E8", borderRadius: 3, padding: "3px 9px", color: "#5A3E28" }}>
                      {l.description || l.category} × {l.qty} {l.unit}
                    </span>
                  ))}
                </div>
                {o.notes && <p style={{ fontSize: 12, color: "#A08060", marginTop: 6 }}>{o.notes}</p>}
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button style={{ ...S.btn, ...S.btnGhost, padding: "6px 14px" }} onClick={() => { setEditing(o.id); setAdding(false); }}>Editar</button>
                <button style={{ ...S.btn, ...S.btnDanger, padding: "6px 14px" }} onClick={() => onDel(o.id)}>×</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Maintenance section ───────────────────────────────────────────────────────
function MaintenanceSection({ maintenances, onChange }: { maintenances: Maintenance[]; onChange: (l: Maintenance[]) => void }) {
  const [open, setOpen] = useState(false);
  const blank = { date: new Date().toISOString().slice(0, 10), type: "Preventivo", description: "", technician: "" };
  const [form, setForm] = useState(blank);

  const add = () => {
    if (!form.description.trim()) return;
    onChange([...maintenances, { ...form, id: uid() }]);
    setForm(blank);
    setOpen(false);
  };

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={S.section}>Mantenimientos ({maintenances.length})</div>
        <button style={{ ...S.btn, ...S.btnGhost, padding: "5px 12px", fontSize: 12 }} onClick={() => setOpen(o => !o)}>
          {open ? "Cancelar" : "+ Registrar"}
        </button>
      </div>
      {open && (
        <div style={{ background: "#F8F4EF", borderRadius: 3, padding: 14, marginBottom: 10 }}>
          <Grid>
            <Field label="Fecha"><input style={S.input} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></Field>
            <Field label="Tipo">
              <select style={S.select} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {["Preventivo", "Correctivo", "Limpieza", "Cambio de pieza", "Calibración", "Otro"].map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
          </Grid>
          <Field label="Descripción *">
            <textarea style={{ ...S.input, height: 56, resize: "vertical" }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Trabajo realizado" />
          </Field>
          <Field label="Técnico">
            <input style={S.input} value={form.technician} onChange={e => setForm(f => ({ ...f, technician: e.target.value }))} />
          </Field>
          <button style={{ ...S.btn, ...S.btnPrimary }} onClick={add}>Guardar</button>
        </div>
      )}
      {maintenances.length === 0 ? (
        <p style={{ fontSize: 12, color: "#A08060" }}>Sin mantenimientos registrados</p>
      ) : (
        [...maintenances].reverse().map(m => (
          <div key={m.id} style={{ display: "flex", gap: 12, paddingBottom: 10, marginBottom: 10, borderBottom: "1px solid #EDE8E0" }}>
            <div style={{ flexShrink: 0, minWidth: 54, fontSize: 11, color: "#A08060" }}>{m.date}</div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 11, background: "#F0EBE3", color: "#5A3E28", borderRadius: 2, padding: "1px 7px", fontWeight: 600 }}>{m.type}</span>
              <p style={{ fontSize: 13, color: "#1A0E05", marginTop: 4 }}>{m.description}</p>
              {m.technician && <p style={{ fontSize: 11, color: "#A08060", marginTop: 2 }}>Técnico: {m.technician}</p>}
            </div>
            <button onClick={() => onChange(maintenances.filter(x => x.id !== m.id))} style={{ background: "none", border: "none", color: "#CCC", fontSize: 16, cursor: "pointer" }}>×</button>
          </div>
        ))
      )}
    </div>
  );
}

// ── Equipment form panel ──────────────────────────────────────────────────────
function EquipFormPanel<T extends Machine | Molino>({
  initial, onSave, onCancel, title,
}: { initial?: T; onSave: (d: Omit<T, "id">) => void; onCancel: () => void; title: string }) {
  const blank = { brand: "", model: "", serial: "", status: "disponible" as EquipStatus, notes: "", maintenances: [] as Maintenance[] };
  const [form, setForm] = useState(initial ? { ...blank, ...initial } : { ...blank });

  return (
    <div style={S.formBox}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 18 }}>{title}</h3>
      <Grid>
        <Field label="Marca *"><input style={S.input} value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="ej. La Marzocco" /></Field>
        <Field label="Modelo *"><input style={S.input} value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="ej. Linea Classic" /></Field>
        <Field label="N° de serie *"><input style={S.input} value={form.serial} onChange={e => setForm(f => ({ ...f, serial: e.target.value }))} /></Field>
        <Field label="Estado">
          <select style={S.select} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as EquipStatus }))}>
            {(["disponible", "en_comodato", "mantenimiento", "baja"] as EquipStatus[]).map(k => (
              <option key={k} value={k}>{{ disponible: "Disponible", en_comodato: "En comodato", mantenimiento: "Mantenimiento", baja: "Baja" }[k]}</option>
            ))}
          </select>
        </Field>
      </Grid>
      <Field label="Notas"><textarea style={{ ...S.input, height: 60, resize: "vertical" }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></Field>
      <div style={S.divider} />
      <MaintenanceSection maintenances={form.maintenances} onChange={list => setForm(f => ({ ...f, maintenances: list }))} />
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button style={{ ...S.btn, ...S.btnPrimary }} disabled={!form.brand || !form.model || !form.serial} onClick={() => (form.brand && form.model && form.serial) && onSave(form as Omit<T, "id">)}>Guardar</button>
        <button style={{ ...S.btn, ...S.btnGhost }} onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// ── Equipment tab ─────────────────────────────────────────────────────────────
function EquipTab<T extends Machine | Molino>({
  items, setItems, storageKey, noun,
}: { items: T[]; setItems: (v: T[]) => void; storageKey: string; noun: string }) {
  const [adding, setAdding]     = useState(false);
  const [editing, setEditing]   = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const ESTATUS_LABEL: Record<EquipStatus, string> = { disponible: "Disponible", en_comodato: "En comodato", mantenimiento: "Mantenimiento", baja: "Baja" };
  const ESTATUS_COLOR: Record<EquipStatus, string> = { disponible: "#1A7A3A", en_comodato: "#C4843A", mantenimiento: "#8B5010", baja: "#999" };

  const persist = (list: T[]) => { setItems(list); try { localStorage.setItem(storageKey, JSON.stringify(list)); } catch { /* empty */ } };
  const onAdd   = (d: Omit<T, "id">) => { persist([...items, { ...d, id: uid() } as T]); setAdding(false); };
  const onEdit  = (d: Omit<T, "id">) => { persist(items.map(i => i.id === editing ? { ...d, id: editing } as T : i)); setEditing(null); };
  const onDel   = (id: string) => { if (!confirm("¿Eliminar?")) return; persist(items.filter(i => i.id !== id)); };
  const updMaint= (id: string, list: Maintenance[]) => persist(items.map(i => i.id === id ? { ...i, maintenances: list } : i));

  const stats = (["disponible", "en_comodato", "mantenimiento", "baja"] as EquipStatus[])
    .map(k => ({ key: k, label: ESTATUS_LABEL[k], count: items.filter(i => i.status === k).length }));

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {stats.map(st => (
          <div key={st.key} style={{ background: "#fff", border: "1px solid #DDD5C8", borderRadius: 6, padding: "12px 18px", minWidth: 120, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: ESTATUS_COLOR[st.key] }}>{st.count}</div>
            <div style={{ fontSize: 12, color: "#A08060", marginTop: 2 }}>{st.label}</div>
          </div>
        ))}
        <button style={{ ...S.btn, ...S.btnAccent, marginLeft: "auto", alignSelf: "center" }} onClick={() => { setAdding(true); setEditing(null); }}>
          + Agregar {noun}
        </button>
      </div>

      {adding && <EquipFormPanel title={`Nueva ${noun}`} onSave={onAdd as (d: Omit<Machine | Molino, "id">) => void} onCancel={() => setAdding(false)} />}

      {items.length === 0 && !adding && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#A08060" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📦</div>
          <p>No hay {noun}s registrados</p>
        </div>
      )}

      {items.map(item =>
        editing === item.id ? (
          <EquipFormPanel key={item.id} title={`Editar ${noun}`} initial={item}
            onSave={onEdit as (d: Omit<Machine | Molino, "id">) => void}
            onCancel={() => setEditing(null)} />
        ) : (
          <div key={item.id} style={S.card}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{item.brand} {item.model}</span>
                  {badge(ESTATUS_COLOR[item.status], ESTATUS_LABEL[item.status])}
                  {item.maintenances.length > 0 && badge("#5A3E28", `${item.maintenances.length} mant.`)}
                </div>
                <div style={{ fontSize: 13, color: "#5A3E28" }}>S/N: <strong>{item.serial}</strong></div>
                {item.maintenances.length > 0 && (
                  <div style={{ fontSize: 12, color: "#A08060", marginTop: 3 }}>
                    Último: {[...item.maintenances].sort((a, b) => b.date.localeCompare(a.date))[0].date} — {[...item.maintenances].sort((a, b) => b.date.localeCompare(a.date))[0].type}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button style={{ ...S.btn, ...S.btnGhost, padding: "6px 12px", fontSize: 12 }} onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
                  {expanded === item.id ? "Ocultar" : "Mantenimiento"}
                </button>
                <button style={{ ...S.btn, ...S.btnGhost, padding: "6px 12px" }} onClick={() => { setEditing(item.id); setAdding(false); setExpanded(null); }}>Editar</button>
                <button style={{ ...S.btn, ...S.btnDanger, padding: "6px 12px" }} onClick={() => onDel(item.id)}>×</button>
              </div>
            </div>
            {expanded === item.id && (
              <div style={{ marginTop: 14, borderTop: "1px solid #EDE8E0", paddingTop: 14 }}>
                <MaintenanceSection maintenances={item.maintenances} onChange={list => updMaint(item.id, list)} />
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}

// ── InfoBox helper ────────────────────────────────────────────────────────────
function InfoBox({ title, children, alert }: { title: string; children: React.ReactNode; alert?: boolean }) {
  return (
    <div style={{ background: alert ? "#FFF0EE" : "#F5F0E8", border: alert ? "1px solid #CC330030" : "none", borderRadius: 4, padding: "8px 12px", fontSize: 12, minWidth: 110 }}>
      <div style={{ fontWeight: 700, color: "#A08060", marginBottom: 3, textTransform: "uppercase", letterSpacing: ".05em", fontSize: 10 }}>{title}</div>
      <div style={{ color: "#1A0E05", lineHeight: 1.55 }}>{children}</div>
    </div>
  );
}

// ── Comodato form ─────────────────────────────────────────────────────────────
const BLANK_COM: Omit<ComodatoRecord, "id"> = {
  cafeteria: "", contact: "", phone: "", address: "",
  machineId: "", molinoId: "",
  installDate: new Date().toISOString().slice(0, 10),
  minKgMonth: 5, coffeeType: "", lastFilterChange: "",
  contractSigned: false, contractFileName: "", contractFileData: "",
  status: "activo", notes: "",
};

function ComodatoForm({ initial, machines, molinos, onSave, onCancel }: {
  initial?: ComodatoRecord; machines: Machine[]; molinos: Molino[];
  onSave: (d: Omit<ComodatoRecord, "id">) => void; onCancel: () => void;
}) {
  const [form, setForm] = useState<Omit<ComodatoRecord, "id">>(initial ? { ...initial } : { ...BLANK_COM });
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState("");
  const set = (k: keyof typeof BLANK_COM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setFileError("Supera 5 MB"); return; }
    setFileError("");
    const reader = new FileReader();
    reader.onload = ev => setForm(f => ({ ...f, contractFileName: file.name, contractFileData: ev.target?.result as string ?? "" }));
    reader.readAsDataURL(file);
  };

  const avMachines = machines.filter(m => m.status === "disponible" || m.id === form.machineId);
  const avMolinos  = molinos.filter(m => m.status === "disponible" || m.id === form.molinoId);

  return (
    <div style={S.formBox}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 18 }}>{initial ? "Editar comodato" : "Nuevo comodato"}</h3>
      <div style={S.section}>Cliente</div>
      <Grid>
        <Field label="Cafetería *"><input style={S.input} value={form.cafeteria} onChange={set("cafeteria")} placeholder="ej. Café Amaranto" /></Field>
        <Field label="Contacto"><input style={S.input} value={form.contact} onChange={set("contact")} /></Field>
        <Field label="Teléfono"><input style={S.input} value={form.phone} onChange={set("phone")} /></Field>
        <Field label="Dirección"><input style={S.input} value={form.address} onChange={set("address")} /></Field>
      </Grid>
      <div style={S.divider} />
      <div style={S.section}>Equipos asignados</div>
      <Grid>
        <Field label="Máquina">
          <select style={S.select} value={form.machineId} onChange={set("machineId")}>
            <option value="">— Sin asignar —</option>
            {avMachines.map(m => <option key={m.id} value={m.id}>{m.brand} {m.model} · {m.serial}</option>)}
          </select>
        </Field>
        <Field label="Molino">
          <select style={S.select} value={form.molinoId} onChange={set("molinoId")}>
            <option value="">— Sin asignar —</option>
            {avMolinos.map(m => <option key={m.id} value={m.id}>{m.brand} {m.model} · {m.serial}</option>)}
          </select>
        </Field>
        <Field label="Fecha de instalación"><input style={S.input} type="date" value={form.installDate} onChange={set("installDate")} /></Field>
        <Field label="Estado">
          <select style={S.select} value={form.status} onChange={set("status")}>
            <option value="activo">Activo</option>
            <option value="suspendido">Suspendido</option>
            <option value="finalizado">Finalizado</option>
          </select>
        </Field>
      </Grid>
      <div style={S.divider} />
      <div style={S.section}>Consumo</div>
      <Grid>
        <Field label="Mínimo exigido (kg/mes)">
          <input style={S.input} type="number" min={0} step={.5} value={form.minKgMonth} onChange={e => setForm(f => ({ ...f, minKgMonth: parseFloat(e.target.value) || 0 }))} />
        </Field>
        <Field label="Café que consume"><input style={S.input} value={form.coffeeType} onChange={set("coffeeType")} placeholder="ej. Blend Espresso Intenso" /></Field>
        <Field label="Último cambio de filtro de agua"><input style={S.input} type="date" value={form.lastFilterChange} onChange={set("lastFilterChange")} /></Field>
      </Grid>
      <div style={S.divider} />
      <div style={S.section}>Contrato</div>
      <Grid>
        <Field label="Estado">
          <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={form.contractSigned} onChange={e => setForm(f => ({ ...f, contractSigned: e.target.checked }))} style={{ width: 16, height: 16 }} />
            <span style={{ fontSize: 13 }}>Firmado y recibido</span>
          </label>
        </Field>
        <Field label="PDF del contrato">
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.png" style={{ display: "none" }} onChange={handleFile} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button type="button" style={{ ...S.btn, ...S.btnGhost, padding: "7px 14px" }} onClick={() => fileRef.current?.click()}>
              {form.contractFileName ? "Cambiar" : "Subir PDF"}
            </button>
            {form.contractFileName && <span style={{ fontSize: 12, color: "#5A3E28" }}>📎 {form.contractFileName}</span>}
          </div>
          {fileError && <p style={{ fontSize: 12, color: "#CC3300", marginTop: 4 }}>{fileError}</p>}
        </Field>
      </Grid>
      <Field label="Notas"><textarea style={{ ...S.input, height: 60, resize: "vertical" }} value={form.notes} onChange={set("notes")} /></Field>
      <div style={{ display: "flex", gap: 10 }}>
        <button style={{ ...S.btn, ...S.btnPrimary }} disabled={!form.cafeteria.trim()} onClick={() => form.cafeteria.trim() && onSave(form)}>Guardar</button>
        <button style={{ ...S.btn, ...S.btnGhost }} onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// ── Comodatos tab ─────────────────────────────────────────────────────────────
function ComodatosTab({ records, setRecords, machines, molinos }: {
  records: ComodatoRecord[]; setRecords: (v: ComodatoRecord[]) => void;
  machines: Machine[]; molinos: Molino[];
}) {
  const [adding, setAdding]   = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [filter, setFilter]   = useState<"all" | "activo" | "suspendido" | "finalizado">("all");

  const persist = (list: ComodatoRecord[]) => { setRecords(list); try { localStorage.setItem(KEY_COMODATOS, JSON.stringify(list)); } catch { /* empty */ } };
  const onSave  = (d: Omit<ComodatoRecord, "id">) => { persist([...records, { ...d, id: uid() }]); setAdding(false); };
  const onEdit  = (d: Omit<ComodatoRecord, "id">) => { persist(records.map(r => r.id === editing ? { ...d, id: editing! } : r)); setEditing(null); };
  const onDel   = (id: string) => { if (!confirm("¿Eliminar?")) return; persist(records.filter(r => r.id !== id)); };

  const COM_COLOR: Record<string, string> = { activo: "#1A7A3A", suspendido: "#CC5500", finalizado: "#888" };
  const visible = filter === "all" ? records : records.filter(r => r.status === filter);

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {(["activo", "suspendido", "finalizado"] as const).map(k => (
          <div key={k} style={{ background: "#fff", border: "1px solid #DDD5C8", borderRadius: 6, padding: "12px 18px", minWidth: 110, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: COM_COLOR[k] }}>{records.filter(r => r.status === k).length}</div>
            <div style={{ fontSize: 12, color: "#A08060", marginTop: 2 }}>{k.charAt(0).toUpperCase() + k.slice(1)}{k !== "finalizado" ? "s" : "s"}</div>
          </div>
        ))}
        <button style={{ ...S.btn, ...S.btnAccent, marginLeft: "auto", alignSelf: "center" }} onClick={() => { setAdding(true); setEditing(null); }}>+ Nuevo comodato</button>
      </div>
      <div style={{ display: "flex", gap: 0, marginBottom: 20, background: "#fff", border: "1px solid #DDD5C8", borderRadius: 4, width: "fit-content" }}>
        {(["all", "activo", "suspendido", "finalizado"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "7px 16px", fontSize: 12, fontFamily: "inherit", cursor: "pointer",
            background: filter === f ? "#1A0E05" : "none", color: filter === f ? "#fff" : "#5A3E28",
            border: "none", borderRadius: 2,
          }}>{f === "all" ? "Todos" : f.charAt(0).toUpperCase() + f.slice(1) + "s"}</button>
        ))}
      </div>

      {adding && <ComodatoForm machines={machines} molinos={molinos} onSave={onSave} onCancel={() => setAdding(false)} />}
      {visible.length === 0 && !adding && <div style={{ textAlign: "center", padding: "60px 0", color: "#A08060" }}><div style={{ fontSize: 40, marginBottom: 10 }}>☕</div><p>Sin comodatos</p></div>}

      {visible.map(rec => {
        const machine = machines.find(m => m.id === rec.machineId);
        const molino  = molinos.find(m => m.id === rec.molinoId);
        const fd = rec.lastFilterChange ? Math.floor((Date.now() - new Date(rec.lastFilterChange).getTime()) / 86400000) : null;
        const filterAlert = fd !== null && fd > 180;

        return editing === rec.id ? (
          <ComodatoForm key={rec.id} initial={rec} machines={machines} molinos={molinos} onSave={onEdit} onCancel={() => setEditing(null)} />
        ) : (
          <div key={rec.id} style={S.card}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{rec.cafeteria}</span>
                  {badge(COM_COLOR[rec.status], rec.status.charAt(0).toUpperCase() + rec.status.slice(1))}
                  {rec.contractSigned && badge("#1A7A3A", "✓ Contrato")}
                  {filterAlert && badge("#CC3300", "⚠ Filtro +180d")}
                </div>
                <div style={{ display: "flex", gap: 18, fontSize: 13, color: "#5A3E28", marginBottom: 10, flexWrap: "wrap" }}>
                  {rec.contact && <span>👤 {rec.contact}</span>}
                  {rec.phone   && <span>📞 {rec.phone}</span>}
                  {rec.address && <span>📍 {rec.address}</span>}
                  {rec.installDate && <span>📅 {rec.installDate}</span>}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <InfoBox title="Máquina">{machine ? <><strong>{machine.brand} {machine.model}</strong><br /><span>S/N: {machine.serial}</span></> : <span style={{ color: "#A08060" }}>—</span>}</InfoBox>
                  <InfoBox title="Molino">{molino ? <><strong>{molino.brand} {molino.model}</strong><br /><span>S/N: {molino.serial}</span></> : <span style={{ color: "#A08060" }}>—</span>}</InfoBox>
                  <InfoBox title="Compromiso"><strong>{rec.minKgMonth} kg/mes</strong>{rec.coffeeType && <><br /><span>{rec.coffeeType}</span></>}</InfoBox>
                  <InfoBox title="Filtro agua" alert={filterAlert}>
                    {rec.lastFilterChange ? <><strong>{rec.lastFilterChange}</strong><br /><span style={{ color: filterAlert ? "#CC3300" : "#A08060" }}>{fd} días</span></> : <span>—</span>}
                  </InfoBox>
                </div>
                {rec.contractFileData && <a href={rec.contractFileData} download={rec.contractFileName} style={{ fontSize: 12, color: "#C4843A", display: "inline-flex", gap: 4, marginTop: 8 }}>📎 {rec.contractFileName}</a>}
                {rec.notes && <p style={{ fontSize: 12, color: "#A08060", marginTop: 6 }}>{rec.notes}</p>}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ ...S.btn, ...S.btnGhost, padding: "6px 14px" }} onClick={() => { setEditing(rec.id); setAdding(false); }}>Editar</button>
                <button style={{ ...S.btn, ...S.btnDanger, padding: "6px 14px" }} onClick={() => onDel(rec.id)}>×</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Clientes propios tab ──────────────────────────────────────────────────────
const BLANK_CLI: Omit<ClientePropio, "id"> = {
  cafeteria: "", contact: "", phone: "", address: "",
  coffeeBrand: "", kgMonth: 0, lastFilterChange: "",
  machineBrand: "", machineModel: "", machineSerial: "",
  molinoBrand: "", molinoModel: "", molinoSerial: "",
  status: "activo", notes: "",
};

function ClienteForm({ initial, onSave, onCancel }: { initial?: ClientePropio; onSave: (d: Omit<ClientePropio, "id">) => void; onCancel: () => void }) {
  const [form, setForm] = useState(initial ? { ...initial } : { ...BLANK_CLI });
  const set = (k: keyof typeof BLANK_CLI) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div style={S.formBox}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 18 }}>{initial ? "Editar cliente" : "Nuevo cliente"}</h3>
      <div style={S.section}>Datos</div>
      <Grid>
        <Field label="Cafetería *"><input style={S.input} value={form.cafeteria} onChange={set("cafeteria")} /></Field>
        <Field label="Contacto"><input style={S.input} value={form.contact} onChange={set("contact")} /></Field>
        <Field label="Teléfono"><input style={S.input} value={form.phone} onChange={set("phone")} /></Field>
        <Field label="Dirección"><input style={S.input} value={form.address} onChange={set("address")} /></Field>
      </Grid>
      <div style={S.divider} />
      <div style={S.section}>Consumo</div>
      <Grid>
        <Field label="Café que consume"><input style={S.input} value={form.coffeeBrand} onChange={set("coffeeBrand")} /></Field>
        <Field label="Promedio kg/mes"><input style={S.input} type="number" min={0} step={.5} value={form.kgMonth} onChange={e => setForm(f => ({ ...f, kgMonth: parseFloat(e.target.value) || 0 }))} /></Field>
        <Field label="Último filtro de agua"><input style={S.input} type="date" value={form.lastFilterChange} onChange={set("lastFilterChange")} /></Field>
        <Field label="Estado"><select style={S.select} value={form.status} onChange={set("status")}><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></Field>
      </Grid>
      <div style={S.divider} />
      <div style={S.section}>Máquina propia</div>
      <Grid cols={3}>
        <Field label="Marca"><input style={S.input} value={form.machineBrand} onChange={set("machineBrand")} /></Field>
        <Field label="Modelo"><input style={S.input} value={form.machineModel} onChange={set("machineModel")} /></Field>
        <Field label="N° de serie"><input style={S.input} value={form.machineSerial} onChange={set("machineSerial")} /></Field>
      </Grid>
      <div style={S.section}>Molino propio</div>
      <Grid cols={3}>
        <Field label="Marca"><input style={S.input} value={form.molinoBrand} onChange={set("molinoBrand")} /></Field>
        <Field label="Modelo"><input style={S.input} value={form.molinoModel} onChange={set("molinoModel")} /></Field>
        <Field label="N° de serie"><input style={S.input} value={form.molinoSerial} onChange={set("molinoSerial")} /></Field>
      </Grid>
      <Field label="Notas"><textarea style={{ ...S.input, height: 60, resize: "vertical" }} value={form.notes} onChange={set("notes")} /></Field>
      <div style={{ display: "flex", gap: 10 }}>
        <button style={{ ...S.btn, ...S.btnPrimary }} disabled={!form.cafeteria.trim()} onClick={() => form.cafeteria.trim() && onSave(form)}>Guardar</button>
        <button style={{ ...S.btn, ...S.btnGhost }} onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

function ClientesTab({ clientes, setClientes }: { clientes: ClientePropio[]; setClientes: (v: ClientePropio[]) => void }) {
  const [adding, setAdding]   = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const persist = (list: ClientePropio[]) => { setClientes(list); try { localStorage.setItem(KEY_CLIENTES, JSON.stringify(list)); } catch { /* empty */ } };
  const onSave  = (d: Omit<ClientePropio, "id">) => { persist([...clientes, { ...d, id: uid() }]); setAdding(false); };
  const onEdit  = (d: Omit<ClientePropio, "id">) => { persist(clientes.map(c => c.id === editing ? { ...d, id: editing! } : c)); setEditing(null); };
  const onDel   = (id: string) => { if (!confirm("¿Eliminar?")) return; persist(clientes.filter(c => c.id !== id)); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ background: "#fff", border: "1px solid #DDD5C8", borderRadius: 6, padding: "12px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{clientes.length}</div>
            <div style={{ fontSize: 12, color: "#A08060", marginTop: 2 }}>Total</div>
          </div>
          <div style={{ background: "#fff", border: "1px solid #DDD5C8", borderRadius: 6, padding: "12px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#1A7A3A" }}>{clientes.filter(c => c.status === "activo").length}</div>
            <div style={{ fontSize: 12, color: "#A08060", marginTop: 2 }}>Activos</div>
          </div>
        </div>
        <button style={{ ...S.btn, ...S.btnAccent }} onClick={() => { setAdding(true); setEditing(null); }}>+ Nuevo cliente</button>
      </div>

      {adding && <ClienteForm onSave={onSave} onCancel={() => setAdding(false)} />}
      {clientes.length === 0 && !adding && <div style={{ textAlign: "center", padding: "60px 0", color: "#A08060" }}><div style={{ fontSize: 40, marginBottom: 10 }}>🏪</div><p>Sin clientes registrados</p></div>}

      {clientes.map(cli => {
        const fd = daysSince(cli.lastFilterChange);
        const filterAlert = fd !== null && fd > 180;

        return editing === cli.id ? (
          <ClienteForm key={cli.id} initial={cli} onSave={onEdit} onCancel={() => setEditing(null)} />
        ) : (
          <div key={cli.id} style={S.card}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{cli.cafeteria}</span>
                  {badge(cli.status === "activo" ? "#1A7A3A" : "#999", cli.status === "activo" ? "Activo" : "Inactivo")}
                  {badge("#5A3E28", "Máq. propia")}
                  {filterAlert && badge("#CC3300", "⚠ Filtro +180d")}
                </div>
                <div style={{ display: "flex", gap: 18, fontSize: 13, color: "#5A3E28", marginBottom: 10, flexWrap: "wrap" }}>
                  {cli.contact && <span>👤 {cli.contact}</span>}
                  {cli.phone   && <span>📞 {cli.phone}</span>}
                  {cli.address && <span>📍 {cli.address}</span>}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <InfoBox title="Consumo"><strong>{cli.coffeeBrand || "—"}</strong><br /><span>{cli.kgMonth} kg/mes</span></InfoBox>
                  <InfoBox title="Filtro agua" alert={filterAlert}>
                    {cli.lastFilterChange ? <><strong>{cli.lastFilterChange}</strong><br /><span style={{ color: filterAlert ? "#CC3300" : "#A08060" }}>{fd} días</span></> : <span>—</span>}
                  </InfoBox>
                  {(cli.machineBrand || cli.machineModel) && <InfoBox title="Máquina propia"><strong>{cli.machineBrand} {cli.machineModel}</strong>{cli.machineSerial && <><br /><span>S/N: {cli.machineSerial}</span></>}</InfoBox>}
                  {(cli.molinoBrand || cli.molinoModel) && <InfoBox title="Molino propio"><strong>{cli.molinoBrand} {cli.molinoModel}</strong>{cli.molinoSerial && <><br /><span>S/N: {cli.molinoSerial}</span></>}</InfoBox>}
                </div>
                {cli.notes && <p style={{ fontSize: 12, color: "#A08060", marginTop: 8 }}>{cli.notes}</p>}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ ...S.btn, ...S.btnGhost, padding: "6px 14px" }} onClick={() => { setEditing(cli.id); setAdding(false); }}>Editar</button>
                <button style={{ ...S.btn, ...S.btnDanger, padding: "6px 14px" }} onClick={() => onDel(cli.id)}>×</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main admin page ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const [authed, setAuthed]       = useState(false);
  const [passInput, setPassInput] = useState("");
  const [passError, setPassError] = useState(false);
  const [tab, setTab]             = useState<"dashboard" | "orders" | "comodatos" | "clientes" | "machines" | "molinos">("dashboard");
  const [machines, setMachines]   = useState<Machine[]>([]);
  const [molinos, setMolinos]     = useState<Molino[]>([]);
  const [records, setRecords]     = useState<ComodatoRecord[]>([]);
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
      if (c)  setRecords(JSON.parse(c));
      if (cl) setClientes(JSON.parse(cl));
      if (or) setOrders(JSON.parse(or));
    } catch { /* empty */ }
  }, []);

  const setMachinesP  = (l: Machine[])       => { setMachines(l);  try { localStorage.setItem(KEY_MACHINES,  JSON.stringify(l)); } catch { /**/ } };
  const setMolinosP   = (l: Molino[])        => { setMolinos(l);   try { localStorage.setItem(KEY_MOLINOS,   JSON.stringify(l)); } catch { /**/ } };
  const setOrdersP    = (l: Order[])         => { setOrders(l);    try { localStorage.setItem(KEY_ORDERS,    JSON.stringify(l)); } catch { /**/ } };

  const login = () => {
    if (passInput === ADMIN_PASS) { sessionStorage.setItem(KEY_AUTH, "1"); setAuthed(true); }
    else setPassError(true);
  };

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: "#F2EDE6", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "#fff", border: "1px solid #DDD5C8", borderRadius: 8, padding: "44px 48px", width: 360, boxShadow: "0 8px 32px rgba(26,14,5,.08)" }}>
          <img src="/logo-origen.svg" alt="Origen" style={{ height: 34, margin: "0 auto 28px" }} />
          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 22, textAlign: "center", color: "#1A0E05" }}>Panel de administración</h1>
          <Field label="Contraseña">
            <input
              style={{ ...S.input, ...(passError ? { borderColor: "#CC3300" } : {}) }}
              type="password" placeholder="••••••••"
              value={passInput}
              onChange={e => { setPassInput(e.target.value); setPassError(false); }}
              onKeyDown={e => e.key === "Enter" && login()}
            />
            {passError && <p style={{ fontSize: 12, color: "#CC3300", marginTop: 5 }}>Contraseña incorrecta</p>}
          </Field>
          <button style={{ ...S.btn, ...S.btnPrimary, width: "100%", padding: 12, fontSize: 14 }} onClick={login}>Ingresar</button>
        </div>
      </div>
    );
  }

  const pendingOrders = orders.filter(o => o.status === "pendiente").length;

  const TABS = [
    { key: "dashboard", label: "📊 Dashboard" },
    { key: "orders",    label: `📦 Pedidos${pendingOrders > 0 ? ` (${pendingOrders})` : ""}` },
    { key: "comodatos", label: `☕ Comodatos (${records.length})` },
    { key: "clientes",  label: `🏪 Solo consumo (${clientes.length})` },
    { key: "machines",  label: `⚙️ Máquinas (${machines.length})` },
    { key: "molinos",   label: `🔧 Molinos (${molinos.length})` },
  ] as const;

  return (
    <div style={{ minHeight: "100vh", background: "#F2EDE6" }}>
      <header style={{ background: "#fff", borderBottom: "1px solid #DDD5C8", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img src="/logo-origen.svg" alt="Origen" style={{ height: 28 }} />
            <span style={{ fontSize: 13, color: "#A08060", borderLeft: "1px solid #DDD5C8", paddingLeft: 16 }}>Admin</span>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <a href="/" style={{ fontSize: 13, color: "#A08060", textDecoration: "none" }}>← Catálogo</a>
            <button onClick={() => { sessionStorage.removeItem(KEY_AUTH); setAuthed(false); }} style={{ ...S.btn, ...S.btnGhost, padding: "6px 14px", fontSize: 12 }}>Salir</button>
          </div>
        </div>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", padding: "0 32px", overflowX: "auto", borderTop: "1px solid #EAE4DC" }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: "0 20px", height: 46, fontSize: 13, fontFamily: "inherit",
              fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? "#1A0E05" : "#A08060",
              background: "none", border: "none",
              borderBottom: tab === t.key ? "2px solid #1A0E05" : "2px solid transparent",
              cursor: "pointer", whiteSpace: "nowrap",
            }}>{t.label}</button>
          ))}
        </div>
      </header>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "36px 32px 80px" }}>
        {tab === "dashboard" && <Dashboard orders={orders} comodatos={records} clientes={clientes} />}
        {tab === "orders"    && <OrdersTab orders={orders} setOrders={setOrdersP} comodatos={records} clientes={clientes} />}
        {tab === "comodatos" && <ComodatosTab records={records} setRecords={setRecords} machines={machines} molinos={molinos} />}
        {tab === "clientes"  && <ClientesTab clientes={clientes} setClientes={setClientes} />}
        {tab === "machines"  && <EquipTab items={machines} setItems={setMachinesP} storageKey={KEY_MACHINES} noun="máquina" />}
        {tab === "molinos"   && <EquipTab items={molinos} setItems={setMolinosP} storageKey={KEY_MOLINOS} noun="molino" />}
      </main>
    </div>
  );
}
