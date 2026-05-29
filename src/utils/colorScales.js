export const PALETTE = {
  blue: "#2363c3",
  cyanBlue: "#0081bd",
  green: "#00ae80",
  yellow: "#fcc700",
  amber: "#fbaf1e",
  orange: "#fb8521",
  header: "#008B8B",
  white: "#ffffff",
  surface: "#f6f8fb",
  border: "#dce5ec",
  text: "#203040",
  muted: "#667085",
};

export const SERVICE_COLORS = [
  PALETTE.blue,
  PALETTE.cyanBlue,
  PALETTE.green,
  PALETTE.yellow,
  PALETTE.amber,
  PALETTE.orange,
];

const DEFAULT_ZONE_COLORS = new Map([
  ["ninguna", PALETTE.cyanBlue],
  ["sin dato", PALETTE.cyanBlue],
  ["sin zona especial", PALETTE.cyanBlue],
  ["area especial", PALETTE.green],
  ["zona especial", PALETTE.green],
  ["barrio subnormal", PALETTE.orange],
  ["area rural de menor desarrollo", PALETTE.amber],
  ["área rural de menor desarrollo", PALETTE.amber],
  ["zona de dificil gestion", PALETTE.yellow],
  ["zona de difícil gestión", PALETTE.yellow],
]);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalize(value) {
  return String(value || "Sin dato")
    .trim()
    .toLowerCase();
}

export function colorForZone(value) {
  const key = normalize(value);
  if (DEFAULT_ZONE_COLORS.has(key)) return DEFAULT_ZONE_COLORS.get(key);
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash + key.charCodeAt(i) * (i + 1)) % SERVICE_COLORS.length;
  }
  return SERVICE_COLORS[hash];
}

export function radiusForConsumption(value, maxConsumption) {
  const max = Math.max(maxConsumption || 0, 1);
  const current = Math.max(value || 0, 0);
  const scaled = Math.sqrt(current / max);
  return clamp(4 + scaled * 14, 4, 18);
}

export function colorByNumericLevel(value, maxValue) {
  if (value == null || !Number.isFinite(value)) return PALETTE.cyanBlue;
  const max = Math.max(maxValue || 0, 1);
  const ratio = Math.max(0, Math.min(1, value / max));
  if (ratio >= 0.75) return PALETTE.orange;
  if (ratio >= 0.5) return PALETTE.amber;
  if (ratio >= 0.25) return PALETTE.yellow;
  return PALETTE.green;
}

export function opacityForMora(value, maxMora) {
  const max = Math.max(maxMora || 0, 1);
  const current = Math.max(value || 0, 0);
  return clamp(0.35 + (current / max) * 0.55, 0.35, 0.9);
}

export function analyticLayerColor(layer) {
  if (layer === "altoConsumo") return PALETTE.blue;
  if (layer === "altaMora") return PALETTE.orange;
  if (layer === "altaDiu") return PALETTE.yellow;
  if (layer === "altaFiu") return PALETTE.green;
  if (layer === "estratoVulnerable") return PALETTE.cyanBlue;
  if (layer === "zonaEspecialFoes") return PALETTE.amber;
  if (layer === "perdidaEnergia" || layer === "altaPerdida") return PALETTE.orange;
  if (layer === "altaInterrupcion") return PALETTE.green;
  return PALETTE.cyanBlue;
}

export function formatNumber(value, digits = 0) {
  if (value == null || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

export function formatPercent(value) {
  if (value == null || !Number.isFinite(value)) return "-";
  return `${formatNumber(value, 2)}%`;
}
