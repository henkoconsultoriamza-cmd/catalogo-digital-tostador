"use client";

import { useEffect, useRef, useState } from "react";

// ── Storage keys ──────────────────────────────────────────────────────────────
const KEY_MACHINES  = "origen_machines_v1";
const KEY_MOLINOS   = "origen_molinos_v1";
const KEY_COMODATOS = "origen_comodatos_v2";
const KEY_CLIENTES  = "origen_clientes_v1";
const KEY_AUTH      = "origen_admin_auth";
const ADMIN_PASS    = process.env.NEXT_PUBLIC_ADMIN_PASS || "admin123";

// ── Types ─────────────────────────────────────────────────────────────────────
type EquipStatus = "disponible" | "en_comodato" | "mantenimiento" | "baja";

type Maintenance = {
  id: string;
  date: string;
  type: string;
  description: string;
  technician: string;
};

type Machine = {
  id: string;
  brand: string;
  model: string;
  serial: string;
  status: EquipStatus;
  notes: string;
  maintenances: Maintenance[];
};

type Molino = {
  id: string;
  brand: string;
  model: string;
  serial: string;
  status: EquipStatus;
  notes: string;
  maintenances: Maintenance[];
};

type ComodatoRecord = {
  id: string;
  cafeteria: string;
  contact: string;
  phone: string;
  address: string;
  machineId: string;
  molinoId: string;
  installDate: string;
  minKgMonth: number;
  coffeeType: string;
  lastFilterChange: string;
  contractSigned: boolean;
  contractFileName: string;
  contractFileData: string;
  status: "activo" | "suspendido" | "finalizado";
  notes: string;
};

// Clientes que compran café con máquina propia (no comodato)
type ClientePropio = {
  id: string;
  cafeteria: string;
  contact: string;
  phone: string;
  address: string;
  coffeeBrand: string;       // qué café consume
  kgMonth: number;           // kg promedio por mes
  lastFilterChange: string;  // último cambio de filtro de agua
  machineBrand: string;      // marca de su máquina propia
  machineModel: string;
  machineSerial: string;
  molinoBrand: string;
  molinoModel: string;
  molinoSerial: string;
  status: "activo" | "inactivo";
  notes: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const ESTATUS_LABEL: Record<EquipStatus, string> = {
  disponible: "Disponible", en_comodato: "En comodato",
  mantenimiento: "Mantenimiento", baja: "Baja",
};
const ESTATUS_COLOR: Record<EquipStatus, string> = {
  disponible: "#1A7A3A", en_comodato: "#C4843A",
  mantenimiento: "#8B5010", baja: "#999",
};
const COM_COLOR: Record<string, string> = {
  activo: "#1A7A3A", suspendido: "#CC5500", finalizado: "#888", inactivo: "#999",
};

// ── Shared UI ─────────────────────────────────────────────────────────────────
const S = {
  input:  { width: "100%", border: "1.5px solid #DDD5C8", borderRadius: 3, padding: "8px 11px", fontSize: 14, outline: "none", background: "#fff", color: "#1A0E05" } as React.CSSProperties,
  select: { width: "100%", border: "1.5px solid #DDD5C8", borderRadius: 3, padding: "8px 11px", fontSize: 14, outline: "none", background: "#fff", color: "#1A0E05" } as React.CSSProperties,
  btn:        { border: "none", borderRadius: 3, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" } as React.CSSProperties,
  btnPrimary: { background: "#1A0E05", color: "#fff" } as React.CSSProperties,
  btnAccent:  { background: "#C4843A", color: "#fff" } as React.CSSProperties,
  btnGhost:   { background: "none", border: "1.5px solid #DDD5C8", color: "#5A3E28" } as React.CSSProperties,
  btnDanger:  { background: "none", border: "1.5px solid #DDD5C8", color: "#CC3300" } as React.CSSProperties,
  card: { background: "#fff", border: "1px solid #DDD5C8", borderRadius: 4, padding: "18px 20px", marginBottom: 10 } as React.CSSProperties,
  section: { fontSize: 11, fontWeight: 700, color: "#A08060", letterSpacing: ".08em", textTransform: "uppercase" as const, marginBottom: 12 },
  divider: { height: 1, background: "#DDD5C8", margin: "20px 0" } as React.CSSProperties,
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
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 }}>
    {children}
  </div>
);

// ── Maintenance inline editor ─────────────────────────────────────────────────
function MaintenanceSection({
  maintenances, onChange,
}: {
  maintenances: Maintenance[];
  onChange: (list: Maintenance[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const blank = { date: new Date().toISOString().slice(0, 10), type: "Preventivo", description: "", technician: "" };
  const [form, setForm] = useState(blank);
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const add = () => {
    if (!form.description.trim()) return;
    onChange([...maintenances, { ...form, id: uid() }]);
    setForm(blank);
    setOpen(false);
  };

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={S.section}>Historial de mantenimientos ({maintenances.length})</span>
        <button style={{ ...S.btn, ...S.btnGhost, padding: "5px 12px", fontSize: 12 }} onClick={() => setOpen(o => !o)}>
          {open ? "Cancelar" : "+ Registrar"}
        </button>
      </div>

      {open && (
        <div style={{ background: "#F8F4EF", borderRadius: 3, padding: 16, marginBottom: 12 }}>
          <Grid>
            <Field label="Fecha">
              <input style={S.input} type="date" value={form.date} onChange={set("date")} />
            </Field>
            <Field label="Tipo">
              <select style={S.select} value={form.type} onChange={set("type")}>
                {["Preventivo", "Correctivo", "Limpieza", "Cambio de pieza", "Calibración", "Otro"].map(t => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
          </Grid>
          <Field label="Descripción del trabajo *">
            <textarea
              style={{ ...S.input, height: 60, resize: "vertical" }}
              value={form.description}
              onChange={set("description")}
              placeholder="Detalle del mantenimiento realizado"
            />
          </Field>
          <Field label="Técnico">
            <input style={S.input} value={form.technician} onChange={set("technician")} placeholder="Nombre del técnico" />
          </Field>
          <button style={{ ...S.btn, ...S.btnPrimary }} onClick={add}>Guardar mantenimiento</button>
        </div>
      )}

      {maintenances.length === 0 ? (
        <p style={{ fontSize: 12, color: "#A08060" }}>Sin mantenimientos registrados</p>
      ) : (
        [...maintenances].reverse().map(m => (
          <div key={m.id} style={{ display: "flex", gap: 12, paddingBottom: 10, marginBottom: 10, borderBottom: "1px solid #EDE8E0" }}>
            <div style={{ flexShrink: 0, textAlign: "center", minWidth: 52 }}>
              <div style={{ fontSize: 11, color: "#A08060" }}>{m.date}</div>
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 11, background: "#F0EBE3", color: "#5A3E28", borderRadius: 2, padding: "1px 7px", fontWeight: 600, marginBottom: 3, display: "inline-block" }}>{m.type}</span>
              <p style={{ fontSize: 13, color: "#1A0E05", marginTop: 3 }}>{m.description}</p>
              {m.technician && <p style={{ fontSize: 11, color: "#A08060", marginTop: 2 }}>Técnico: {m.technician}</p>}
            </div>
            <button
              style={{ color: "#CCC", fontSize: 16, background: "none", border: "none", cursor: "pointer", alignSelf: "flex-start", lineHeight: 1 }}
              onClick={() => onChange(maintenances.filter(x => x.id !== m.id))}
            >×</button>
          </div>
        ))
      )}
    </div>
  );
}

// ── Equipment form ─────────────────────────────────────────────────────────────
function EquipFormPanel<T extends Machine | Molino>({
  initial, onSave, onCancel, title,
}: {
  initial?: T; onSave: (data: Omit<T, "id">) => void; onCancel: () => void; title: string;
}) {
  const blank = { brand: "", model: "", serial: "", status: "disponible" as EquipStatus, notes: "", maintenances: [] as Maintenance[] };
  const [form, setForm] = useState(initial ? { ...blank, ...initial } : { ...blank });
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const valid = form.brand.trim() && form.model.trim() && form.serial.trim();

  return (
    <div style={{ background: "#FBF8F4", border: "1.5px solid #C4843A40", borderRadius: 4, padding: 24, marginBottom: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 18 }}>{title}</h3>
      <Grid>
        <Field label="Marca *"><input style={S.input} value={form.brand} onChange={set("brand")} placeholder="ej. La Marzocco" /></Field>
        <Field label="Modelo *"><input style={S.input} value={form.model} onChange={set("model")} placeholder="ej. Linea Classic" /></Field>
        <Field label="Número de serie *"><input style={S.input} value={form.serial} onChange={set("serial")} placeholder="ej. LM2024-00123" /></Field>
        <Field label="Estado">
          <select style={S.select} value={form.status} onChange={set("status")}>
            {(Object.keys(ESTATUS_LABEL) as EquipStatus[]).map(k => (
              <option key={k} value={k}>{ESTATUS_LABEL[k]}</option>
            ))}
          </select>
        </Field>
      </Grid>
      <Field label="Notas">
        <textarea style={{ ...S.input, height: 64, resize: "vertical" }} value={form.notes} onChange={set("notes")} />
      </Field>

      <div style={S.divider} />
      <MaintenanceSection
        maintenances={form.maintenances}
        onChange={list => setForm(f => ({ ...f, maintenances: list }))}
      />

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button style={{ ...S.btn, ...S.btnPrimary }} disabled={!valid} onClick={() => valid && onSave(form as Omit<T, "id">)}>Guardar</button>
        <button style={{ ...S.btn, ...S.btnGhost }} onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// ── Equipment tab (Máquinas / Molinos) ────────────────────────────────────────
function EquipTab<T extends Machine | Molino>({
  items, setItems, storageKey, noun,
}: {
  items: T[]; setItems: (v: T[]) => void; storageKey: string; noun: string;
}) {
  const [adding, setAdding]   = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const persist = (list: T[]) => {
    setItems(list);
    try { localStorage.setItem(storageKey, JSON.stringify(list)); } catch { /* empty */ }
  };

  const onAdd  = (data: Omit<T, "id">) => { persist([...items, { ...data, id: uid() } as T]); setAdding(false); };
  const onEdit = (data: Omit<T, "id">) => { persist(items.map(i => i.id === editing ? { ...data, id: editing } as T : i)); setEditing(null); };
  const onDel  = (id: string) => { if (!confirm("¿Eliminar equipo?")) return; persist(items.filter(i => i.id !== id)); };

  const updateMaintenances = (id: string, list: Maintenance[]) => {
    persist(items.map(i => i.id === id ? { ...i, maintenances: list } : i));
  };

  const stats = (Object.keys(ESTATUS_LABEL) as EquipStatus[]).map(k => ({
    key: k, label: ESTATUS_LABEL[k], count: items.filter(i => i.status === k).length,
  }));

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {stats.map(st => (
          <div key={st.key} style={{ background: "#fff", border: "1px solid #DDD5C8", borderRadius: 4, padding: "12px 18px", minWidth: 120, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: ESTATUS_COLOR[st.key] }}>{st.count}</div>
            <div style={{ fontSize: 12, color: "#A08060", marginTop: 2 }}>{st.label}</div>
          </div>
        ))}
        <button style={{ ...S.btn, ...S.btnAccent, marginLeft: "auto", alignSelf: "center" }} onClick={() => { setAdding(true); setEditing(null); }}>
          + Agregar {noun}
        </button>
      </div>

      {adding && (
        <EquipFormPanel
          title={`Nueva ${noun}`}
          onSave={onAdd as (d: Omit<Machine | Molino, "id">) => void}
          onCancel={() => setAdding(false)}
        />
      )}

      {items.length === 0 && !adding && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#A08060" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📦</div>
          <p>No hay {noun}s registrados</p>
        </div>
      )}

      {items.map(item =>
        editing === item.id ? (
          <EquipFormPanel
            key={item.id}
            title={`Editar ${noun}`}
            initial={item}
            onSave={onEdit as (d: Omit<Machine | Molino, "id">) => void}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <div key={item.id} style={S.card}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{item.brand} {item.model}</span>
                  {badge(ESTATUS_COLOR[item.status], ESTATUS_LABEL[item.status])}
                  {item.maintenances.length > 0 && badge("#5A3E28", `${item.maintenances.length} mant.`)}
                </div>
                <div style={{ fontSize: 13, color: "#5A3E28" }}>Serie: <strong>{item.serial}</strong></div>
                {item.maintenances.length > 0 && (
                  <div style={{ fontSize: 12, color: "#A08060", marginTop: 4 }}>
                    Último: {[...item.maintenances].sort((a, b) => b.date.localeCompare(a.date))[0]?.date} — {[...item.maintenances].sort((a, b) => b.date.localeCompare(a.date))[0]?.type}
                  </div>
                )}
                {item.notes && <p style={{ fontSize: 12, color: "#A08060", marginTop: 4 }}>{item.notes}</p>}
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
              <div style={{ marginTop: 16, borderTop: "1px solid #EDE8E0", paddingTop: 16 }}>
                <MaintenanceSection
                  maintenances={item.maintenances}
                  onChange={list => updateMaintenances(item.id, list)}
                />
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}

// ── Comodato form ─────────────────────────────────────────────────────────────
const BLANK_COM: Omit<ComodatoRecord, "id"> = {
  cafeteria: "", contact: "", phone: "", address: "",
  machineId: "", molinoId: "",
  installDate: new Date().toISOString().slice(0, 10),
  minKgMonth: 5, coffeeType: "",
  lastFilterChange: "",
  contractSigned: false, contractFileName: "", contractFileData: "",
  status: "activo", notes: "",
};

function ComodatoForm({
  initial, machines, molinos, onSave, onCancel,
}: {
  initial?: ComodatoRecord; machines: Machine[]; molinos: Molino[];
  onSave: (data: Omit<ComodatoRecord, "id">) => void; onCancel: () => void;
}) {
  const [form, setForm] = useState<Omit<ComodatoRecord, "id">>(initial ? { ...initial } : { ...BLANK_COM });
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState("");

  const set  = (k: keyof typeof BLANK_COM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));
  const setN = (k: keyof typeof BLANK_COM) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.checked }));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setFileError("Archivo supera 5 MB"); return; }
    setFileError("");
    const reader = new FileReader();
    reader.onload = ev => setForm(f => ({
      ...f,
      contractFileName: file.name,
      contractFileData: ev.target?.result as string ?? "",
    }));
    reader.readAsDataURL(file);
  };

  const availMachines = machines.filter(m => m.status === "disponible" || m.id === form.machineId);
  const availMolinos  = molinos.filter(m  => m.status === "disponible" || m.id === form.molinoId);

  return (
    <div style={{ background: "#FBF8F4", border: "1.5px solid #C4843A40", borderRadius: 4, padding: 24, marginBottom: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 18 }}>{initial ? "Editar comodato" : "Nuevo comodato"}</h3>

      <div style={S.section}>Cliente</div>
      <Grid>
        <Field label="Cafetería *"><input style={S.input} value={form.cafeteria} onChange={set("cafeteria")} placeholder="ej. Café Amaranto" /></Field>
        <Field label="Contacto"><input style={S.input} value={form.contact} onChange={set("contact")} placeholder="Nombre" /></Field>
        <Field label="Teléfono"><input style={S.input} value={form.phone} onChange={set("phone")} /></Field>
        <Field label="Dirección"><input style={S.input} value={form.address} onChange={set("address")} /></Field>
      </Grid>

      <div style={S.divider} />
      <div style={S.section}>Equipos asignados</div>
      <Grid>
        <Field label="Máquina de café">
          <select style={S.select} value={form.machineId} onChange={set("machineId")}>
            <option value="">— Sin asignar —</option>
            {availMachines.map(m => <option key={m.id} value={m.id}>{m.brand} {m.model} · {m.serial}</option>)}
          </select>
        </Field>
        <Field label="Molino">
          <select style={S.select} value={form.molinoId} onChange={set("molinoId")}>
            <option value="">— Sin asignar —</option>
            {availMolinos.map(m => <option key={m.id} value={m.id}>{m.brand} {m.model} · {m.serial}</option>)}
          </select>
        </Field>
        <Field label="Fecha de instalación">
          <input style={S.input} type="date" value={form.installDate} onChange={set("installDate")} />
        </Field>
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
        <Field label="Consumo mínimo exigido (kg/mes)">
          <input style={S.input} type="number" min={0} step={0.5} value={form.minKgMonth}
            onChange={e => setForm(f => ({ ...f, minKgMonth: parseFloat(e.target.value) || 0 }))} />
        </Field>
        <Field label="Tipo de café que consume">
          <input style={S.input} value={form.coffeeType} onChange={set("coffeeType")} placeholder="ej. Blend Espresso Intenso 1 kg" />
        </Field>
        <Field label="Último cambio de filtro de agua">
          <input style={S.input} type="date" value={form.lastFilterChange} onChange={set("lastFilterChange")} />
        </Field>
      </Grid>

      <div style={S.divider} />
      <div style={S.section}>Contrato</div>
      <Grid>
        <Field label="Estado del contrato">
          <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={form.contractSigned} onChange={setN("contractSigned")} style={{ width: 16, height: 16 }} />
            <span style={{ fontSize: 13 }}>Contrato firmado y recibido</span>
          </label>
        </Field>
        <Field label="PDF del contrato">
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.png" style={{ display: "none" }} onChange={handleFile} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button type="button" style={{ ...S.btn, ...S.btnGhost, padding: "7px 14px" }} onClick={() => fileRef.current?.click()}>
              {form.contractFileName ? "Cambiar" : "Subir archivo"}
            </button>
            {form.contractFileName && (
              <span style={{ fontSize: 12, color: "#5A3E28" }}>📎 {form.contractFileName}</span>
            )}
          </div>
          {fileError && <p style={{ fontSize: 12, color: "#CC3300", marginTop: 4 }}>{fileError}</p>}
          <p style={{ fontSize: 11, color: "#A08060", marginTop: 4 }}>PDF, JPG o PNG · máx. 5 MB</p>
        </Field>
      </Grid>

      <Field label="Notas internas">
        <textarea style={{ ...S.input, height: 68, resize: "vertical" }} value={form.notes} onChange={set("notes")} />
      </Field>

      <div style={{ display: "flex", gap: 10 }}>
        <button style={{ ...S.btn, ...S.btnPrimary }} disabled={!form.cafeteria.trim()} onClick={() => form.cafeteria.trim() && onSave(form)}>Guardar</button>
        <button style={{ ...S.btn, ...S.btnGhost }} onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// ── Comodatos tab ─────────────────────────────────────────────────────────────
function ComodatosTab({
  records, setRecords, machines, molinos,
}: {
  records: ComodatoRecord[]; setRecords: (v: ComodatoRecord[]) => void;
  machines: Machine[]; molinos: Molino[];
}) {
  const [adding, setAdding]   = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [filter, setFilter]   = useState<"all" | "activo" | "suspendido" | "finalizado">("all");

  const persist = (list: ComodatoRecord[]) => {
    setRecords(list);
    try { localStorage.setItem(KEY_COMODATOS, JSON.stringify(list)); } catch { /* empty */ }
  };

  const onSave  = (data: Omit<ComodatoRecord, "id">) => { persist([...records, { ...data, id: uid() }]); setAdding(false); };
  const onEdit  = (data: Omit<ComodatoRecord, "id">) => { persist(records.map(r => r.id === editing ? { ...data, id: editing! } : r)); setEditing(null); };
  const onDel   = (id: string) => { if (!confirm("¿Eliminar comodato?")) return; persist(records.filter(r => r.id !== id)); };

  const visible = filter === "all" ? records : records.filter(r => r.status === filter);
  const stats   = { total: records.length, activo: records.filter(r => r.status === "activo").length, suspendido: records.filter(r => r.status === "suspendido").length, finalizado: records.filter(r => r.status === "finalizado").length };

  // Days since filter change
  const daysSince = (dateStr: string) => {
    if (!dateStr) return null;
    const diff = (Date.now() - new Date(dateStr).getTime()) / 86400000;
    return Math.floor(diff);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { key: "total", label: "Total", val: stats.total, color: "#1A0E05" },
          { key: "activo", label: "Activos", val: stats.activo, color: "#1A7A3A" },
          { key: "suspendido", label: "Suspendidos", val: stats.suspendido, color: "#CC5500" },
          { key: "finalizado", label: "Finalizados", val: stats.finalizado, color: "#888" },
        ].map(st => (
          <div key={st.key} style={{ background: "#fff", border: "1px solid #DDD5C8", borderRadius: 4, padding: "12px 18px", minWidth: 120, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: st.color }}>{st.val}</div>
            <div style={{ fontSize: 12, color: "#A08060", marginTop: 2 }}>{st.label}</div>
          </div>
        ))}
        <button style={{ ...S.btn, ...S.btnAccent, marginLeft: "auto", alignSelf: "center" }} onClick={() => { setAdding(true); setEditing(null); }}>
          + Nuevo comodato
        </button>
      </div>

      <div style={{ display: "flex", gap: 0, marginBottom: 20, background: "#fff", border: "1px solid #DDD5C8", borderRadius: 3, width: "fit-content" }}>
        {(["all", "activo", "suspendido", "finalizado"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "7px 16px", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            background: filter === f ? "#1A0E05" : "none",
            color: filter === f ? "#fff" : "#5A3E28",
            border: "none", borderRadius: 2,
          }}>
            {f === "all" ? "Todos" : f.charAt(0).toUpperCase() + f.slice(1) + "s"}
          </button>
        ))}
      </div>

      {adding && <ComodatoForm machines={machines} molinos={molinos} onSave={onSave} onCancel={() => setAdding(false)} />}

      {visible.length === 0 && !adding && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#A08060" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>☕</div>
          <p>No hay comodatos registrados</p>
        </div>
      )}

      {visible.map(rec => {
        const machine = machines.find(m => m.id === rec.machineId);
        const molino  = molinos.find(m => m.id === rec.molinoId);
        const filterDays = daysSince(rec.lastFilterChange);
        const filterAlert = filterDays !== null && filterDays > 180;

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
                  {filterAlert && badge("#CC3300", "⚠ Filtro +180 días")}
                </div>

                <div style={{ display: "flex", gap: 20, fontSize: 13, color: "#5A3E28", marginBottom: 10, flexWrap: "wrap" }}>
                  {rec.contact  && <span>👤 {rec.contact}</span>}
                  {rec.phone    && <span>📞 {rec.phone}</span>}
                  {rec.address  && <span>📍 {rec.address}</span>}
                  {rec.installDate && <span>📅 {rec.installDate}</span>}
                </div>

                <div style={{ display: "flex", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
                  <InfoBox title="Máquina">
                    {machine ? <><strong>{machine.brand} {machine.model}</strong><br /><span>S/N: {machine.serial}</span></> : <span>— Sin asignar</span>}
                  </InfoBox>
                  <InfoBox title="Molino">
                    {molino ? <><strong>{molino.brand} {molino.model}</strong><br /><span>S/N: {molino.serial}</span></> : <span>— Sin asignar</span>}
                  </InfoBox>
                  <InfoBox title="Consumo">
                    <strong>{rec.minKgMonth} kg/mes mín.</strong>
                    {rec.coffeeType && <><br /><span>{rec.coffeeType}</span></>}
                  </InfoBox>
                  <InfoBox title="Filtro de agua" alert={filterAlert}>
                    {rec.lastFilterChange
                      ? <><strong>{rec.lastFilterChange}</strong><br /><span style={{ color: filterAlert ? "#CC3300" : "#A08060" }}>{filterDays} días</span></>
                      : <span>— No registrado</span>
                    }
                  </InfoBox>
                </div>

                {rec.contractFileData && (
                  <a href={rec.contractFileData} download={rec.contractFileName}
                    style={{ fontSize: 12, color: "#C4843A", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    📎 {rec.contractFileName}
                  </a>
                )}
                {rec.notes && <p style={{ fontSize: 12, color: "#A08060", marginTop: 6 }}>{rec.notes}</p>}
              </div>

              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button style={{ ...S.btn, ...S.btnGhost, padding: "6px 14px" }} onClick={() => { setEditing(rec.id); setAdding(false); }}>Editar</button>
                <button style={{ ...S.btn, ...S.btnDanger, padding: "6px 14px" }} onClick={() => onDel(rec.id)}>Eliminar</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InfoBox({ title, children, alert }: { title: string; children: React.ReactNode; alert?: boolean }) {
  return (
    <div style={{
      background: alert ? "#FFF0EE" : "#F5F0E8",
      border: alert ? "1px solid #CC330030" : "none",
      borderRadius: 3, padding: "8px 12px", fontSize: 12, minWidth: 120,
    }}>
      <div style={{ fontWeight: 700, color: "#A08060", marginBottom: 3, textTransform: "uppercase", letterSpacing: ".05em", fontSize: 10 }}>{title}</div>
      <div style={{ color: "#1A0E05", lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

// ── Clientes propios tab ───────────────────────────────────────────────────────
const BLANK_CLI: Omit<ClientePropio, "id"> = {
  cafeteria: "", contact: "", phone: "", address: "",
  coffeeBrand: "", kgMonth: 0,
  lastFilterChange: "",
  machineBrand: "", machineModel: "", machineSerial: "",
  molinoBrand: "", molinoModel: "", molinoSerial: "",
  status: "activo", notes: "",
};

function ClienteForm({
  initial, onSave, onCancel,
}: {
  initial?: ClientePropio; onSave: (data: Omit<ClientePropio, "id">) => void; onCancel: () => void;
}) {
  const [form, setForm] = useState(initial ? { ...initial } : { ...BLANK_CLI });
  const set = (k: keyof typeof BLANK_CLI) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div style={{ background: "#FBF8F4", border: "1.5px solid #C4843A40", borderRadius: 4, padding: 24, marginBottom: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 18 }}>{initial ? "Editar cliente" : "Nuevo cliente"}</h3>

      <div style={S.section}>Datos del cliente</div>
      <Grid>
        <Field label="Cafetería *"><input style={S.input} value={form.cafeteria} onChange={set("cafeteria")} placeholder="ej. Bar del Centro" /></Field>
        <Field label="Contacto"><input style={S.input} value={form.contact} onChange={set("contact")} /></Field>
        <Field label="Teléfono"><input style={S.input} value={form.phone} onChange={set("phone")} /></Field>
        <Field label="Dirección"><input style={S.input} value={form.address} onChange={set("address")} /></Field>
      </Grid>

      <div style={S.divider} />
      <div style={S.section}>Consumo</div>
      <Grid>
        <Field label="Café que consume">
          <input style={S.input} value={form.coffeeBrand} onChange={set("coffeeBrand")} placeholder="ej. Blend Espresso Intenso" />
        </Field>
        <Field label="Promedio kg/mes">
          <input style={S.input} type="number" min={0} step={0.5} value={form.kgMonth}
            onChange={e => setForm(f => ({ ...f, kgMonth: parseFloat(e.target.value) || 0 }))} />
        </Field>
        <Field label="Último cambio de filtro de agua">
          <input style={S.input} type="date" value={form.lastFilterChange} onChange={set("lastFilterChange")} />
        </Field>
        <Field label="Estado">
          <select style={S.select} value={form.status} onChange={set("status")}>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </Field>
      </Grid>

      <div style={S.divider} />
      <div style={S.section}>Máquina propia</div>
      <Grid cols={3}>
        <Field label="Marca"><input style={S.input} value={form.machineBrand} onChange={set("machineBrand")} placeholder="ej. Rancilio" /></Field>
        <Field label="Modelo"><input style={S.input} value={form.machineModel} onChange={set("machineModel")} placeholder="ej. Silvia" /></Field>
        <Field label="N° de serie"><input style={S.input} value={form.machineSerial} onChange={set("machineSerial")} /></Field>
      </Grid>

      <div style={S.section}>Molino propio</div>
      <Grid cols={3}>
        <Field label="Marca"><input style={S.input} value={form.molinoBrand} onChange={set("molinoBrand")} /></Field>
        <Field label="Modelo"><input style={S.input} value={form.molinoModel} onChange={set("molinoModel")} /></Field>
        <Field label="N° de serie"><input style={S.input} value={form.molinoSerial} onChange={set("molinoSerial")} /></Field>
      </Grid>

      <Field label="Notas">
        <textarea style={{ ...S.input, height: 64, resize: "vertical" }} value={form.notes} onChange={set("notes")} />
      </Field>

      <div style={{ display: "flex", gap: 10 }}>
        <button style={{ ...S.btn, ...S.btnPrimary }} disabled={!form.cafeteria.trim()} onClick={() => form.cafeteria.trim() && onSave(form)}>Guardar</button>
        <button style={{ ...S.btn, ...S.btnGhost }} onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

function ClientesTab({
  clientes, setClientes,
}: {
  clientes: ClientePropio[]; setClientes: (v: ClientePropio[]) => void;
}) {
  const [adding, setAdding]   = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const persist = (list: ClientePropio[]) => {
    setClientes(list);
    try { localStorage.setItem(KEY_CLIENTES, JSON.stringify(list)); } catch { /* empty */ }
  };

  const onSave  = (data: Omit<ClientePropio, "id">) => { persist([...clientes, { ...data, id: uid() }]); setAdding(false); };
  const onEdit  = (data: Omit<ClientePropio, "id">) => { persist(clientes.map(c => c.id === editing ? { ...data, id: editing! } : c)); setEditing(null); };
  const onDel   = (id: string) => { if (!confirm("¿Eliminar cliente?")) return; persist(clientes.filter(c => c.id !== id)); };

  const daysSince = (d: string) => d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ background: "#fff", border: "1px solid #DDD5C8", borderRadius: 4, padding: "12px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#1A0E05" }}>{clientes.length}</div>
            <div style={{ fontSize: 12, color: "#A08060", marginTop: 2 }}>Total</div>
          </div>
          <div style={{ background: "#fff", border: "1px solid #DDD5C8", borderRadius: 4, padding: "12px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#1A7A3A" }}>{clientes.filter(c => c.status === "activo").length}</div>
            <div style={{ fontSize: 12, color: "#A08060", marginTop: 2 }}>Activos</div>
          </div>
        </div>
        <button style={{ ...S.btn, ...S.btnAccent }} onClick={() => { setAdding(true); setEditing(null); }}>
          + Nuevo cliente
        </button>
      </div>

      {adding && <ClienteForm onSave={onSave} onCancel={() => setAdding(false)} />}

      {clientes.length === 0 && !adding && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#A08060" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🏪</div>
          <p>No hay clientes registrados</p>
        </div>
      )}

      {clientes.map(cli => {
        const filterDays = daysSince(cli.lastFilterChange);
        const filterAlert = filterDays !== null && filterDays > 180;

        return editing === cli.id ? (
          <ClienteForm key={cli.id} initial={cli} onSave={onEdit} onCancel={() => setEditing(null)} />
        ) : (
          <div key={cli.id} style={S.card}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{cli.cafeteria}</span>
                  {badge(COM_COLOR[cli.status], cli.status.charAt(0).toUpperCase() + cli.status.slice(1))}
                  {badge("#5A3E28", "Máquina propia")}
                  {filterAlert && badge("#CC3300", "⚠ Filtro +180 días")}
                </div>

                <div style={{ display: "flex", gap: 20, fontSize: 13, color: "#5A3E28", marginBottom: 10, flexWrap: "wrap" }}>
                  {cli.contact && <span>👤 {cli.contact}</span>}
                  {cli.phone   && <span>📞 {cli.phone}</span>}
                  {cli.address && <span>📍 {cli.address}</span>}
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <InfoBox title="Consumo">
                    {cli.coffeeBrand && <><strong>{cli.coffeeBrand}</strong><br /></>}
                    <span>{cli.kgMonth} kg/mes prom.</span>
                  </InfoBox>
                  <InfoBox title="Filtro de agua" alert={filterAlert}>
                    {cli.lastFilterChange
                      ? <><strong>{cli.lastFilterChange}</strong><br /><span style={{ color: filterAlert ? "#CC3300" : "#A08060" }}>{filterDays} días</span></>
                      : <span>— No registrado</span>
                    }
                  </InfoBox>
                  {(cli.machineBrand || cli.machineModel) && (
                    <InfoBox title="Máquina propia">
                      <strong>{cli.machineBrand} {cli.machineModel}</strong>
                      {cli.machineSerial && <><br /><span>S/N: {cli.machineSerial}</span></>}
                    </InfoBox>
                  )}
                  {(cli.molinoBrand || cli.molinoModel) && (
                    <InfoBox title="Molino propio">
                      <strong>{cli.molinoBrand} {cli.molinoModel}</strong>
                      {cli.molinoSerial && <><br /><span>S/N: {cli.molinoSerial}</span></>}
                    </InfoBox>
                  )}
                </div>

                {cli.notes && <p style={{ fontSize: 12, color: "#A08060", marginTop: 8 }}>{cli.notes}</p>}
              </div>

              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button style={{ ...S.btn, ...S.btnGhost, padding: "6px 14px" }} onClick={() => { setEditing(cli.id); setAdding(false); }}>Editar</button>
                <button style={{ ...S.btn, ...S.btnDanger, padding: "6px 14px" }} onClick={() => onDel(cli.id)}>Eliminar</button>
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
  const [tab, setTab]             = useState<"comodatos" | "clientes" | "machines" | "molinos">("comodatos");
  const [machines, setMachines]   = useState<Machine[]>([]);
  const [molinos, setMolinos]     = useState<Molino[]>([]);
  const [records, setRecords]     = useState<ComodatoRecord[]>([]);
  const [clientes, setClientes]   = useState<ClientePropio[]>([]);

  useEffect(() => {
    if (sessionStorage.getItem(KEY_AUTH) === "1") setAuthed(true);
    try {
      const m  = localStorage.getItem(KEY_MACHINES);
      const mo = localStorage.getItem(KEY_MOLINOS);
      const c  = localStorage.getItem(KEY_COMODATOS);
      const cl = localStorage.getItem(KEY_CLIENTES);
      if (m)  setMachines(JSON.parse(m));
      if (mo) setMolinos(JSON.parse(mo));
      if (c)  setRecords(JSON.parse(c));
      if (cl) setClientes(JSON.parse(cl));
    } catch { /* empty */ }
  }, []);

  const setMachinesP = (list: Machine[]) => {
    setMachines(list);
    try { localStorage.setItem(KEY_MACHINES, JSON.stringify(list)); } catch { /* empty */ }
  };
  const setMolinosP = (list: Molino[]) => {
    setMolinos(list);
    try { localStorage.setItem(KEY_MOLINOS, JSON.stringify(list)); } catch { /* empty */ }
  };

  const login = () => {
    if (passInput === ADMIN_PASS) { sessionStorage.setItem(KEY_AUTH, "1"); setAuthed(true); }
    else setPassError(true);
  };

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: "#F2EDE6", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "#fff", border: "1px solid #DDD5C8", borderRadius: 4, padding: "40px 44px", width: 340 }}>
          <img src="/logo-origen.svg" alt="Origen Tostadores" style={{ height: 32, margin: "0 auto 28px" }} />
          <h1 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20, textAlign: "center" }}>Panel de administración</h1>
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
          <button style={{ ...S.btn, ...S.btnPrimary, width: "100%", padding: 11 }} onClick={login}>Ingresar</button>
        </div>
      </div>
    );
  }

  const TABS = [
    { key: "comodatos", label: `☕ Comodatos (${records.length})` },
    { key: "clientes",  label: `🏪 Solo consumo (${clientes.length})` },
    { key: "machines",  label: `⚙️ Máquinas (${machines.length})` },
    { key: "molinos",   label: `🔧 Molinos (${molinos.length})` },
  ] as const;

  return (
    <div style={{ minHeight: "100vh", background: "#F2EDE6" }}>
      <header style={{ background: "#fff", borderBottom: "1px solid #DDD5C8" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img src="/logo-origen.svg" alt="Origen Tostadores" style={{ height: 28 }} />
            <span style={{ fontSize: 13, color: "#A08060", borderLeft: "1px solid #DDD5C8", paddingLeft: 16 }}>Admin</span>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <a href="/" style={{ fontSize: 13, color: "#A08060", textDecoration: "none" }}>← Catálogo</a>
            <button onClick={() => { sessionStorage.removeItem(KEY_AUTH); setAuthed(false); }}
              style={{ ...S.btn, ...S.btnGhost, padding: "6px 14px", fontSize: 12 }}>
              Salir
            </button>
          </div>
        </div>
      </header>

      <div style={{ background: "#fff", borderBottom: "1px solid #DDD5C8" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", padding: "0 32px", overflowX: "auto" }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: "0 22px", height: 46, fontSize: 13, fontFamily: "inherit",
              fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? "#1A0E05" : "#A08060",
              background: "none", border: "none",
              borderBottom: tab === t.key ? "2px solid #1A0E05" : "2px solid transparent",
              cursor: "pointer", whiteSpace: "nowrap",
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "36px 32px 80px" }}>
        {tab === "comodatos" && (
          <ComodatosTab records={records} setRecords={setRecords} machines={machines} molinos={molinos} />
        )}
        {tab === "clientes" && (
          <ClientesTab clientes={clientes} setClientes={setClientes} />
        )}
        {tab === "machines" && (
          <EquipTab items={machines} setItems={setMachinesP} storageKey={KEY_MACHINES} noun="máquina" />
        )}
        {tab === "molinos" && (
          <EquipTab items={molinos} setItems={setMolinosP} storageKey={KEY_MOLINOS} noun="molino" />
        )}
      </main>
    </div>
  );
}
