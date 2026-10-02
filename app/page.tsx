"use client";

import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import {
  APP_SETTINGS_KEY, AppSettings, CART_KEY, CATEGORIES,
  DEFAULT_APP_SETTINGS, DEFAULT_PRODUCTS, Product, Variant,
} from "./catalog-data";
import { supabase } from "./lib/supabase";

type CartItem = {
  productId: string;
  variantSku?: string;
  variantLabel?: string;
  name: string;
  category: string;
  unitPrice: number;
  salePrice?: number;
  quantity: number;
  image: string;
  imageColor: string;
  imageIcon: string;
};

// ─── Icons ─────────────────────────────────────────────────────────────────
function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "search") return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
  if (name === "cart") return <svg {...p}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>;
  if (name === "close") return <svg {...p}><path d="m6 6 12 12M18 6 6 18"/></svg>;
  if (name === "plus") return <svg {...p}><path d="M12 5v14M5 12h14"/></svg>;
  if (name === "minus") return <svg {...p}><path d="M5 12h14"/></svg>;
  if (name === "trash") return <svg {...p}><polyline points="3 6 5 6 21 6"/><path d="m19 6-.867 12.142A2 2 0 0 1 16.138 20H7.862a2 2 0 0 1-1.995-1.858L5 6m5 0V4h4v2"/></svg>;
  if (name === "filter") return <svg {...p}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
  if (name === "check") return <svg {...p}><polyline points="20 6 9 17 4 12"/></svg>;
  if (name === "file") return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
  if (name === "whatsapp") return <svg {...p} stroke="none" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.885 3.488"/></svg>;
  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function fmt(value: number, currency: AppSettings["currency"]) {
  if (currency === "ARS") return `$ ${value.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  if (currency === "BRL") return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  return `US$ ${value.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ─── Product image ─────────────────────────────────────────────────────────
function ProductImg({ product, size = 80, radius = 10 }: { product: Pick<Product, "image" | "imageColor" | "imageIcon">; size?: number; radius?: number }) {
  const [err, setErr] = useState(false);
  if (product.image && !err) {
    return <img src={product.image} alt="" width={size} height={size} onError={() => setErr(true)}
      style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", flexShrink: 0 }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: radius, background: product.imageColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.4, flexShrink: 0 }}>
      {product.imageIcon}
    </div>
  );
}

function CardImg({ product }: { product: Product }) {
  const [err, setErr] = useState(false);
  const fill: CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%" };
  if (product.image && !err) {
    return <img src={product.image} alt="" onError={() => setErr(true)}
      style={{ ...fill, objectFit: "cover" }} />;
  }
  return (
    <div style={{ ...fill, background: product.imageColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 60 }}>
      {product.imageIcon}
    </div>
  );
}

// ─── Tag ──────────────────────────────────────────────────────────────────
function Tag({ label, accent }: { label: string; accent: string }) {
  const presets: Record<string, { bg: string; color: string }> = {
    "Nuevo":       { bg: "#052e16", color: "#4ade80" },
    "Oferta":      { bg: "#3b0000", color: "#f87171" },
    "Más vendido": { bg: "#1c1000", color: "#fbbf24" },
    "Comodato":    { bg: "#0a1a2e", color: "#60a5fa" },
  };
  const s = presets[label] ?? { bg: accent + "25", color: accent };
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: s.bg, color: s.color, letterSpacing: ".3px", whiteSpace: "nowrap" as const }}>
      {label}
    </span>
  );
}

// ─── CATEGORY ICONS ────────────────────────────────────────────────────────
const CAT_ICON: Record<string, string> = {
  "Café": "☕",
  "Syrups": "🍶",
  "Salsas": "🍫",
  "Accesorios": "🔧",
  "Comodato": "🤝",
};

// ─── Main ─────────────────────────────────────────────────────────────────
export default function Catalog() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [hydrated, setHydrated] = useState(false);

  const DEFAULT_SLIDES = [
    {
      badge: "DESTACADO",
      category: "Café",
      title: "Café de especialidad para tu cafetería",
      sub: "Blends de tueste propio, frescos cada semana. Entrega directa en tu local.",
      img: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=1400&q=80",
      color: "#C4843A",
    },
    {
      badge: "NUEVO",
      category: "Syrups",
      title: "Syrups y salsas premium",
      sub: "Vainilla, caramelo, avellana, chocolate y dulce de leche. Suma variedad a tu carta.",
      img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&q=80",
      color: "#D4B060",
    },
    {
      badge: "COMODATO",
      category: "Comodato",
      title: "Máquinas en comodato",
      sub: "Te dejamos la máquina sin costo. Solo comprá el café mensualmente y firmá el contrato.",
      img: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=1400&q=80",
      color: "#4080C0",
    },
  ];

  const [slides] = useState(DEFAULT_SLIDES);
  const [slideIdx, setSlideIdx] = useState(0);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [onlySale, setOnlySale] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [detailQty, setDetailQty] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [visibleCount, setVisibleCount] = useState(48);
  const [orderSending, setOrderSending] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Login state
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginTab, setLoginTab] = useState<"login" | "register">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [regName, setRegName] = useState("");
  const [regBusiness, setRegBusiness] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regMsg, setRegMsg] = useState("");
  const pendingOrderRef = useRef(false);

  const accent = settings.accentColor;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.ok ? r.json() : null)
      .then(remote => {
        if (remote && Object.keys(remote).length > 0) {
          setSettings(s => ({ ...s, ...remote }));
        } else {
          const s = localStorage.getItem(APP_SETTINGS_KEY);
          if (s) try { setSettings({ ...DEFAULT_APP_SETTINGS, ...JSON.parse(s) }); } catch {}
        }
      })
      .catch(() => {
        const s = localStorage.getItem(APP_SETTINGS_KEY);
        if (s) try { setSettings({ ...DEFAULT_APP_SETTINGS, ...JSON.parse(s) }); } catch {}
      });

    fetch("/api/products?t=" + Date.now(), { cache: "no-store" })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const clean = Array.isArray(data) ? data.filter((p: Product) => p?.id) : [];
        if (clean.length > 0) setProducts(clean);
      })
      .catch(() => {});

    const c = localStorage.getItem(CART_KEY);
    if (c) try { setCart(JSON.parse(c)); } catch { localStorage.removeItem(CART_KEY); }
    setHydrated(true);
  }, []);

  useEffect(() => { if (hydrated) localStorage.setItem(CART_KEY, JSON.stringify(cart)); }, [cart, hydrated]);

  useEffect(() => {
    const t = setInterval(() => setSlideIdx(s => (s + 1) % slides.length), 4500);
    return () => clearInterval(t);
  }, [slides.length]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (u && (u.app_metadata?.confirmed || u.app_metadata?.is_admin)) {
        setUser({ id: u.id, email: u.email ?? "", name: u.user_metadata?.name ?? u.email ?? "" });
      } else if (u) {
        supabase.auth.signOut();
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, session) => {
      const u = session?.user;
      if (!u) { setUser(null); return; }
      if (u.app_metadata?.confirmed || u.app_metadata?.is_admin)
        setUser({ id: u.id, email: u.email ?? "", name: u.user_metadata?.name ?? u.email ?? "" });
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { setVisibleCount(48); }, [query, activeCategory, onlySale]);

  useEffect(() => {
    if (user && pendingOrderRef.current) {
      pendingOrderRef.current = false;
      handleSendOrder();
    }
  }, [user]);

  function openProduct(p: Product) {
    setSelected(p);
    setSelectedVariant(p.variants?.[0] ?? null);
    setDetailQty(p.minQty);
  }

  function addToCart(p: Product, qty: number, variant?: Variant | null) {
    setCart(prev => {
      const key = variant?.sku ?? p.id;
      const existing = prev.find(i => (i.variantSku ?? i.productId) === key);
      if (existing) return prev.map(i => (i.variantSku ?? i.productId) === key ? { ...i, quantity: i.quantity + qty } : i);
      return [...prev, {
        productId: p.id, variantSku: variant?.sku, variantLabel: variant?.label,
        name: p.name + (variant ? ` (${variant.label})` : ""),
        category: p.category,
        unitPrice: variant?.price ?? p.price,
        salePrice: p.salePrice,
        quantity: qty,
        image: p.image, imageColor: p.imageColor, imageIcon: p.imageIcon,
      }];
    });
    setSelected(null);
  }

  function updateQty(key: string, delta: number) {
    setCart(prev => prev.map(i => (i.variantSku ?? i.productId) !== key ? i : i.quantity + delta < 1 ? i : { ...i, quantity: i.quantity + delta }));
  }

  function removeFromCart(key: string) {
    setCart(prev => prev.filter(i => (i.variantSku ?? i.productId) !== key));
  }

  const cartTotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const cartTotalSale = cart.reduce((s, i) => s + (i.salePrice ?? i.unitPrice) * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  function buildWhatsAppMsg() {
    const lines = cart.map(i => `• ${i.quantity}× ${i.name} — ${fmt(i.unitPrice, settings.currency)} c/u`).join("\n");
    return `Hola! Quiero hacer un pedido:\n\n${lines}\n\nTotal estimado: ${fmt(cartTotal, settings.currency)}\n\n¿Podés confirmarme disponibilidad y fecha de entrega?`;
  }

  async function handleSendOrder() {
    if (!cart.length) return;
    if (!user) { setLoginOpen(true); return; }
    setOrderSending(true);
    try {
      await fetch("/api/save-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart, total: cartTotal, email: user.email }),
      });
    } catch {}
    window.open(`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(buildWhatsAppMsg())}`, "_blank");
    setCart([]);
    setCartOpen(false);
    setOrderSending(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPass });
    setLoginLoading(false);
    if (error) { setLoginError("Email o contraseña incorrectos"); return; }
    if (!data.user?.app_metadata?.confirmed && !data.user?.app_metadata?.is_admin) {
      await supabase.auth.signOut();
      setLoginError("Tu cuenta está pendiente de aprobación.");
      return;
    }
    setLoginOpen(false);
    setLoginEmail(""); setLoginPass("");
    pendingOrderRef.current = true;
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegMsg("");
    if (!regName || !regBusiness || !regPhone || !loginEmail || !loginPass) {
      setRegMsg("Completá todos los campos"); return;
    }
    if (loginPass.length < 6) { setRegMsg("La contraseña debe tener al menos 6 caracteres"); return; }
    setLoginLoading(true);
    const { error } = await supabase.auth.signUp({
      email: loginEmail, password: loginPass,
      options: { data: { name: regName, business: regBusiness, phone: regPhone } },
    });
    setLoginLoading(false);
    if (error) { setRegMsg("Error: " + error.message); return; }
    setRegMsg("✓ Cuenta creada. Vas a recibir un correo de confirmación.");
    setLoginTab("login");
  }

  const filtered = useMemo(() => products.filter(p => {
    if (!p) return false;
    if (activeCategory !== "Todos" && p.category !== activeCategory) return false;
    if (onlySale && !p.onSale) return false;
    if (query) {
      const q = query.toLowerCase();
      return (p.name ?? "").toLowerCase().includes(q) ||
             (p.sku ?? "").toLowerCase().includes(q) ||
             (p.category ?? "").toLowerCase().includes(q) ||
             (p.description ?? "").toLowerCase().includes(q);
    }
    return true;
  }), [products, activeCategory, onlySale, query]);

  if (!hydrated) return null;

  const dark = "#0A0604";
  const sidebarBg = "#120D08";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: dark }}>

      {/* ── Sidebar overlay (mobile) ──────────────────────────────────────── */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 150 }} />}

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className={sidebarOpen ? "sidebar sidebar-open" : "sidebar"} style={{
        width: 220, flexShrink: 0, background: sidebarBg,
        borderRight: "1px solid rgba(255,255,255,.06)",
        padding: "0 0 24px", overflowY: "auto",
        display: "flex", flexDirection: "column",
      }}>
        {/* Logo */}
        <div style={{ padding: "20px 16px 14px" }}>
          <img src="/logo-origen.svg" alt={settings.businessName} style={{ height: 40, width: "auto" }} />
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,.06)", margin: "0 12px 12px" }} />

        {/* Buscador */}
        <div style={{ padding: "0 10px 12px", position: "relative" }}>
          <span style={{ position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,.3)", pointerEvents: "none" }}>
            <Icon name="search" size={13} />
          </span>
          <input
            style={{ width: "100%", height: 34, borderRadius: 8, border: "1px solid rgba(255,255,255,.1)", padding: "0 10px 0 32px", fontSize: 13, background: "rgba(255,255,255,.06)", color: "#fff", outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const }}
            placeholder="Buscar…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        {/* Categorías */}
        <div style={{ padding: "0 8px", flex: 1, overflowY: "auto" }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,.22)", letterSpacing: ".14em", textTransform: "uppercase" as const, padding: "0 10px", marginBottom: 4 }}>Categorías</div>
          {["Todos", ...CATEGORIES].map(cat => {
            const on = activeCategory === cat;
            return (
              <button key={cat} onClick={() => { setActiveCategory(cat); setSidebarOpen(false); }} style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%", height: 38, padding: "0 10px",
                borderRadius: 9, border: "none", borderLeft: on ? `3px solid ${accent}` : "3px solid transparent",
                background: on ? accent + "18" : "transparent",
                color: on ? accent : "rgba(255,255,255,.5)",
                fontSize: 12, fontWeight: on ? 700 : 500, cursor: "pointer", textAlign: "left" as const,
              }}>
                <span style={{ fontSize: 13 }}>{cat === "Todos" ? "🏠" : CAT_ICON[cat] ?? "•"}</span>
                <span style={{ flex: 1 }}>{cat}</span>
                {on && <Icon name="check" size={10} />}
              </button>
            );
          })}

          <div style={{ height: 1, background: "rgba(255,255,255,.06)", margin: "10px 6px" }} />

          {/* Filtros */}
          <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,.22)", letterSpacing: ".14em", textTransform: "uppercase" as const, padding: "0 10px", marginBottom: 4 }}>Filtros</div>
          <button onClick={() => { setOnlySale(o => !o); setSidebarOpen(false); }} style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%", height: 36, padding: "0 10px",
            borderRadius: 9, border: "none", borderLeft: onlySale ? `3px solid ${accent}` : "3px solid transparent",
            background: onlySale ? accent + "18" : "transparent",
            color: onlySale ? accent : "rgba(255,255,255,.4)",
            fontSize: 12, fontWeight: onlySale ? 700 : 400, cursor: "pointer", textAlign: "left" as const,
          }}>
            <span>🏷️</span>
            <span>Solo en oferta</span>
          </button>

          {(onlySale || activeCategory !== "Todos") && (
            <button onClick={() => { setActiveCategory("Todos"); setOnlySale(false); }} style={{
              display: "flex", alignItems: "center", gap: 6, width: "100%", height: 34, padding: "0 10px", marginTop: 6,
              borderRadius: 8, border: "none", background: "transparent", color: accent, fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left" as const,
            }}>
              <Icon name="close" size={11} /> Limpiar filtros
            </button>
          )}
        </div>

        {/* User / login */}
        <div style={{ padding: "10px 14px 0", borderTop: "1px solid rgba(255,255,255,.06)", marginTop: 10 }}>
          {user ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, maxWidth: 130 }}>{user.name}</span>
              <button onClick={() => supabase.auth.signOut()} style={{ fontSize: 11, color: "rgba(255,255,255,.3)", background: "none", border: "none", cursor: "pointer" }}>Salir</button>
            </div>
          ) : (
            <button onClick={() => setLoginOpen(true)} style={{ fontSize: 11, color: accent, fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              Iniciá sesión
            </button>
          )}
        </div>

        {/* Henko footer */}
        <div style={{ padding: "14px 14px 4px", marginTop: "auto", textAlign: "center" as const }}>
          <a href="https://consultoriahenko.com" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,.2)", letterSpacing: ".06em", marginBottom: 2 }}>DESARROLLADO POR</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#EA8215" }}>Henko Consultoría</div>
          </a>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }} className="light-area">

        {/* Top bar */}
        <div style={{ background: "#fff", borderBottom: "1px solid #e8ddd2", padding: "0 14px", height: 54, display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 40 }}>
          {isMobile && (
            <button onClick={() => setSidebarOpen(o => !o)} style={{ width: 34, height: 34, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#5a3e28", background: "#f5f0ea", border: "1px solid #e8ddd2", cursor: "pointer", flexShrink: 0 }}>
              <Icon name="filter" />
            </button>
          )}
          {isMobile ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, background: "#f5f0ea", borderRadius: 8, border: "1px solid #e8ddd2", padding: "0 10px", height: 34 }}>
              <Icon name="search" size={13} />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar…"
                style={{ background: "transparent", border: "none", outline: "none", fontSize: 13, color: "#1a0e05", width: "100%", fontFamily: "inherit" }} />
            </div>
          ) : (
            <span style={{ fontSize: 13, color: "#9a7a5a", flexShrink: 0 }}>
              {filtered.length} producto{filtered.length !== 1 ? "s" : ""}
              {activeCategory !== "Todos" && ` · ${activeCategory}`}
            </span>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            {user && (
              <span style={{ width: 28, height: 28, borderRadius: "50%", background: accent + "22", color: accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>
                {user.name[0]?.toUpperCase()}
              </span>
            )}
            {user && (
              <button onClick={() => setCartOpen(o => !o)}
                style={{ height: 36, padding: "0 14px", borderRadius: 9, display: "flex", alignItems: "center", gap: 8, color: cartCount > 0 ? "#fff" : "#5a3e28", background: cartCount > 0 ? accent : "#f5f0ea", border: `1px solid ${cartCount > 0 ? accent : "#e8ddd2"}`, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                <Icon name="cart" size={16} />
                {cartCount > 0 && <span>{cartCount}</span>}
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>

          {/* ── Banner slider ─────────────────────────────────────────────── */}
          <div className="hero-banner" style={{ position: "relative", height: isMobile ? 190 : 260, overflow: "hidden", background: dark }}>
            {slides.map((s, i) => (
              <div key={i} style={{ position: "absolute", inset: 0, transition: "opacity .7s ease", opacity: i === slideIdx ? 1 : 0, pointerEvents: i === slideIdx ? "auto" : "none" }}>
                <img src={s.img} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(10,6,4,.95) 0%, rgba(10,6,4,.65) 55%, rgba(10,6,4,.1) 100%)" }} />
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: isMobile ? "0 18px" : "0 48px" }}>
                  <span style={{ display: "inline-block", fontSize: 10, fontWeight: 800, color: dark, background: s.color, padding: "3px 10px", borderRadius: 20, marginBottom: 8, width: "fit-content" }}>{s.badge}</span>
                  <div className="hero-title" style={{ fontSize: isMobile ? 18 : "clamp(18px, 2.6vw, 34px)", fontWeight: 900, color: "#F5EFE6", lineHeight: 1.2, marginBottom: 8, maxWidth: 480 }}>{s.title}</div>
                  <div className="hero-sub" style={{ fontSize: 13, color: "rgba(245,239,230,.6)", marginBottom: 16, maxWidth: 420 }}>{s.sub}</div>
                  <button className="hero-btn" onClick={() => { setActiveCategory(s.category); setSidebarOpen(false); }}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 38, padding: "0 20px", borderRadius: 20, background: accent, color: "#fff", fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer", width: "fit-content" }}>
                    Ver productos
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
                  </button>
                </div>
              </div>
            ))}
            <button onClick={() => setSlideIdx(s => (s - 1 + slides.length) % slides.length)}
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.2)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 10 }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button onClick={() => setSlideIdx(s => (s + 1) % slides.length)}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.2)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 10 }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6"/></svg>
            </button>
            <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6 }}>
              {slides.map((_, i) => (
                <button key={i} onClick={() => setSlideIdx(i)} style={{ width: i === slideIdx ? 18 : 6, height: 6, borderRadius: 3, background: i === slideIdx ? accent : "rgba(255,255,255,.3)", border: "none", cursor: "pointer", transition: "all .3s", padding: 0 }} />
              ))}
            </div>
          </div>

          {/* ── Category strip ─────────────────────────────────────────────── */}
          <div style={{ background: "#fff", borderBottom: "1px solid #e8ddd2", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, overflowX: "auto" }}>
            {["Todos", ...CATEGORIES].map(cat => {
              const on = activeCategory === cat;
              return (
                <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                  height: 38, padding: "0 14px", borderRadius: 999,
                  border: `2px solid ${on ? accent : "#e8ddd2"}`,
                  background: on ? accent + "15" : "#fff",
                  color: on ? accent : "#5a3e28",
                  fontSize: 12, fontWeight: on ? 700 : 500, cursor: "pointer", flexShrink: 0, transition: "all .15s",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span>{cat === "Todos" ? "🏠" : CAT_ICON[cat] ?? ""}</span>
                  {cat}
                </button>
              );
            })}
          </div>

          {/* ── Products grid ─────────────────────────────────────────────── */}
          <main className="catalog-main" style={{ padding: "18px 18px 40px" }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 20px", color: "#9a7a5a" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>☕</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#5a3e28", marginBottom: 6 }}>Sin resultados</div>
                <div style={{ fontSize: 13 }}>Probá cambiar los filtros o la búsqueda</div>
              </div>
            ) : (
              <div className="product-grid" style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(200px, 1fr))", gap: isMobile ? 8 : 12 }}>
                {filtered.slice(0, visibleCount).map(p => {
                  const cartQty = cart.filter(i => i.productId === p.id).reduce((s, i) => s + i.quantity, 0);
                  return (
                    <div key={p.id} onClick={() => openProduct(p)}
                      style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8ddd2", overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column", transition: "border-color .2s, box-shadow .2s, transform .2s" }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = accent + "60"; el.style.boxShadow = "0 8px 24px rgba(196,132,58,.12)"; el.style.transform = "translateY(-2px)"; }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = "#e8ddd2"; el.style.boxShadow = "none"; el.style.transform = "none"; }}
                    >
                      <div style={{ height: 140, background: "#f5f0ea", position: "relative", overflow: "hidden" }}>
                        <CardImg product={p} />
                        {p.tag && <div style={{ position: "absolute", top: 8, left: 8 }}><Tag label={p.tag} accent={accent} /></div>}
                      </div>
                      <div style={{ padding: "10px 12px", flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: "#9a7a5a", letterSpacing: ".12em", textTransform: "uppercase" as const }}>{p.category}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1a0e05", lineHeight: 1.35 }}>{p.name}</div>
                        <div style={{ fontSize: 10, color: "#9a7a5a", fontFamily: "monospace", marginTop: 1 }}>{p.sku}</div>
                        <div style={{ marginTop: 8 }}>
                          {user ? (
                            p.salePrice ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: "#9a7a5a" }}>LISTA</span>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: "#9a7a5a", textDecoration: "line-through" }}>{fmt(p.price, settings.currency)}</span>
                                </div>
                                <span style={{ fontSize: 17, fontWeight: 800, color: "#1a0e05" }}>{fmt(p.salePrice, settings.currency)}</span>
                              </div>
                            ) : (
                              <span style={{ fontSize: 17, fontWeight: 800, color: "#1a0e05" }}>{fmt(p.price, settings.currency)}</span>
                            )
                          ) : (
                            <button onClick={e => { e.stopPropagation(); setLoginOpen(true); }} style={{ fontSize: 12, color: accent, fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                              🔒 Ver precio
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={{ padding: "8px 12px 12px", borderTop: "1px solid #f5f0ea", display: "flex", justifyContent: "flex-end" }}>
                        {!user ? (
                          <button onClick={e => { e.stopPropagation(); setLoginOpen(true); }}
                            style={{ height: 30, padding: "0 12px", borderRadius: 8, background: "#f5f0ea", color: "#5a3e28", fontSize: 12, fontWeight: 600, border: "1px solid #e8ddd2" }}>
                            🔒 Iniciá sesión
                          </button>
                        ) : cartQty > 0 ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <button onClick={e => { e.stopPropagation(); updateQty(p.id, -p.minQty); }} style={{ width: 28, height: 28, borderRadius: 7, background: "#f5f0ea", color: "#5a3e28", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #e8ddd2" }}>
                              <Icon name="minus" size={12} />
                            </button>
                            <span style={{ fontSize: 14, fontWeight: 800, minWidth: 24, textAlign: "center" as const, color: "#1a0e05" }}>{cartQty}</span>
                            <button onClick={e => { e.stopPropagation(); addToCart(p, p.minQty); }} style={{ width: 28, height: 28, borderRadius: 7, background: accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Icon name="plus" size={12} />
                            </button>
                          </div>
                        ) : (
                          <button onClick={e => { e.stopPropagation(); addToCart(p, p.minQty); }}
                            style={{ height: 30, padding: "0 12px", borderRadius: 8, background: accent, color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                            <Icon name="plus" size={12} /> Agregar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {visibleCount < filtered.length && (
              <div style={{ textAlign: "center", padding: "28px 0 8px" }}>
                <button onClick={() => setVisibleCount(v => v + 48)}
                  style={{ padding: "12px 32px", borderRadius: 12, background: accent, color: "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}>
                  Ver más ({filtered.length - visibleCount} restantes)
                </button>
              </div>
            )}
          </main>
        </div>

        {/* ── Cart overlay (mobile) ─────────────────────────────────────────── */}
        {cartOpen && <div className="cart-overlay" style={{ display: "none" }} onClick={() => setCartOpen(false)} />}

        {/* ── Cart panel ────────────────────────────────────────────────────── */}
        {cartOpen && (
          <div className="cart-panel" style={{ width: 320, background: "#fff", borderLeft: "1px solid #e8ddd2", display: "flex", flexDirection: "column", position: "fixed", top: 0, right: 0, height: "100vh", zIndex: 160, boxShadow: "-8px 0 40px rgba(0,0,0,.12)" }}>
            <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid #e8ddd2", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#1a0e05" }}>Mi pedido</span>
              <button onClick={() => setCartOpen(false)}><Icon name="close" /></button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px" }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#9a7a5a" }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🛒</div>
                  <div style={{ fontSize: 13 }}>El pedido está vacío</div>
                </div>
              ) : cart.map(item => {
                const key = item.variantSku ?? item.productId;
                return (
                  <div key={key} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid #f5f0ea" }}>
                    <ProductImg product={item} size={44} radius={8} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1a0e05", lineHeight: 1.3 }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: "#9a7a5a", marginTop: 2 }}>{fmt(item.unitPrice * item.quantity, settings.currency)}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                        <button onClick={() => updateQty(key, -1)} style={{ width: 24, height: 24, borderRadius: 5, border: "1.5px solid #e8ddd2", display: "flex", alignItems: "center", justifyContent: "center", color: "#5a3e28" }}>
                          <Icon name="minus" size={11} />
                        </button>
                        <span style={{ fontSize: 13, fontWeight: 600, minWidth: 20, textAlign: "center" as const }}>{item.quantity}</span>
                        <button onClick={() => updateQty(key, 1)} style={{ width: 24, height: 24, borderRadius: 5, border: "1.5px solid #e8ddd2", display: "flex", alignItems: "center", justifyContent: "center", color: "#5a3e28" }}>
                          <Icon name="plus" size={11} />
                        </button>
                        <button onClick={() => removeFromCart(key)} style={{ color: "#ef4444", marginLeft: 4 }}><Icon name="trash" size={13} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: "14px 18px", borderTop: "1px solid #e8ddd2" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                {cartTotalSale < cartTotal ? (
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: "#9a7a5a" }}>Precio lista</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#9a7a5a", textDecoration: "line-through" }}>{fmt(cartTotal, settings.currency)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#1a0e05" }}>Total</span>
                      <span style={{ fontSize: 22, fontWeight: 800, color: "#1a0e05" }}>{fmt(cartTotalSale, settings.currency)}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1a0e05" }}>Total</span>
                    <span style={{ fontSize: 22, fontWeight: 800, color: "#1a0e05" }}>{fmt(cartTotal, settings.currency)}</span>
                  </div>
                )}
              </div>
              <button onClick={handleSendOrder} disabled={cart.length === 0 || orderSending}
                style={{ width: "100%", height: 46, borderRadius: 10, background: "#25D366", color: "#fff", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8, border: "none", cursor: "pointer", opacity: cart.length === 0 ? 0.5 : 1 }}>
                <Icon name="whatsapp" size={20} />
                {orderSending ? "Enviando…" : user ? "Confirmar por WhatsApp" : "Iniciá sesión para pedir"}
              </button>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} style={{ width: "100%", height: 34, borderRadius: 8, border: "1.5px solid #e8ddd2", color: "#5a3e28", fontSize: 12, background: "#fff", cursor: "pointer" }}>
                  Vaciar pedido
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Product modal ──────────────────────────────────────────────────── */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 200, display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? 0 : 16 }}
          onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div style={{ background: "#fff", borderRadius: isMobile ? "20px 20px 0 0" : 18, maxWidth: 800, width: "100%", maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,.5)" }}>

            {/* Image */}
            <div style={{ position: "relative", height: isMobile ? 200 : 340, flexShrink: 0, background: "#f5f0ea", overflow: "hidden" }}>
              {selected.image
                ? <img src={selected.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "zoom-in" }} onClick={() => setLightbox(selected.image)} />
                : <div style={{ width: "100%", height: "100%", background: selected.imageColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 80 }}>{selected.imageIcon}</div>
              }
              <button style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,.45)", border: "none", borderRadius: "50%", width: 34, height: 34, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={() => setSelected(null)}>
                <Icon name="close" size={16} />
              </button>
              {selected.tag && <div style={{ position: "absolute", top: 12, left: 12 }}><Tag label={selected.tag} accent={accent} /></div>}
            </div>

            {/* Info */}
            <div style={{ padding: "16px 20px 0", borderBottom: "1px solid #e8ddd2" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9a7a5a", letterSpacing: ".4px", textTransform: "uppercase" as const, marginBottom: 2 }}>{selected.category}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#1a0e05", lineHeight: 1.2, marginBottom: 4 }}>{selected.name}</div>
              <div style={{ fontSize: 10, color: "#9a7a5a", fontFamily: "monospace", marginBottom: 8 }}>SKU: {selected.sku}</div>
              <p style={{ fontSize: 13, color: "#5a3e28", lineHeight: 1.6, marginBottom: 14 }}>{selected.description}</p>
            </div>

            {/* Body */}
            <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
              {selected.specs && Object.keys(selected.specs).length > 0 && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#9a7a5a", letterSpacing: "1px", textTransform: "uppercase" as const, marginBottom: 10 }}>Especificaciones</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px", marginBottom: 16 }}>
                    {Object.entries(selected.specs).map(([k, v]) => (
                      <div key={k} style={{ borderBottom: "1px solid #e8ddd2", paddingBottom: 6 }}>
                        <div style={{ fontSize: 11, color: "#9a7a5a", fontWeight: 600, marginBottom: 2 }}>{k}</div>
                        <div style={{ fontSize: 13, color: "#1a0e05", fontWeight: 500 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Variants */}
              {selected.variants && selected.variants.length > 0 && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#9a7a5a", letterSpacing: "1px", textTransform: "uppercase" as const, marginBottom: 8 }}>Variantes</div>
                  <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8, marginBottom: 8 }}>
                    {selected.variants.map(v => {
                      const active = selectedVariant?.sku === v.sku;
                      return (
                        <button key={v.sku} onClick={() => setSelectedVariant(v)}
                          style={{ padding: "8px 14px", borderRadius: 9, border: `1.5px solid ${active ? accent : "#e8ddd2"}`, background: active ? accent + "15" : "transparent", color: active ? accent : "#5a3e28", fontSize: 13, fontWeight: active ? 600 : 400, cursor: "pointer" }}>
                          <div>{v.label}</div>
                          {user && <div style={{ fontSize: 11, color: active ? accent : "#9a7a5a", marginTop: 2 }}>{fmt(v.price, settings.currency)}</div>}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 18px", borderTop: "1px solid #e8ddd2", background: "#faf7f4" }}>
              {user ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" as const }}>
                  {/* Qty */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f5f0ea", borderRadius: 9, padding: "6px 8px" }}>
                    <button onClick={() => setDetailQty(q => Math.max(selected.minQty, q - 1))} style={{ width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "#5a3e28" }}>
                      <Icon name="minus" size={13} />
                    </button>
                    <span style={{ fontSize: 15, fontWeight: 700, minWidth: 28, textAlign: "center" as const, color: "#1a0e05" }}>{detailQty}</span>
                    <button onClick={() => setDetailQty(q => q + 1)} style={{ width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "#5a3e28" }}>
                      <Icon name="plus" size={13} />
                    </button>
                  </div>
                  {/* Price */}
                  <div style={{ flex: 1 }}>
                    {selected.salePrice ? (
                      <>
                        <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 2 }}>
                          <span style={{ fontSize: 12, color: "#9a7a5a", textDecoration: "line-through" }}>{fmt(selected.price * detailQty, settings.currency)}</span>
                        </div>
                        <span style={{ fontSize: 22, fontWeight: 800, color: "#1a0e05" }}>{fmt(selected.salePrice * detailQty, settings.currency)}</span>
                        <div style={{ fontSize: 11, color: "#9a7a5a" }}>{fmt(selected.salePrice, settings.currency)} c/u · mín. {selected.minQty} u.</div>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: 22, fontWeight: 800, color: "#1a0e05" }}>{fmt((selectedVariant?.price ?? selected.price) * detailQty, settings.currency)}</span>
                        <div style={{ fontSize: 11, color: "#9a7a5a" }}>{fmt(selectedVariant?.price ?? selected.price, settings.currency)} c/u · mín. {selected.minQty} u.</div>
                      </>
                    )}
                  </div>
                  <button onClick={() => addToCart(selected, detailQty, selectedVariant)}
                    style={{ height: 46, padding: "0 22px", borderRadius: 10, background: accent, color: "#fff", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, border: "none", cursor: "pointer" }}>
                    <Icon name="cart" size={16} />
                    Agregar
                  </button>
                </div>
              ) : (
                <button onClick={() => { setSelected(null); setLoginOpen(true); }}
                  style={{ width: "100%", height: 46, borderRadius: 10, background: accent, color: "#fff", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: "none", cursor: "pointer" }}>
                  🔒 Iniciá sesión para ver precios
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Login modal ────────────────────────────────────────────────────── */}
      {loginOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setLoginOpen(false); }}>
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 400, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,.4)" }}>
            <div style={{ background: dark, padding: "22px 26px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <img src="/logo-origen.svg" alt={settings.businessName} style={{ height: 32, width: "auto" }} />
                <button onClick={() => setLoginOpen(false)} style={{ color: "rgba(255,255,255,.4)" }}><Icon name="close" size={16} /></button>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {(["login", "register"] as const).map(t => (
                  <button key={t} onClick={() => { setLoginTab(t); setLoginError(""); setRegMsg(""); }}
                    style={{ flex: 1, height: 36, borderRadius: "8px 8px 0 0", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                      background: loginTab === t ? "#fff" : "transparent",
                      color: loginTab === t ? dark : "rgba(255,255,255,.55)" }}>
                    {t === "login" ? "Iniciá sesión" : "Crear cuenta"}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ padding: 24 }}>
              {loginTab === "login" ? (
                <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    { label: "Email", type: "email", value: loginEmail, set: setLoginEmail, placeholder: "tu@email.com" },
                    { label: "Contraseña", type: "password", value: loginPass, set: setLoginPass, placeholder: "••••••••" },
                  ].map(f => (
                    <div key={f.label} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#9a7a5a", textTransform: "uppercase" as const, letterSpacing: ".5px" }}>{f.label}</label>
                      <input type={f.type} required value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                        style={{ height: 40, borderRadius: 8, border: `1.5px solid ${loginError ? "#ef4444" : "#e8ddd2"}`, padding: "0 12px", fontSize: 14, color: "#1a0e05", outline: "none", background: "#faf7f4" }} />
                    </div>
                  ))}
                  {loginError && <div style={{ fontSize: 12, color: "#ef4444" }}>{loginError}</div>}
                  <button type="submit" disabled={loginLoading}
                    style={{ height: 42, borderRadius: 8, background: accent, color: "#fff", fontSize: 14, fontWeight: 800, border: "none", cursor: "pointer", opacity: loginLoading ? 0.7 : 1, marginTop: 4 }}>
                    {loginLoading ? "Ingresando…" : "Ingresar"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { label: "Nombre y apellido", value: regName, set: setRegName, placeholder: "María García" },
                    { label: "Nombre del local", value: regBusiness, set: setRegBusiness, placeholder: "Cafetería El Rincón" },
                    { label: "Celular / WhatsApp", value: regPhone, set: setRegPhone, placeholder: "+54 9 11 1234-5678" },
                    { label: "Email", type: "email", value: loginEmail, set: setLoginEmail, placeholder: "tu@email.com" },
                    { label: "Contraseña", type: "password", value: loginPass, set: setLoginPass, placeholder: "Mínimo 6 caracteres" },
                  ].map(f => (
                    <div key={f.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "#9a7a5a", textTransform: "uppercase" as const, letterSpacing: ".5px" }}>{f.label}</label>
                      <input type={(f as any).type ?? "text"} required value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                        style={{ height: 38, borderRadius: 8, border: "1.5px solid #e8ddd2", padding: "0 12px", fontSize: 13, color: "#1a0e05", outline: "none", background: "#faf7f4" }} />
                    </div>
                  ))}
                  {regMsg && <div style={{ fontSize: 12, color: regMsg.startsWith("✓") ? "#16a34a" : "#ef4444" }}>{regMsg}</div>}
                  <button type="submit" disabled={loginLoading}
                    style={{ height: 40, borderRadius: 8, background: dark, color: "#F5EFE6", fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer", opacity: loginLoading ? 0.7 : 1, marginTop: 4 }}>
                    {loginLoading ? "Creando cuenta…" : "Crear mi cuenta"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Lightbox ────────────────────────────────────────────────────────── */}
      {lightbox && (
        <div onClick={() => setLightbox(null)}
          style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,.92)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out", padding: 16 }}>
          <img src={lightbox} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }} />
          <button onClick={() => setLightbox(null)}
            style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,.15)", border: "none", borderRadius: "50%", width: 38, height: 38, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="close" size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
