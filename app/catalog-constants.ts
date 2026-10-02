export const CATEGORIES = [
  "Café",
  "Syrups",
  "Salsas",
  "Accesorios",
] as const;

export type Category = typeof CATEGORIES[number];

export const APP_SETTINGS_KEY = "tostador_app_settings_v1";
export const CART_KEY = "tostador_cart_v1";

export const DEFAULT_APP_SETTINGS = {
  businessName: "Origen Tostadores",
  tagline: "Café de especialidad para cafeterías",
  logoText: "OT",
  accentColor: "#C4843A",
  currency: "ARS" as const,
  whatsappNumber: "5491100000000",
  contactEmail: "ventas@origentostadores.com.ar",
};

export type AppSettings = typeof DEFAULT_APP_SETTINGS & {
  currency: "ARS" | "USD" | "BRL";
};
