export const RAW_FIELDS = {
  comercializador: "TC1_ID_COMER",
  mercado: "TC1_ID_MERCADO",
  niu: "TC1_NIU",
  latitud: "TC1_LATITUD_USU",
  longitud: "TC1_LONGITUD_USU",
  condicionesEspeciales: "CONDICIONES_ESP",
  tipoAreaEspecial: "TIPO_AREA_ESP",
  codigoAreaEspecial: "TC1_COD_AREA_ESP",
  estrato: "ESTRATO",
  consumo: "CAR_T1743_CONS_USUARIO",
  diasMora: "CAR_T1743_DIAS_MORA",
  perdidaEnergia: "S4_PORC_PERDIDA_ENE",
  diu: "DIU",
  fiu: "FIU",
};

export const DEFAULT_DATA_URL = "/data/dnp_tc1_tc2_s4_cs2_2026-02.csv";
export const DEFAULT_OPTIMIZED_DATA_URL = "/data/geovisor-data.json";

export { CAPA_LABELS, ANALYTIC_LAYER_OPTIONS } from "./labels";
import { CAPA_LABELS } from "./labels";

const COLOMBIA_BOUNDS = {
  minLat: -4.5,
  maxLat: 13.8,
  minLng: -82,
  maxLng: -66,
};

const MARKET_LOSS_BASELINE = {
  443: 28.5,
  444: 31.2,
  default: 30,
};

export function marketLossBaseline(mercadoCodigo) {
  const code = String(mercadoCodigo ?? "").trim();
  return MARKET_LOSS_BASELINE[code] ?? MARKET_LOSS_BASELINE.default;
}

export function averageRegionalLoss(rows) {
  if (!rows.length) return null;
  let sum = 0;
  for (const row of rows) {
    sum +=
      row.perdidaEnergia != null && Number.isFinite(row.perdidaEnergia)
        ? row.perdidaEnergia
        : marketLossBaseline(row.mercadoCodigo);
  }
  return sum / rows.length;
}

const VALID_ESTRATOS = new Set([
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "industrial",
  "comercial",
  "oficial",
  "especial",
  "residencial",
]);

export const TIPO_SERVICIO_OPTIONS = ["Residencial", "No residencial"];

export const INITIAL_FILTERS = {
  comercializador: "Todos",
  mercado: "Todos",
  departamento: "Todos",
  municipio: "Todos",
  sectorControl: "Todos",
  zonaBarrio: "Todos",
  tipoServicio: "Todos",
  estrato: "Todos",
  condicionEspecial: "Todos",
  tipoAreaEspecial: "Todos",
  consumoMin: "",
  consumoMax: "",
  moraMin: "",
  moraMax: "",
  diuMin: "",
  diuMax: "",
  fiuMin: "",
  fiuMax: "",
  perdidaMin: "",
  perdidaMax: "",
  visualMode: "general",
  capaAnalitica: "todos",
};

const SELECT_FILTER_LABELS = {
  comercializador: "Empresa comercializadora",
  mercado: "Mercado",
  departamento: "Departamento",
  municipio: "Municipio",
  sectorControl: "Sector / barrio operativo",
  zonaBarrio: "Tipo de zona especial (FOES)",
  tipoServicio: "Tipo de servicio",
  estrato: "Estrato",
  condicionEspecial: "Condición especial del servicio",
};

const RANGE_FILTER_LABELS = [
  { min: "consumoMin", max: "consumoMax", label: "Consumo" },
  { min: "moraMin", max: "moraMax", label: "Mora" },
  { min: "diuMin", max: "diuMax", label: "DIU" },
  { min: "fiuMin", max: "fiuMax", label: "FIU" },
  { min: "perdidaMin", max: "perdidaMax", label: "Pérdida" },
];


const VULNERABLE_ESTRATOS = new Set(["1", "2"]);

const VISUAL_MODE_LABELS = {
  general: "Vista general",
  zona: "Color por zona especial",
  consumo: "Color por consumo",
  mora: "Color por mora",
  perdida: "Color por pérdida",
};

export function hasActiveFilters(filters) {
  return Object.entries(filters).some(([key, value]) => value !== INITIAL_FILTERS[key]);
}

export function hasDataFilters(filters) {
  return Object.entries(filters).some(([key, value]) => {
    if (key === "visualMode" || key === "capaAnalitica") return false;
    return value !== INITIAL_FILTERS[key];
  });
}

function matchesFilterValue(selected, value) {
  return selected === "Todos" || String(value) === String(selected);
}

export function getFullDatasetFilterCount(filterCounts, filters, optimized) {
  if (!hasDataFilters(filters)) return null;

  const hasTerritorialFilter =
    filters.comercializador !== "Todos" ||
    filters.municipio !== "Todos" ||
    filters.departamento !== "Todos" ||
    filters.mercado !== "Todos";

  const hasTipoServicioFilter = filters.tipoServicio !== "Todos";

  if (!hasTerritorialFilter && !hasTipoServicioFilter) return null;

  if (filters.departamento !== "Todos" && filters.municipio === "Todos" && filters.comercializador === "Todos" && filters.tipoServicio === "Todos") {
    const match = optimized?.distributions?.departamento?.find((item) => item.label === filters.departamento);
    return match?.count ?? null;
  }

  if (filters.mercado !== "Todos" && filters.municipio === "Todos" && filters.comercializador === "Todos" && filters.departamento === "Todos" && filters.tipoServicio === "Todos") {
    const match = optimized?.distributions?.mercado?.find((item) => item.label === filters.mercado);
    return match?.count ?? null;
  }

  const countsSource =
    filters.tipoServicio === "Residencial" ? optimized?.residentialFilterCounts : filterCounts;

  if (!countsSource?.length) return null;

  if (hasTerritorialFilter || filters.tipoServicio === "Residencial") {
    return countsSource
      .filter(
        (item) =>
          matchesFilterValue(filters.comercializador, item.comercializador) &&
          matchesFilterValue(filters.municipio, item.municipio) &&
          matchesFilterValue(filters.departamento, item.departamento || "Todos") &&
          matchesFilterValue(filters.mercado, item.mercado || "Todos"),
      )
      .reduce((sum, item) => sum + item.count, 0);
  }

  return null;
}

export function getActiveFilterEntries(filters) {
  const entries = [];

  for (const [key, label] of Object.entries(SELECT_FILTER_LABELS)) {
    if (filters[key] !== INITIAL_FILTERS[key]) {
      entries.push({ label, value: filters[key] });
    }
  }

  for (const field of RANGE_FILTER_LABELS) {
    const min = filters[field.min];
    const max = filters[field.max];
    if (!min && !max) continue;
    const value = min && max ? `${min} a ${max}` : min ? `desde ${min}` : `hasta ${max}`;
    entries.push({ label: field.label, value });
  }

  return entries;
}

/** Anonimiza el NIU mostrando solo los últimos 4 dígitos: ****1234. */
export function anonymizeNiu(niu) {
  const raw = String(niu ?? "").trim();
  if (!raw) return "****";
  const last4 = raw.slice(-4);
  return `****${last4}`;
}

export function toNumber(value) {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = String(value).trim();
  if (!raw) return null;
  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");
  let cleaned = raw;
  if (hasComma && hasDot) {
    cleaned = raw.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    cleaned = raw.replace(",", ".");
  }
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanText(value, fallback = "Sin dato") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function isNoSpecialCondition(value) {
  const text = cleanText(value, "").toLowerCase();
  return !text || text === "ninguna" || text === "no" || text === "sin dato";
}

function isInColombia(lat, lng) {
  return (
    lat >= COLOMBIA_BOUNDS.minLat &&
    lat <= COLOMBIA_BOUNDS.maxLat &&
    lng >= COLOMBIA_BOUNDS.minLng &&
    lng <= COLOMBIA_BOUNDS.maxLng
  );
}

function normalizeEstrato(value) {
  const text = cleanText(value);
  const estratoMatch = /^([1-6])\b/.exec(text);
  if (estratoMatch) return estratoMatch[1];
  if (/^\d+(\.0+)?$/.test(text)) return String(parseInt(text, 10));
  return text;
}

function sectorFromPoint(lat, lng, zonaBarrio) {
  if (lat == null || lng == null) return "Sector operativo sin coordenada";
  const northSouth = lat >= 10 ? "norte" : "sur";
  const eastWest = lng >= -75 ? "oriente" : "occidente";
  const zone = zonaBarrio === "Sin zona/barrio especial" ? "Sector" : zonaBarrio;
  return `${zone} ${northSouth}-${eastWest} de la Región Caribe`;
}

export function normalizeRow(row, index) {
  const lat = toNumber(row[RAW_FIELDS.latitud]);
  const lng = toNumber(row[RAW_FIELDS.longitud]);
  const consumo = toNumber(row[RAW_FIELDS.consumo]);
  const diasMora = toNumber(row[RAW_FIELDS.diasMora]);
  const diu = toNumber(row[RAW_FIELDS.diu]);
  const fiu = toNumber(row[RAW_FIELDS.fiu]);
  const perdidaEnergia = toNumber(row[RAW_FIELDS.perdidaEnergia]);
  const estrato = normalizeEstrato(row[RAW_FIELDS.estrato]);
  const condicionEspecial = cleanText(row[RAW_FIELDS.condicionesEspeciales]);
  const tipoAreaEspecial = cleanText(row[RAW_FIELDS.tipoAreaEspecial]);
  const zonaBarrio =
    cleanText(row[RAW_FIELDS.codigoAreaEspecial]) === "0"
      ? "Sin zona/barrio especial"
      : `Código ${cleanText(row[RAW_FIELDS.codigoAreaEspecial])}`;

  return {
    id: `${cleanText(row[RAW_FIELDS.niu], "NIU")}-${index}`,
    comercializador: cleanText(row[RAW_FIELDS.comercializador]),
    mercado: cleanText(row[RAW_FIELDS.mercado]),
    departamento: "Región Caribe",
    municipio: "Otros municipios - Región Caribe",
    sectorControl: sectorFromPoint(lat, lng, zonaBarrio),
    zonaBarrio,
    niu: cleanText(row[RAW_FIELDS.niu], "Sin NIU"),
    lat,
    lng,
    condicionEspecial,
    tipoAreaEspecial,
    codigoAreaEspecial: cleanText(row[RAW_FIELDS.codigoAreaEspecial]),
    estrato,
    consumo,
    diasMora,
    diu,
    fiu,
    perdidaEnergia,
    enZonaEspecial: !isNoSpecialCondition(condicionEspecial) || !isNoSpecialCondition(tipoAreaEspecial),
    hasCoordinates: lat != null && lng != null,
    inColombia: lat != null && lng != null ? isInColombia(lat, lng) : false,
  };
}

export function normalizeRows(rows) {
  return rows.map((row, index) => normalizeRow(row, index));
}

export function splitQuality(rows) {
  const issues = {
    sinCoordenadas: 0,
    fueraColombia: 0,
    consumoInvalido: 0,
    diuFiuNulos: 0,
    estratoInvalido: 0,
  };

  const validGeoRows = [];

  for (const row of rows) {
    if (!row.hasCoordinates) {
      issues.sinCoordenadas += 1;
    } else if (!row.inColombia) {
      issues.fueraColombia += 1;
    } else {
      validGeoRows.push(row);
    }

    if (row.consumo == null || row.consumo < 0) issues.consumoInvalido += 1;
    if (row.diu == null || row.fiu == null) issues.diuFiuNulos += 1;
    if (!VALID_ESTRATOS.has(String(row.estrato).trim().toLowerCase())) issues.estratoInvalido += 1;
  }

  return { validGeoRows, issues };
}

function average(rows, key) {
  const values = rows.map((row) => row[key]).filter((value) => value != null && Number.isFinite(value));
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function averageMoraDays(rows) {
  if (!rows.length) return null;
  const sum = rows.reduce((total, row) => total + (row.diasMora ?? 0), 0);
  return sum / rows.length;
}

export function averageMoraDaysForDelinquentUsers(rows) {
  const enMora = rows.filter((row) => row.diasMora != null && row.diasMora > 0);
  if (!enMora.length) return null;
  return enMora.reduce((total, row) => total + row.diasMora, 0) / enMora.length;
}

export function percentUsersInMora(rows) {
  const withKnownMora = rows.filter((row) => row.diasMora != null && Number.isFinite(row.diasMora));
  if (!withKnownMora.length) return null;
  const enMora = withKnownMora.filter((row) => row.diasMora > 0).length;
  return (enMora / withKnownMora.length) * 100;
}

export function calculateKpis(rows) {
  return {
    totalUsuarios: rows.length,
    consumoPromedio: average(rows, "consumo"),
    usuariosZonaEspecial: rows.filter((row) => row.enZonaEspecial).length,
    promedioDiu: average(rows, "diu"),
    promedioFiu: average(rows, "fiu"),
    promedioDiasMora: averageMoraDays(rows),
    promedioDiasMoraEnMora: averageMoraDaysForDelinquentUsers(rows),
    porcentajeUsuariosEnMora: percentUsersInMora(rows),
    promedioPerdida: averageRegionalLoss(rows),
  };
}

export function calculateKpisFromMetrics(metrics) {
  return {
    totalUsuarios: metrics?.validGeoRows || metrics?.totalRows || 0,
    consumoPromedio: metrics?.consumoPromedio ?? null,
    usuariosZonaEspecial: metrics?.zonaEspecial || 0,
    promedioDiu: metrics?.promedioDiu ?? null,
    promedioFiu: metrics?.promedioFiu ?? null,
    promedioDiasMora: metrics?.promedioDiasMora ?? null,
    promedioDiasMoraEnMora: metrics?.promedioDiasMoraEnMora ?? null,
    porcentajeUsuariosEnMora: metrics?.porcentajeUsuariosEnMora ?? null,
    promedioPerdida: metrics?.promedioPerdida ?? null,
  };
}

export function topCategories(rows, key, limit = 6) {
  const counts = new Map();
  for (const row of rows) {
    const label = row[key] || "Sin dato";
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count, pct: rows.length ? (count / rows.length) * 100 : 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function uniqueSorted(rows, key) {
  return Array.from(new Set(rows.map((row) => row[key]).filter(Boolean))).sort((a, b) =>
    String(a).localeCompare(String(b), "es", { numeric: true }),
  );
}

function sortStrings(values) {
  return Array.from(values).sort((a, b) =>
    String(a).localeCompare(String(b), "es", { numeric: true }),
  );
}

export function buildFilterOptions(rows) {
  return {
    comercializadores: uniqueSorted(rows, "comercializador"),
    mercados: uniqueSorted(rows, "mercado"),
    departamentos: uniqueSorted(rows, "departamento"),
    municipios: uniqueSorted(rows, "municipio"),
    municipiosByDepartamento: buildMunicipiosByDepartamento(rows),
    sectoresControl: uniqueSorted(rows, "sectorControl"),
    zonasBarrios: uniqueSorted(rows, "zonaBarrio"),
    estratos: uniqueSorted(rows, "estrato"),
    condicionesEspeciales: uniqueSorted(rows, "condicionEspecial"),
    tiposAreaEspecial: uniqueSorted(rows, "tipoAreaEspecial"),
  };
}

function buildMunicipiosByDepartamento(rows) {
  const map = new Map();
  for (const row of rows) {
    const depto = row.departamento;
    const muni = row.municipio;
    if (!depto || !muni) continue;
    if (!map.has(depto)) map.set(depto, new Set());
    map.get(depto).add(muni);
  }
  const result = {};
  for (const [depto, set] of map.entries()) {
    result[depto] = sortStrings(set);
  }
  return result;
}

/**
 * Construye las opciones de filtro usando filterCounts del JSON optimizado,
 * que contiene TODOS los departamentos/municipios del dataset completo
 * (no solo la muestra). Mantiene la relación departamento -> municipios.
 * Si se entrega `colombiaGeo` (DIVIPOLA oficial), se incluyen TODOS los
 * departamentos y municipios de Colombia, no solo los presentes en el dataset.
 */
export function buildFilterOptionsFromOptimized(optimized, sampleRows, colombiaGeo) {
  const sampleOptions = buildFilterOptions(sampleRows);

  const departamentos = new Set(sampleOptions.departamentos);
  const municipios = new Set(sampleOptions.municipios);
  const byDepto = new Map();
  for (const [depto, list] of Object.entries(sampleOptions.municipiosByDepartamento || {})) {
    byDepto.set(depto, new Set(list));
  }

  const addPair = (depto, muni) => {
    if (depto) departamentos.add(depto);
    if (muni) municipios.add(muni);
    if (depto && muni) {
      if (!byDepto.has(depto)) byDepto.set(depto, new Set());
      byDepto.get(depto).add(muni);
    }
  };

  const counts = optimized?.filterCounts;
  if (Array.isArray(counts)) {
    for (const item of counts) addPair(item.departamento, item.municipio);
  }

  // Listado oficial DIVIPOLA: garantiza todos los departamentos y municipios de Colombia.
  if (Array.isArray(colombiaGeo)) {
    for (const entry of colombiaGeo) {
      const depto = entry?.departamento;
      const ciudades = Array.isArray(entry?.ciudades) ? entry.ciudades : [];
      if (depto) departamentos.add(depto);
      for (const muni of ciudades) addPair(depto, muni);
    }
  }

  const municipiosByDepartamento = {};
  for (const [depto, set] of byDepto.entries()) {
    municipiosByDepartamento[depto] = sortStrings(set);
  }

  return {
    ...sampleOptions,
    departamentos: sortStrings(departamentos),
    municipios: sortStrings(municipios),
    municipiosByDepartamento,
  };
}

function inRange(value, min, max) {
  const lo = toNumber(min);
  const hi = toNumber(max);
  if (value == null) return lo == null && hi == null;
  if (lo != null && value < lo) return false;
  if (hi != null && value > hi) return false;
  return true;
}

function matchesSelect(value, selected) {
  return selected === "Todos" || String(value) === String(selected);
}

export function isResidentialUser(estrato) {
  return /^[1-6]$/.test(String(estrato ?? "").trim());
}

function matchesTipoServicio(row, selected) {
  if (selected === "Todos") return true;
  const residential = isResidentialUser(row.estrato);
  if (selected === "Residencial") return residential;
  if (selected === "No residencial") return !residential;
  return true;
}

export function applyFilters(rows, filters) {
  return rows.filter((row) => {
    if (!matchesSelect(row.comercializador, filters.comercializador)) return false;
    if (!matchesSelect(row.mercado, filters.mercado)) return false;
    if (!matchesSelect(row.departamento, filters.departamento)) return false;
    if (!matchesSelect(row.municipio, filters.municipio)) return false;
    if (!matchesSelect(row.sectorControl, filters.sectorControl)) return false;
    if (!matchesSelect(row.zonaBarrio, filters.zonaBarrio)) return false;
    if (!matchesTipoServicio(row, filters.tipoServicio)) return false;
    if (!matchesSelect(row.estrato, filters.estrato)) return false;
    if (!matchesSelect(row.condicionEspecial, filters.condicionEspecial)) return false;
    if (!matchesSelect(row.tipoAreaEspecial, filters.tipoAreaEspecial)) return false;
    if (!inRange(row.consumo, filters.consumoMin, filters.consumoMax)) return false;
    if (!inRange(row.diasMora, filters.moraMin, filters.moraMax)) return false;
    if (!inRange(row.diu, filters.diuMin, filters.diuMax)) return false;
    if (!inRange(row.fiu, filters.fiuMin, filters.fiuMax)) return false;
    if (!inRange(row.perdidaEnergia, filters.perdidaMin, filters.perdidaMax)) return false;
    return true;
  });
}

export function percentile(rows, key, p) {
  const values = rows
    .map((row) => row[key])
    .filter((value) => value != null && Number.isFinite(value))
    .sort((a, b) => a - b);
  if (!values.length) return null;
  const index = Math.min(values.length - 1, Math.max(0, Math.ceil((p / 100) * values.length) - 1));
  return values[index];
}

export function buildRiskThresholds(rows) {
  return {
    consumo: percentile(rows, "consumo", 85),
    mora: percentile(rows, "diasMora", 85),
    perdida: percentile(rows, "perdidaEnergia", 85),
    diu: percentile(rows, "diu", 85),
    fiu: percentile(rows, "fiu", 85),
  };
}

export function filterByAnalyticLayer(rows, layer, thresholds) {
  if (layer === "altoConsumo") return rows.filter((row) => row.consumo != null && row.consumo >= thresholds.consumo);
  if (layer === "altaMora") return rows.filter((row) => row.diasMora != null && row.diasMora >= thresholds.mora);
  if (layer === "altaDiu") return rows.filter((row) => row.diu != null && row.diu >= thresholds.diu);
  if (layer === "altaFiu") return rows.filter((row) => row.fiu != null && row.fiu >= thresholds.fiu);
  if (layer === "estratoVulnerable") return rows.filter((row) => VULNERABLE_ESTRATOS.has(String(row.estrato)));
  if (layer === "zonaEspecialFoes") return rows.filter((row) => row.enZonaEspecial);
  if (layer === "perdidaEnergia") {
    return rows.filter((row) => row.perdidaEnergia != null && row.perdidaEnergia >= thresholds.perdida);
  }
  // Capas legacy del visor anterior: mapear a equivalentes actuales.
  if (layer === "altaPerdida") {
    return rows.filter((row) => row.perdidaEnergia != null && row.perdidaEnergia >= thresholds.perdida);
  }
  if (layer === "altaInterrupcion") {
    return rows.filter(
      (row) =>
        (row.diu != null && row.diu >= thresholds.diu) || (row.fiu != null && row.fiu >= thresholds.fiu),
    );
  }
  return rows;
}
