/** Etiquetas estándar DIU/FIU (duración y frecuencia de interrupciones, anualizadas). */
export const DIU_LABEL = "DIU (horas/suscriptor/año)";
export const FIU_LABEL = "FIU (interrupciones/suscriptor/año)";

export const CAPA_LABELS = {
  todos: "Sin capa analítica",
  concentracion: "Concentración de suscriptores/hogares",
  altoConsumo: "Alto consumo",
  altaMora: "Alta mora",
  altaDiu: "Alta DIU",
  altaFiu: "Alta FIU",
};

export const ANALYTIC_LAYER_OPTIONS = Object.entries(CAPA_LABELS).map(([value, label]) => ({
  value,
  label,
}));

/** Capa por defecto cuando no hay una capa analítica seleccionada o se descontinuó la anterior. */
export const DEFAULT_ANALYTIC_LAYER = "todos";

/** Capas que ya no existen en el selector y deben mapearse a la capa por defecto. */
export function normalizeAnalyticLayer(layer) {
  return Object.prototype.hasOwnProperty.call(CAPA_LABELS, layer) ? layer : DEFAULT_ANALYTIC_LAYER;
}
