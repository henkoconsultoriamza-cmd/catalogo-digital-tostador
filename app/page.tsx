"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { CATEGORIES, DEFAULT_APP_SETTINGS, CART_KEY } from "./catalog-constants";
import { DEFAULT_PRODUCTS, Product, Variant } from "./catalog-data";

type CartItem = { product: Product; qty: number; variant?: Variant };

const FMT_ARS = (n: number) =>
  "$ " + n.toLocaleString("es-AR", { maximumFractionDigits: 0 });

const CAT_EMOJI: Record<string, string> = {
  Café: "☕", Syrups: "🍶", Salsas: "🍫", Accesorios: "🔧",
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const IcoCart = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);
const IcoX = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IcoSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IcoWA = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
  </svg>
);
const IcoMinus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
);
const IcoPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);

// ── Product card ──────────────────────────────────────────────────────────────
function ProductCard({ product, onOpen }: { product: Product; onOpen: (p: Product) => void }) {
  const [hover, setHover] = useState(false);
  const price = product.salePrice ?? product.price;

  return (
    <button
      onClick={() => onOpen(product)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "none", border: "none", padding: 0,
        textAlign: "left", cursor: "pointer", width: "100%",
      }}
    >
      <div style={{
        background: "#ECEAE5",
        borderRadius: 3,
        overflow: "hidden",
        aspectRatio: "1 / 1",
        position: "relative",
        marginBottom: 14,
      }}>
        <img
          src={product.image}
          alt={product.name}
          style={{
            width: "100%", height: "100%", objectFit: "cover",
            transition: "transform .5s ease",
            transform: hover ? "scale(1.05)" : "scale(1)",
          }}
          loading="lazy"
        />
        {product.tag && (
          <span style={{
            position: "absolute", top: 10, left: 10,
            background: "var(--accent)", color: "#fff",
            fontSize: 10, fontWeight: 700, letterSpacing: ".07em",
            padding: "3px 8px", borderRadius: 2, textTransform: "uppercase",
          }}>{product.tag}</span>
        )}
      </div>
      <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 3, letterSpacing: ".06em", textTransform: "uppercase" }}>
        {product.category}
      </p>
      <p style={{ fontSize: 15, fontWeight: 500, color: "var(--text)", lineHeight: 1.35, marginBottom: 8 }}>
        {product.name}
      </p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
          {FMT_ARS(price)}
        </span>
        {product.onSale && (
          <span style={{ fontSize: 12, color: "var(--text3)", textDecoration: "line-through" }}>
            {FMT_ARS(product.price)}
          </span>
        )}
      </div>
    </button>
  );
}

// ── Product modal ─────────────────────────────────────────────────────────────
function ProductModal({
  product, onClose, onAdd,
}: {
  product: Product;
  onClose: () => void;
  onAdd: (p: Product, qty: number, v?: Variant) => void;
}) {
  const [qty, setQty] = useState(product.minQty);
  const [variantIdx, setVariantIdx] = useState(0);
  const activeVariant = product.variants?.[variantIdx];
  const price = activeVariant?.price ?? product.salePrice ?? product.price;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(15,8,3,.50)",
        zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 4,
          width: "100%",
          maxWidth: 780,
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          boxShadow: "0 30px 90px rgba(15,8,3,.22)",
        }}
      >
        {/* Image */}
        <div style={{ flex: "0 0 340px", background: "#ECEAE5", position: "relative", minHeight: 420 }}>
          <img
            src={product.image}
            alt={product.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          {product.tag && (
            <span style={{
              position: "absolute", top: 14, left: 14,
              background: "var(--accent)", color: "#fff",
              fontSize: 10, fontWeight: 700, letterSpacing: ".07em",
              padding: "3px 8px", borderRadius: 2, textTransform: "uppercase",
            }}>{product.tag}</span>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>
          <div style={{ padding: "28px 28px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <p style={{ fontSize: 11, color: "var(--text3)", letterSpacing: ".09em", textTransform: "uppercase", marginBottom: 6 }}>
                {product.category} · {product.sku}
              </p>
              <h2 style={{ fontSize: 22, fontWeight: 600, color: "var(--text)", lineHeight: 1.25 }}>
                {product.name}
              </h2>
            </div>
            <button onClick={onClose} style={{ color: "var(--text3)", padding: 4, flexShrink: 0 }}>
              <IcoX />
            </button>
          </div>

          <div style={{ padding: "20px 28px", flex: 1 }}>
            <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.7, marginBottom: 20 }}>
              {product.description}
            </p>

            {product.specs && Object.keys(product.specs).length > 0 && (
              <div style={{ marginBottom: 20 }}>
                {Object.entries(product.specs).map(([k, v]) => (
                  <div key={k} style={{
                    display: "flex", justifyContent: "space-between",
                    padding: "9px 0",
                    borderBottom: "1px solid var(--border)",
                    fontSize: 13,
                  }}>
                    <span style={{ color: "var(--text3)" }}>{k}</span>
                    <span style={{ color: "var(--text)", fontWeight: 500, textAlign: "right", maxWidth: "55%" }}>{v}</span>
                  </div>
                ))}
              </div>
            )}

            {product.variants && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                {product.variants.map((v, i) => (
                  <button
                    key={v.sku}
                    onClick={() => setVariantIdx(i)}
                    style={{
                      border: `1.5px solid ${i === variantIdx ? "var(--accent)" : "var(--border)"}`,
                      borderRadius: 2, padding: "6px 14px",
                      fontSize: 13, fontWeight: 500, cursor: "pointer",
                      background: i === variantIdx ? "#FBF4EC" : "#fff",
                      color: i === variantIdx ? "var(--accent)" : "var(--text2)",
                    }}
                  >{v.label}</button>
                ))}
              </div>
            )}
          </div>

          <div style={{ padding: "20px 28px 28px", borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 26, fontWeight: 700 }}>{FMT_ARS(price)}</span>
              {product.onSale && !activeVariant && (
                <span style={{ fontSize: 14, color: "var(--text3)", textDecoration: "line-through" }}>
                  {FMT_ARS(product.price)}
                </span>
              )}
              <span style={{ fontSize: 12, color: "var(--text3)" }}>/ unidad</span>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{
                display: "flex", alignItems: "center",
                border: "1.5px solid var(--border)", borderRadius: 2,
              }}>
                <button onClick={() => setQty(q => Math.max(product.minQty, q - 1))} style={{ padding: "8px 12px", color: "var(--text2)" }}><IcoMinus /></button>
                <span style={{ minWidth: 32, textAlign: "center", fontSize: 15, fontWeight: 600 }}>{qty}</span>
                <button onClick={() => setQty(q => q + 1)} style={{ padding: "8px 12px", color: "var(--text2)" }}><IcoPlus /></button>
              </div>
              <button
                onClick={() => { onAdd(product, qty, activeVariant); onClose(); }}
                style={{
                  flex: 1,
                  background: "var(--text)", color: "#fff",
                  border: "none", borderRadius: 2,
                  padding: "12px 20px",
                  fontSize: 14, fontWeight: 600, letterSpacing: ".04em", cursor: "pointer",
                }}
              >
                Agregar al pedido
              </button>
            </div>
            <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 10, textAlign: "center" }}>
              Mínimo: {product.minQty} unidades
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Cart drawer ───────────────────────────────────────────────────────────────
function CartDrawer({
  items, settings, onClose, onUpdate, onRemove,
}: {
  items: CartItem[];
  settings: typeof DEFAULT_APP_SETTINGS;
  onClose: () => void;
  onUpdate: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}) {
  const total = items.reduce((s, i) => {
    const p = i.variant?.price ?? i.product.salePrice ?? i.product.price;
    return s + p * i.qty;
  }, 0);

  const buildMsg = () => {
    const lines = items.map(i => {
      const p = i.variant?.price ?? i.product.salePrice ?? i.product.price;
      const v = i.variant ? ` (${i.variant.label})` : "";
      return `• ${i.product.name}${v} × ${i.qty} — ${FMT_ARS(p * i.qty)}`;
    });
    return encodeURIComponent(
      `Hola! Quisiera hacer un pedido:\n\n${lines.join("\n")}\n\n*Total: ${FMT_ARS(total)}*`
    );
  };

  return (
    <div
      className="cart-panel"
      style={{ width: 380, background: "#fff", borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column" }}
    >
      <div style={{
        padding: "20px 24px", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>Tu pedido</h3>
          <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
            {items.length === 0 ? "Sin productos" : `${items.length} producto${items.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button onClick={onClose} style={{ color: "var(--text3)" }}><IcoX /></button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
        {items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text3)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>☕</div>
            <p style={{ fontSize: 14 }}>Tu pedido está vacío</p>
          </div>
        ) : (
          items.map(item => {
            const p = item.variant?.price ?? item.product.salePrice ?? item.product.price;
            return (
              <div key={item.product.id + (item.variant?.sku ?? "")} style={{
                display: "flex", gap: 12,
                paddingBottom: 16, marginBottom: 16,
                borderBottom: "1px solid var(--border)",
              }}>
                <div style={{
                  width: 56, height: 56, flexShrink: 0,
                  background: "#ECEAE5", borderRadius: 2, overflow: "hidden",
                }}>
                  <img src={item.product.image} alt={item.product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 2, color: "var(--text)" }}>
                    {item.product.name}
                    {item.variant && <span style={{ color: "var(--text3)" }}> · {item.variant.label}</span>}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 8 }}>{FMT_ARS(p)} / u.</p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--border)", borderRadius: 2 }}>
                      <button onClick={() => item.qty <= item.product.minQty ? onRemove(item.product.id) : onUpdate(item.product.id, item.qty - 1)} style={{ padding: "4px 9px", color: "var(--text3)" }}><IcoMinus /></button>
                      <span style={{ minWidth: 28, textAlign: "center", fontSize: 13, fontWeight: 600 }}>{item.qty}</span>
                      <button onClick={() => onUpdate(item.product.id, item.qty + 1)} style={{ padding: "4px 9px", color: "var(--text3)" }}><IcoPlus /></button>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{FMT_ARS(p * item.qty)}</span>
                    <button onClick={() => onRemove(item.product.id)} style={{ color: "var(--text3)", fontSize: 18, lineHeight: 1 }}>×</button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {items.length > 0 && (
        <div style={{ padding: "16px 24px 28px", borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ fontSize: 14, color: "var(--text2)" }}>Total estimado</span>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{FMT_ARS(total)}</span>
          </div>
          <a
            href={`https://wa.me/${settings.whatsappNumber}?text=${buildMsg()}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              background: "#25D366", color: "#fff", textDecoration: "none",
              borderRadius: 2, padding: "13px 20px",
              fontSize: 14, fontWeight: 600, letterSpacing: ".04em",
            }}
          >
            <IcoWA /> Enviar por WhatsApp
          </a>
          <p style={{ fontSize: 11, color: "var(--text3)", textAlign: "center", marginTop: 10 }}>
            Se abrirá WhatsApp para confirmar el pedido
          </p>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CatalogPage() {
  const settings = DEFAULT_APP_SETTINGS;
  const [products] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [cat, setCat] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [modal, setModal] = useState<Product | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_KEY);
      if (saved) setCart(JSON.parse(saved));
    } catch { /* empty */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* empty */ }
  }, [cart]);

  const filtered = products.filter(p => {
    const matchCat = cat === "all" || p.category === cat;
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const addToCart = useCallback((product: Product, qty: number, variant?: Variant) => {
    setCart(prev => {
      const idx = prev.findIndex(i => i.product.id === product.id && i.variant?.sku === variant?.sku);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + qty };
        return next;
      }
      return [...prev, { product, qty, variant }];
    });
    setCartOpen(true);
  }, []);

  const updateCart = useCallback((id: string, qty: number) => {
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, qty } : i));
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart(prev => prev.filter(i => i.product.id !== id));
  }, []);

  const totalQty = cart.reduce((s, i) => s + i.qty, 0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setModal(null); setCartOpen(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>

      {/* ── Topbar ─────────────────────────────────────────────────── */}
      <header style={{
        background: "#fff",
        borderBottom: "1px solid var(--border)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div className="topbar" style={{
          maxWidth: 1280, margin: "0 auto",
          display: "flex", alignItems: "center", gap: 20,
          padding: "0 40px", height: 64,
        }}>
          <a href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none", flexShrink: 0 }}>
            <img src="/logo-origen.svg" alt={settings.businessName} style={{ height: 30 }} />
          </a>

          <div style={{
            flex: 1, maxWidth: 440,
            display: "flex", alignItems: "center", gap: 8,
            background: "var(--cream2)", borderRadius: 2, padding: "0 14px",
          }}>
            <IcoSearch />
            <input
              type="text"
              placeholder="Buscar productos…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1, height: 38, background: "none",
                border: "none", outline: "none",
                fontSize: 14, color: "var(--text)",
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ color: "var(--text3)", padding: 2 }}>
                <IcoX />
              </button>
            )}
          </div>

          <div style={{ flex: 1 }} />

          <button
            onClick={() => setCartOpen(o => !o)}
            style={{
              position: "relative", color: "var(--text)",
              display: "flex", alignItems: "center", gap: 8,
              border: "1.5px solid var(--border)", borderRadius: 2,
              background: "#fff", padding: "8px 16px",
              fontSize: 13, fontWeight: 500, cursor: "pointer",
            }}
          >
            <IcoCart />
            {totalQty > 0 ? (
              <>
                <span>Pedido</span>
                <span style={{
                  background: "var(--accent)", color: "#fff",
                  borderRadius: "50%", width: 20, height: 20,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700,
                }}>{totalQty}</span>
              </>
            ) : (
              <span>Pedido</span>
            )}
          </button>
        </div>
      </header>

      {/* ── Category tabs ──────────────────────────────────────────── */}
      <div style={{ background: "#fff", borderBottom: "1px solid var(--border)" }}>
        <div className="cat-strip" style={{
          maxWidth: 1280, margin: "0 auto",
          display: "flex", padding: "0 40px",
          overflowX: "auto",
        }}>
          {[
            { key: "all", label: "Todo" },
            ...CATEGORIES.map(c => ({ key: c, label: `${CAT_EMOJI[c] ?? ""} ${c}` })),
          ].map(({ key, label }) => {
            const active = cat === key;
            return (
              <button
                key={key}
                onClick={() => setCat(key)}
                style={{
                  padding: "0 20px", height: 46,
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  color: active ? "var(--text)" : "var(--text3)",
                  background: "none",
                  border: "none",
                  borderBottom: active ? "2px solid var(--text)" : "2px solid transparent",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  transition: "color .15s",
                }}
              >{label}</button>
            );
          })}
        </div>
      </div>

      {/* ── Product grid ───────────────────────────────────────────── */}
      <main className="catalog-main" style={{
        maxWidth: 1280, margin: "0 auto",
        padding: "48px 40px 100px",
      }}>
        <div style={{ marginBottom: 36 }}>
          <h1 style={{
            fontSize: 12, color: "var(--text3)", letterSpacing: ".10em",
            textTransform: "uppercase", fontWeight: 500,
          }}>
            {cat === "all" ? "Catálogo completo" : cat}
            {search && <> · <span style={{ color: "var(--accent)" }}>"{search}"</span></>}
          </h1>
          <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 4 }}>
            {filtered.length} producto{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "100px 0", color: "var(--text3)" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <p style={{ fontSize: 16, fontWeight: 500 }}>Sin resultados</p>
            <p style={{ fontSize: 14, marginTop: 6 }}>Probá con otro término o categoría</p>
          </div>
        ) : (
          <div className="product-grid">
            {filtered.map(p => (
              <ProductCard key={p.id} product={p} onOpen={setModal} />
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer style={{
        background: "#fff",
        borderTop: "1px solid var(--border)",
        padding: "32px 40px",
        textAlign: "center",
      }}>
        <img src="/logo-origen.svg" alt={settings.businessName} style={{ height: 26, margin: "0 auto 12px" }} />
        <p style={{ fontSize: 13, color: "var(--text3)" }}>{settings.tagline}</p>
        <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>
          <a href={`mailto:${settings.contactEmail}`} style={{ color: "var(--text3)" }}>
            {settings.contactEmail}
          </a>
        </p>
      </footer>

      {/* ── Overlays ───────────────────────────────────────────────── */}
      {cartOpen && (
        <>
          <div
            onClick={() => setCartOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(15,8,3,.20)", zIndex: 150 }}
          />
          <CartDrawer
            items={cart}
            settings={settings}
            onClose={() => setCartOpen(false)}
            onUpdate={updateCart}
            onRemove={removeFromCart}
          />
        </>
      )}

      {modal && (
        <ProductModal
          product={modal}
          onClose={() => setModal(null)}
          onAdd={addToCart}
        />
      )}
    </div>
  );
}
