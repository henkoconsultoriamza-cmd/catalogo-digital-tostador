import { DEFAULT_APP_SETTINGS, AppSettings, CATEGORIES, APP_SETTINGS_KEY, CART_KEY } from "./catalog-constants";

export { DEFAULT_APP_SETTINGS, CATEGORIES, APP_SETTINGS_KEY, CART_KEY };
export type { AppSettings };

export type Variant = {
  sku: string;
  label: string;
  price: number;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  category: typeof CATEGORIES[number];
  description: string;
  price: number;
  salePrice?: number;
  minQty: number;
  image: string;
  imageColor: string;
  imageIcon: string;
  tag?: string;
  onSale?: boolean;
  specs?: Record<string, string>;
  variants?: Variant[];
};

export const DEFAULT_PRODUCTS: Product[] = [
  // ── Café ─────────────────────────────────────────────────────────────────
  {
    id: "cafe-001",
    sku: "CF-ESP-1KG",
    name: "Blend Espresso Intenso",
    category: "Café",
    description: "Blend de especialidad para máquinas de espresso. Notas de chocolate amargo y frutos secos con cuerpo intenso y crema persistente. Ideal para cortados, lattes y macchiatos.",
    price: 12500,
    salePrice: 11000,
    minQty: 5,
    image: "https://images.unsplash.com/photo-1690983323458-ec4a54fc9552?w=600&q=80",
    imageColor: "#3D1F0A",
    imageIcon: "☕",
    tag: "Más vendido",
    onSale: true,
    specs: { "Presentación": "1 kg en bolsa válvula", "Proceso": "Tueste medio-oscuro", "Origen": "Brasil + Colombia", "Molturación": "En grano o molido" },
  },
  {
    id: "cafe-002",
    sku: "CF-SUV-1KG",
    name: "Blend Espresso Suave",
    category: "Café",
    description: "Blend de perfil equilibrado con notas florales y cítricas suaves. Bajo en acidez, excelente para cold brew y café de filtro. Amplia versatilidad de preparación.",
    price: 11800,
    minQty: 5,
    image: "https://images.unsplash.com/photo-1748295600393-5314e7009c9b?w=600&q=80",
    imageColor: "#5C3010",
    imageIcon: "☕",
    specs: { "Presentación": "1 kg en bolsa válvula", "Proceso": "Tueste medio", "Origen": "Etiopía + Brasil", "Molturación": "En grano o molido" },
  },
  {
    id: "cafe-003",
    sku: "CF-MOL-250G",
    name: "Café Molido Comercial",
    category: "Café",
    description: "Café molido para cafetera de filtro, máquina de émbolo y espresso. Molienda estándar. Presentación ideal para retails y góndola de cafetería.",
    price: 3500,
    minQty: 12,
    image: "https://images.unsplash.com/photo-1753837787691-84a06d715d24?w=600&q=80",
    imageColor: "#2A1205",
    imageIcon: "☕",
    tag: "Nuevo",
    specs: { "Presentación": "250 g en doypack", "Molienda": "Media", "Vida útil": "12 meses" },
  },
  {
    id: "cafe-004",
    sku: "CF-DEC-1KG",
    name: "Descafeinado Premium",
    category: "Café",
    description: "100% descafeinado por proceso de agua. Mantiene el perfil aromático completo. Ideal para la última hora del día o clientes sensibles a la cafeína.",
    price: 13500,
    minQty: 3,
    image: "https://images.unsplash.com/photo-1753837787446-646a6f68dd4c?w=600&q=80",
    imageColor: "#7A5030",
    imageIcon: "🌙",
    specs: { "Presentación": "1 kg en bolsa válvula", "Proceso": "Swiss Water Process", "Cafeína": "< 0.1%" },
  },

  // ── Syrups ────────────────────────────────────────────────────────────────
  {
    id: "syr-001",
    sku: "SY-VAN-750",
    name: "Syrup Vainilla",
    category: "Syrups",
    description: "Syrup sabor vainilla para lattes, cappuccinos y bebidas frías. Botella con dosificador. Rendimiento aproximado: 50 porciones por botella.",
    price: 2800,
    minQty: 6,
    image: "https://images.unsplash.com/photo-1770376924086-5c9f36723081?w=600&q=80",
    imageColor: "#D4B060",
    imageIcon: "🍶",
    tag: "Más vendido",
    specs: { "Presentación": "750 ml con dosificador", "Uso": "20 ml por porción", "Rendimiento": "~37 usos" },
  },
  {
    id: "syr-002",
    sku: "SY-CAR-750",
    name: "Syrup Caramelo",
    category: "Syrups",
    description: "Syrup de caramelo artesanal. Perfecto para macchiatos, frappés y bebidas heladas con un toque dulce ahumado.",
    price: 2800,
    minQty: 6,
    image: "https://images.unsplash.com/photo-1790877740709-00398163c8ca?w=600&q=80",
    imageColor: "#B86020",
    imageIcon: "🍯",
    specs: { "Presentación": "750 ml con dosificador", "Uso": "20 ml por porción" },
  },
  {
    id: "syr-003",
    sku: "SY-AVE-750",
    name: "Syrup Avellana",
    category: "Syrups",
    description: "Syrup de avellana tostada. Combina ideal con espresso doble. Muy demandado en cafeterías gourmet.",
    price: 2800,
    minQty: 6,
    image: "https://images.unsplash.com/photo-1770376924759-77125b500ede?w=600&q=80",
    imageColor: "#8B4513",
    imageIcon: "🌰",
    specs: { "Presentación": "750 ml con dosificador", "Uso": "20 ml por porción" },
  },
  {
    id: "syr-004",
    sku: "SY-FRA-750",
    name: "Syrup Frambuesa",
    category: "Syrups",
    description: "Syrup de frambuesa para bebidas frías y calientes. Excelente en smoothies, lattes de fruta y refrescos de café.",
    price: 2800,
    minQty: 6,
    image: "https://images.unsplash.com/photo-1618924385045-52295bd2dfeb?w=600&q=80",
    imageColor: "#A0102A",
    imageIcon: "🍓",
    specs: { "Presentación": "750 ml con dosificador" },
  },
  {
    id: "syr-005",
    sku: "SY-MEN-750",
    name: "Syrup Menta",
    category: "Syrups",
    description: "Syrup de menta fresca ideal para iced mochas, frappés y smoothies. Refrescante y versátil.",
    price: 2800,
    minQty: 6,
    image: "https://images.unsplash.com/photo-1761077207280-f2adf2cec226?w=600&q=80",
    imageColor: "#1A5C30",
    imageIcon: "🌿",
    specs: { "Presentación": "750 ml con dosificador" },
  },

  // ── Salsas ────────────────────────────────────────────────────────────────
  {
    id: "sal-001",
    sku: "SA-CHO-1KG",
    name: "Salsa de Chocolate",
    category: "Salsas",
    description: "Salsa de cacao premium para decoración y sabor. Ideal para mochaccinos, frappés y postres de cafetería. Envase con dosificador giratorio.",
    price: 3200,
    minQty: 4,
    image: "https://images.unsplash.com/photo-1605434936597-f20eb0968474?w=600&q=80",
    imageColor: "#3C1F05",
    imageIcon: "🍫",
    tag: "Más vendido",
    specs: { "Presentación": "1 kg envase con dosificador", "Cacao": "> 30%", "Uso recomendado": "Cobertura y saborizante" },
  },
  {
    id: "sal-002",
    sku: "SA-DDL-1KG",
    name: "Salsa Dulce de Leche",
    category: "Salsas",
    description: "Salsa de dulce de leche fluido para bebidas calientes y frías. Perfecto para el café con leche tradicional con un toque especial.",
    price: 3400,
    minQty: 4,
    image: "https://images.unsplash.com/photo-1611755245722-4de68826dc6f?w=600&q=80",
    imageColor: "#C08020",
    imageIcon: "🥛",
    specs: { "Presentación": "1 kg envase con dosificador", "Origen": "Leche vacuna" },
  },
  {
    id: "sal-003",
    sku: "SA-CAR-1KG",
    name: "Salsa de Caramelo",
    category: "Salsas",
    description: "Salsa de caramelo artesanal de textura fluida. Para decorar vasos, topping de frappés y bebidas premium.",
    price: 3200,
    minQty: 4,
    image: "https://images.unsplash.com/photo-1756132540577-0a8da3e0f0f6?w=600&q=80",
    imageColor: "#C06010",
    imageIcon: "🍮",
    specs: { "Presentación": "1 kg envase con dosificador" },
  },

  // ── Accesorios ────────────────────────────────────────────────────────────
  {
    id: "acc-001",
    sku: "AC-TAM-58",
    name: "Tamper de Acero 58 mm",
    category: "Accesorios",
    description: "Tamper de acero inoxidable con base plana de 58 mm. Compatible con portafiltros estándar. Mango ergonómico con peso equilibrado para una presión uniforme.",
    price: 4500,
    minQty: 1,
    image: "https://images.unsplash.com/photo-1769259614936-18cf38911b60?w=600&q=80",
    imageColor: "#708090",
    imageIcon: "🔧",
    specs: { "Diámetro": "58 mm", "Material": "Acero inoxidable 304", "Peso": "180 g" },
  },
  {
    id: "acc-002",
    sku: "AC-JAR-500",
    name: "Jarra de Vapor 500 ml",
    category: "Accesorios",
    description: "Jarra de acero inoxidable para texturizar leche. Punta larga para latte art. Boca estrecha para mayor control del flujo.",
    price: 3800,
    minQty: 1,
    image: "https://images.unsplash.com/photo-1538665216082-301de62859b7?w=600&q=80",
    imageColor: "#C0C8D0",
    imageIcon: "🥛",
    variants: [
      { sku: "AC-JAR-500-IND", label: "500 ml", price: 3800 },
      { sku: "AC-JAR-1L-IND", label: "1 litro", price: 4500 },
    ],
    specs: { "Material": "Acero inoxidable 18/8", "Punta": "Larga" },
  },
  {
    id: "acc-003",
    sku: "AC-TER-BAR",
    name: "Termómetro de Barista",
    category: "Accesorios",
    description: "Termómetro con clip para jarra de vapor. Lectura instantánea. Rango 0-120 °C. Esencial para texturizar leche a temperatura precisa.",
    price: 1800,
    minQty: 2,
    image: "https://images.unsplash.com/photo-1503847526538-824483d02f15?w=600&q=80",
    imageColor: "#E04020",
    imageIcon: "🌡️",
    specs: { "Rango": "0–120 °C", "Clip": "Para jarras 300–1000 ml" },
  },
  {
    id: "acc-004",
    sku: "AC-CEP-BAR",
    name: "Cepillo Limpiador de Grupo",
    category: "Accesorios",
    description: "Cepillo de cerda natural para limpiar el grupo y el portafiltros. Mango de madera. Imprescindible para el mantenimiento diario de la máquina.",
    price: 950,
    minQty: 5,
    image: "https://images.unsplash.com/photo-1769970630153-dae09cf8114b?w=600&q=80",
    imageColor: "#8B6040",
    imageIcon: "🪣",
    specs: { "Material cerdas": "Nylon", "Mango": "Madera natural" },
  },
  {
    id: "acc-005",
    sku: "AC-DOS-CAF",
    name: "Dosificador de Café",
    category: "Accesorios",
    description: "Dosificador de 7 g para portafiltros simple. Plástico de uso alimentario. Garantiza dosis reproducibles en cada extracción.",
    price: 650,
    minQty: 10,
    image: "https://images.unsplash.com/photo-1769259614606-c79038ef2344?w=600&q=80",
    imageColor: "#304050",
    imageIcon: "📏",
    specs: { "Dosis": "7 g ± 0.5 g", "Material": "Plástico food-grade" },
  },

];

// ── Catálogo de máquinas disponibles para comodato (uso interno admin) ────────
export type ComodatoMachine = {
  id: string;
  name: string;
  model: string;
  minKgMonth: number;
  description: string;
};

export const COMODATO_MACHINES: ComodatoMachine[] = [
  { id: "M-ESP-SEMI", name: "Espresso Semiautomática", model: "2 grupos — caldera doble", minKgMonth: 10, description: "Requiere molinillo. Para barista con experiencia." },
  { id: "M-ESP-AUTO", name: "Espresso Full Automática", model: "Superautomática — molinillo integrado", minKgMonth: 15, description: "Fácil de operar. Para alto volumen." },
  { id: "M-FIL-PRO",  name: "Cafetera de Filtro",      model: "Filtro 2 litros/ciclo",               minKgMonth: 5,  description: "Ideal para desayunos y eventos." },
];
