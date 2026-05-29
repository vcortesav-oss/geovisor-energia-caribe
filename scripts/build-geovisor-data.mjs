import fs from "fs";
import path from "path";
import readline from "readline";

const ROOT = path.resolve(import.meta.dirname, "..");
const CSV_PATH = path.join(ROOT, "public", "data", "dnp_tc1_tc2_s4_cs2_2026-02.csv");
const OUT_PATH = path.join(ROOT, "public", "data", "geovisor-data.json");

const SAMPLE_LIMIT = 110000;
const TOP_LIMIT = 10;
const GRID_SIZE = 0.025;
const SPATIAL_GRID = 0.008;
const SPATIAL_CELL_LIMIT = 14;
const COLOMBIA = { minLat: -4.5, maxLat: 13.8, minLng: -82, maxLng: -66 };
const COMPANY_BY_CODE = {
  48305: "Air-e",
  48307: "Afinia",
  604: "Enerbit",
};

const MARKET_BY_CODE = {
  443: "Caribe Sol",
  444: "Caribe Mar",
};

const DEPARTMENT_AREAS = [
  { name: "San Andrés y Providencia", minLat: 12.0, maxLat: 13.6, minLng: -82.2, maxLng: -80.8 },
  { name: "Atlántico", minLat: 10.45, maxLat: 11.15, minLng: -75.3, maxLng: -74.45 },
  { name: "Sucre", minLat: 8.15, maxLat: 10.0, minLng: -75.8, maxLng: -74.4 },
  { name: "Córdoba", minLat: 7.2, maxLat: 9.6, minLng: -76.6, maxLng: -74.8 },
  { name: "Cesar", minLat: 7.5, maxLat: 10.9, minLng: -74.3, maxLng: -72.7 },
  { name: "Magdalena", minLat: 9.0, maxLat: 11.45, minLng: -74.9, maxLng: -73.4 },
  { name: "La Guajira", minLat: 10.35, maxLat: 12.6, minLng: -73.9, maxLng: -71.0 },
  { name: "Bolívar", minLat: 7.0, maxLat: 10.9, minLng: -75.8, maxLng: -73.7 },
];

const MUNICIPALITY_AREAS = [
  { name: "Barranquilla", minLat: 10.88, maxLat: 11.035, minLng: -74.95, maxLng: -74.765 },
  { name: "Soledad", minLat: 10.85, maxLat: 10.975, minLng: -74.795, maxLng: -74.72 },
  { name: "Malambo", minLat: 10.75, maxLat: 10.88, minLng: -74.85, maxLng: -74.72 },
  { name: "Puerto Colombia", minLat: 11.02, maxLat: 11.08, minLng: -74.88, maxLng: -74.78 },
  { name: "Galapa", minLat: 10.88, maxLat: 10.98, minLng: -74.98, maxLng: -74.86 },
  { name: "Sabanagrande", minLat: 10.78, maxLat: 10.9, minLng: -74.78, maxLng: -74.68 },
  { name: "Baranoa", minLat: 10.73, maxLat: 10.82, minLng: -74.92, maxLng: -74.78 },
  { name: "Sabanalarga", minLat: 10.55, maxLat: 10.68, minLng: -74.95, maxLng: -74.78 },
  { name: "Palmar de Varela", minLat: 10.68, maxLat: 10.78, minLng: -75.08, maxLng: -74.92 },
  { name: "Cartagena", minLat: 10.25, maxLat: 10.55, minLng: -75.65, maxLng: -75.35 },
  { name: "Santa Marta", minLat: 11.05, maxLat: 11.35, minLng: -74.35, maxLng: -73.95 },
  { name: "Riohacha", minLat: 11.35, maxLat: 11.65, minLng: -73.25, maxLng: -72.9 },
  { name: "Valledupar", minLat: 10.35, maxLat: 10.6, minLng: -73.4, maxLng: -73.15 },
  { name: "Montería", minLat: 8.65, maxLat: 8.9, minLng: -75.95, maxLng: -75.75 },
  { name: "Sincelejo", minLat: 9.15, maxLat: 9.38, minLng: -75.5, maxLng: -75.25 },
  { name: "San Andrés", minLat: 12.45, maxLat: 12.65, minLng: -81.8, maxLng: -81.65 },
];

const metrics = {
  totalRows: 0,
  validGeoRows: 0,
  sinCoordenadas: 0,
  fueraColombia: 0,
  consumoInvalido: 0,
  diuFiuNulos: 0,
  estratoInvalido: 0,
  consumoSum: 0,
  consumoCount: 0,
  moraSum: 0,
  moraCount: 0,
  moraDelinquentSum: 0,
  moraDelinquentCount: 0,
  usuariosEnMora: 0,
  diuSum: 0,
  diuCount: 0,
  fiuSum: 0,
  fiuCount: 0,
  perdidaSum: 0,
  perdidaCount: 0,
  perdidaTerritorialSum: 0,
  zonaEspecial: 0,
};

const VALID_ESTRATOS = new Set(["1", "2", "3", "4", "5", "6", "industrial", "comercial", "oficial", "provisional", "alumbrado publico"]);
const GENERAL_SAMPLE_LIMIT_BY_DEPARTMENT = 2600;
const DEPARTMENT_SAMPLE_LIMITS = {
  Atlántico: 16000,
  Bolívar: 9000,
  Sucre: 9000,
  Cesar: 9000,
  Córdoba: 7000,
  Magdalena: 7000,
  "La Guajira": 5000,
};
const INFORMATIVE_SAMPLE_LIMIT_BY_DEPARTMENT = 4200;
const LOSS_SAMPLE_LIMIT_BY_DEPARTMENT = 2600;
const CROSS_FILTER_SAMPLE_LIMIT = 500;
const MUNICIPALITY_SAMPLE_LIMITS = {
  Barranquilla: 11000,
  Soledad: 6000,
  "Puerto Colombia": 3500,
  Baranoa: 2500,
  Sabanalarga: 2500,
  "Palmar de Varela": 2500,
  Cartagena: 5000,
  "Santa Marta": 4000,
  Montería: 3500,
  Sincelejo: 3500,
  Valledupar: 3000,
  Riohacha: 2500,
  Malambo: 2000,
  Galapa: 2000,
  Sabanagrande: 2000,
};
const departmentSamples = new Map();
const departmentInformativeSamples = new Map();
const departmentLossSamples = new Map();
const crossFilterSamples = new Map();
const municipalitySamples = new Map();
const departmentSpatialSamples = new Map();
const spatialSamples = new Map();
const filterCounts = new Map();
const residentialFilterCounts = new Map();
const clusters = new Map();
const controlSectors = new Map();
const distributions = {
  estrato: new Map(),
  tipoAreaEspecial: new Map(),
  condicionEspecial: new Map(),
  comercializador: new Map(),
  comercializadorCodigo: new Map(),
  mercado: new Map(),
  departamento: new Map(),
  municipio: new Map(),
  zonaBarrio: new Map(),
  sectorControl: new Map(),
};

function parseLine(line) {
  const out = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      quoted = !quoted;
    } else if (char === "|" && !quoted) {
      out.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  out.push(current);
  return out;
}

function toNumber(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  let cleaned = raw;
  if (raw.includes(",") && raw.includes(".")) cleaned = raw.replace(/\./g, "").replace(",", ".");
  else if (raw.includes(",")) cleaned = raw.replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function text(value, fallback = "Sin dato") {
  const cleaned = String(value ?? "").trim();
  return cleaned || fallback;
}

function estrato(value) {
  const cleaned = text(value);
  const match = /^([1-6])\b/.exec(cleaned);
  return match ? match[1] : cleaned;
}

function isSpecial(value) {
  const cleaned = text(value, "").toLowerCase();
  return cleaned && cleaned !== "ninguna" && cleaned !== "sin dato";
}

function inc(map, key) {
  const label = text(key);
  map.set(label, (map.get(label) || 0) + 1);
}

function companyName(code) {
  return COMPANY_BY_CODE[text(code, "")] || "Otros comercializadores";
}

function companyNameByMarket(companyCode, marketCode) {
  const byCode = COMPANY_BY_CODE[text(companyCode, "")];
  if (byCode) return byCode;
  if (String(marketCode) === "443") return "Air-e";
  if (String(marketCode) === "444") return "Afinia";
  return companyName(companyCode);
}

function marketName(code) {
  return MARKET_BY_CODE[text(code, "")] || "Otros mercados";
}

function departmentFromPoint(lat, lng, marketCode) {
  const found = DEPARTMENT_AREAS.find(
    (area) => lat >= area.minLat && lat <= area.maxLat && lng >= area.minLng && lng <= area.maxLng,
  );
  if (found) return found.name;
  if (String(marketCode) === "443") return "Caribe Sol";
  if (String(marketCode) === "444") return "Caribe Mar";
  return "Región Caribe";
}

function municipalityFromPoint(lat, lng, departamento) {
  const sortedAreas = [...MUNICIPALITY_AREAS].sort((a, b) => {
    const areaA = (a.maxLat - a.minLat) * (a.maxLng - a.minLng);
    const areaB = (b.maxLat - b.minLat) * (b.maxLng - b.minLng);
    return areaA - areaB;
  });
  const found = sortedAreas.find(
    (area) => lat >= area.minLat && lat <= area.maxLat && lng >= area.minLng && lng <= area.maxLng,
  );
  return found?.name || `Otros municipios - ${departamento}`;
}

function municipalityArea(municipio) {
  return MUNICIPALITY_AREAS.find((area) => area.name === municipio);
}

function zoneLabel(tipoAreaEspecial, codigoAreaEspecial) {
  const tipo = text(tipoAreaEspecial);
  const normalized = tipo
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  if (tipo === "Sin dato") return "Sin zona especial";
  if (normalized.includes("rural")) return "Área rural de menor desarrollo";
  if (normalized.includes("subnormal")) return "Barrio subnormal";
  if (normalized.includes("dificil")) return "Zona de difícil gestión";
  return "Otra zona especial";
}

function territorialQuadrant(lat, lng, municipio) {
  const area = municipalityArea(municipio);
  if (!area) return `cuadrante ${lat.toFixed(2)}, ${lng.toFixed(2)}`;
  const midLat = (area.minLat + area.maxLat) / 2;
  const midLng = (area.minLng + area.maxLng) / 2;
  const northSouth = lat >= midLat ? "norte" : "sur";
  const eastWest = lng >= midLng ? "oriente" : "occidente";
  return `${northSouth}-${eastWest}`;
}

function sectorControlLabel(municipio, zonaBarrio, lat, lng) {
  if (!municipio || municipio === "Sin dato") return zonaBarrio;
  const quadrant = territorialQuadrant(lat, lng, municipio);
  if (zonaBarrio === "Sin zona especial") return `Sector ${quadrant} de ${municipio}`;
  return `${zonaBarrio} ${quadrant} de ${municipio}`;
}

function addAvg(key, value) {
  if (value == null) return;
  metrics[`${key}Sum`] += value;
  metrics[`${key}Count`] += 1;
}

function isResidentialEstrato(value) {
  return /^[1-6]$/.test(String(value ?? "").trim());
}

function addCluster(row) {
  const key = `${Math.round(row.lat / GRID_SIZE)}:${Math.round(row.lng / GRID_SIZE)}`;
  const current = clusters.get(key) || {
    count: 0,
    lat: 0,
    lng: 0,
    consumo: 0,
    mora: 0,
    diu: 0,
    fiu: 0,
    perdida: 0,
  };
  current.count += 1;
  current.lat += row.lat;
  current.lng += row.lng;
  current.consumo += row.consumo || 0;
  current.mora += row.diasMora || 0;
  current.diu += row.diu || 0;
  current.fiu += row.fiu || 0;
  current.perdida += row.perdidaEnergia || 0;
  clusters.set(key, current);
}

function addControlSector(row) {
  const current = controlSectors.get(row.sectorControl) || {
    sector: row.sectorControl,
    municipio: row.municipio,
    departamento: row.departamento,
    zonaBarrio: row.zonaBarrio,
    count: 0,
    lat: 0,
    lng: 0,
    consumo: 0,
    mora: 0,
    diu: 0,
    fiu: 0,
    perdida: 0,
    perdidaCount: 0,
  };
  current.count += 1;
  current.lat += row.lat;
  current.lng += row.lng;
  current.consumo += row.consumo || 0;
  current.mora += row.diasMora || 0;
  current.diu += row.diu || 0;
  current.fiu += row.fiu || 0;
  if (row.perdidaEnergia != null) {
    current.perdida += row.perdidaEnergia;
    current.perdidaCount += 1;
  }
  controlSectors.set(row.sectorControl, current);
}

function toTop(map) {
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count, pct: metrics.validGeoRows ? (count / metrics.validGeoRows) * 100 : 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_LIMIT);
}

function avg(sum, count) {
  return count ? sum / count : null;
}

const MARKET_LOSS_BASELINE = {
  443: 28.5,
  444: 31.2,
  default: 30,
};

function marketLossBaseline(mercadoCodigo) {
  const code = String(mercadoCodigo ?? "").trim();
  return MARKET_LOSS_BASELINE[code] ?? MARKET_LOSS_BASELINE.default;
}

function isInformative(row) {
  return (
    row.enZonaEspecial ||
    row.diu != null ||
    row.fiu != null ||
    row.perdidaEnergia != null ||
    (row.diasMora != null && row.diasMora > 0)
  );
}

function pushSample(map, key, row, limit) {
  const rows = map.get(key) || [];
  if (rows.length < limit) {
    rows.push(row);
    map.set(key, rows);
  }
}

function departmentSampleLimit(departamento) {
  return DEPARTMENT_SAMPLE_LIMITS[departamento] || GENERAL_SAMPLE_LIMIT_BY_DEPARTMENT;
}

function addSample(row) {
  const spatialKey = `${row.municipio}|${Math.round(row.lat / SPATIAL_GRID)}:${Math.round(row.lng / SPATIAL_GRID)}`;
  pushSample(spatialSamples, spatialKey, row, SPATIAL_CELL_LIMIT);
  const departmentSpatialKey = `${row.departamento}|${Math.round(row.lat / SPATIAL_GRID)}:${Math.round(row.lng / SPATIAL_GRID)}`;
  pushSample(departmentSpatialSamples, departmentSpatialKey, row, SPATIAL_CELL_LIMIT);
  const municipalityLimit = MUNICIPALITY_SAMPLE_LIMITS[row.municipio];
  if (municipalityLimit) {
    pushSample(municipalitySamples, row.municipio, row, municipalityLimit);
  }
  pushSample(departmentSamples, row.departamento, row, departmentSampleLimit(row.departamento));
  pushSample(crossFilterSamples, `${row.comercializador}|${row.municipio}`, row, CROSS_FILTER_SAMPLE_LIMIT);
  if (row.perdidaEnergia != null) {
    pushSample(departmentLossSamples, row.departamento, row, LOSS_SAMPLE_LIMIT_BY_DEPARTMENT);
  }
  if (isInformative(row)) {
    pushSample(departmentInformativeSamples, row.departamento, row, INFORMATIVE_SAMPLE_LIMIT_BY_DEPARTMENT);
  }
}

function interleaveMapSamples(output, seen, map, limit) {
  const buckets = Array.from(map.values()).filter((rows) => rows.length);
  if (!buckets.length) return;

  const maxLen = Math.max(...buckets.map((rows) => rows.length));
  for (let index = 0; index < maxLen && output.length < limit; index += 1) {
    for (const rows of buckets) {
      const row = rows[index];
      if (!row || seen.has(row.id)) continue;
      output.push(row);
      seen.add(row.id);
      if (output.length >= limit) return;
    }
  }
}

function interleaveSpatialSamples(output, seen, limit) {
  interleaveMapSamples(output, seen, spatialSamples, limit);
}

function interleaveSamples(limit) {
  const output = [];
  const seen = new Set();

  for (const rows of crossFilterSamples.values()) {
    for (const row of rows) {
      if (seen.has(row.id)) continue;
      output.push(row);
      seen.add(row.id);
    }
  }

  interleaveMapSamples(output, seen, municipalitySamples, limit);
  interleaveMapSamples(output, seen, departmentSpatialSamples, limit);
  interleaveSpatialSamples(output, seen, limit);

  const buckets = new Map();
  for (const [department, rows] of departmentLossSamples.entries()) {
    buckets.set(department, [...rows.filter((row) => !seen.has(row.id))]);
  }
  for (const [department, rows] of departmentInformativeSamples.entries()) {
    const current = buckets.get(department) || [];
    const bucketSeen = new Set(current.map((row) => row.id));
    for (const row of rows) {
      if (seen.has(row.id) || bucketSeen.has(row.id)) continue;
      current.push(row);
      bucketSeen.add(row.id);
    }
    buckets.set(department, current);
  }
  for (const [department, rows] of departmentSamples.entries()) {
    const current = buckets.get(department) || [];
    const bucketSeen = new Set(current.map((row) => row.id));
    for (const row of rows) {
      if (seen.has(row.id) || bucketSeen.has(row.id)) continue;
      current.push(row);
      bucketSeen.add(row.id);
    }
    buckets.set(department, current);
  }

  const departments = Array.from(buckets.keys()).sort((a, b) => String(a).localeCompare(String(b), "es"));
  let index = 0;
  while (output.length < limit) {
    let added = false;
    for (const department of departments) {
      const row = buckets.get(department)?.[index];
      if (row) {
        output.push(row);
        seen.add(row.id);
        added = true;
        if (output.length >= limit) break;
      }
    }
    if (!added) break;
    index += 1;
  }
  return output;
}

const input = fs.createReadStream(CSV_PATH, { encoding: "utf8" });
const rl = readline.createInterface({ input, crlfDelay: Infinity });

let headers = null;
let validIndex = 0;

for await (const line of rl) {
  if (!headers) {
    headers = parseLine(line);
    continue;
  }

  const values = parseLine(line);
  const raw = Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  metrics.totalRows += 1;

  const lat = toNumber(raw.TC1_LATITUD_USU);
  const lng = toNumber(raw.TC1_LONGITUD_USU);
  const consumo = toNumber(raw.CAR_T1743_CONS_USUARIO);
  const diasMora = toNumber(raw.CAR_T1743_DIAS_MORA);
  const diu = toNumber(raw.DIU);
  const fiu = toNumber(raw.FIU);
  const perdidaEnergia = toNumber(raw.S4_PORC_PERDIDA_ENE);
  const rowEstrato = estrato(raw.ESTRATO);
  const tipoAreaEspecial = text(raw.TIPO_AREA_ESP);
  const condicionEspecial = text(raw.CONDICIONES_ESP);
  const comercializadorCodigo = text(raw.TC1_ID_COMER);
  const mercadoCodigo = text(raw.TC1_ID_MERCADO);
  const comercializador = companyNameByMarket(comercializadorCodigo, mercadoCodigo);
  const mercado = marketName(mercadoCodigo);
  const departamento = departmentFromPoint(lat, lng, mercadoCodigo);
  const municipio = municipalityFromPoint(lat, lng, departamento);
  const zonaBarrio = zoneLabel(tipoAreaEspecial, raw.TC1_COD_AREA_ESP);

  if (lat == null || lng == null) {
    metrics.sinCoordenadas += 1;
    continue;
  }
  if (lat < COLOMBIA.minLat || lat > COLOMBIA.maxLat || lng < COLOMBIA.minLng || lng > COLOMBIA.maxLng) {
    metrics.fueraColombia += 1;
    continue;
  }

  metrics.validGeoRows += 1;
  validIndex += 1;
  const sectorControl = sectorControlLabel(municipio, zonaBarrio, lat, lng);
  if (consumo == null || consumo < 0) metrics.consumoInvalido += 1;
  if (diu == null || fiu == null) metrics.diuFiuNulos += 1;
  if (!VALID_ESTRATOS.has(rowEstrato.toLowerCase())) metrics.estratoInvalido += 1;
  if (isSpecial(tipoAreaEspecial) || isSpecial(condicionEspecial)) metrics.zonaEspecial += 1;

  addAvg("consumo", consumo);
  addAvg("mora", diasMora);
  if (diasMora != null && diasMora > 0) {
    metrics.usuariosEnMora += 1;
    metrics.moraDelinquentSum += diasMora;
    metrics.moraDelinquentCount += 1;
  }
  addAvg("diu", diu);
  addAvg("fiu", fiu);
  if (perdidaEnergia != null) {
    addAvg("perdida", perdidaEnergia);
    metrics.perdidaTerritorialSum += perdidaEnergia;
  } else {
    metrics.perdidaTerritorialSum += marketLossBaseline(mercadoCodigo);
  }

  inc(distributions.estrato, rowEstrato);
  inc(distributions.tipoAreaEspecial, tipoAreaEspecial);
  inc(distributions.condicionEspecial, condicionEspecial);
  inc(distributions.comercializador, comercializador);
  inc(distributions.comercializadorCodigo, comercializadorCodigo);
  inc(distributions.mercado, mercado);
  inc(distributions.departamento, departamento);
  inc(distributions.municipio, municipio);
  inc(distributions.zonaBarrio, zonaBarrio);
  inc(distributions.sectorControl, sectorControl);
  filterCounts.set(`${comercializador}|${municipio}|${departamento}`, (filterCounts.get(`${comercializador}|${municipio}|${departamento}`) || 0) + 1);
  if (isResidentialEstrato(rowEstrato)) {
    residentialFilterCounts.set(
      `${comercializador}|${municipio}|${departamento}`,
      (residentialFilterCounts.get(`${comercializador}|${municipio}|${departamento}`) || 0) + 1,
    );
  }

  const normalized = {
    id: `${text(raw.TC1_ID_COMER)}-${text(raw.TC1_ID_MERCADO)}-${text(raw.TC1_NIU)}-${validIndex}`,
    comercializador,
    comercializadorCodigo,
    mercado,
    mercadoCodigo,
    departamento,
    municipio,
    zonaBarrio,
    sectorControl,
    niu: text(raw.TC1_NIU),
    lat,
    lng,
    condicionEspecial,
    tipoAreaEspecial,
    codigoAreaEspecial: text(raw.TC1_COD_AREA_ESP),
    estrato: rowEstrato,
    consumo,
    diasMora,
    diu,
    fiu,
    perdidaEnergia,
    enZonaEspecial: isSpecial(tipoAreaEspecial) || isSpecial(condicionEspecial),
    hasCoordinates: true,
    inColombia: true,
  };

  addSample(normalized);
  addCluster(normalized);
  addControlSector(normalized);
}

const finalSample = interleaveSamples(SAMPLE_LIMIT);

const clusterRows = Array.from(clusters.entries())
  .map(([key, cluster]) => ({
    key,
    count: cluster.count,
    lat: cluster.lat / cluster.count,
    lng: cluster.lng / cluster.count,
    consumoPromedio: cluster.consumo / cluster.count,
    moraPromedio: cluster.mora / cluster.count,
    diuPromedio: cluster.diu / cluster.count,
    fiuPromedio: cluster.fiu / cluster.count,
    perdidaPromedio: cluster.perdida / cluster.count,
  }))
  .filter((cluster) => cluster.count >= 10)
  .sort((a, b) => b.count - a.count)
  .slice(0, 1600);

const controlSectorRows = Array.from(controlSectors.values())
  .map((sector) => {
    const consumoPromedio = sector.consumo / sector.count;
    const moraPromedio = sector.mora / sector.count;
    const diuPromedio = sector.diu / sector.count;
    const fiuPromedio = sector.fiu / sector.count;
    const perdidaPromedio = sector.perdidaCount ? sector.perdida / sector.perdidaCount : null;
    const interrupcionPromedio = diuPromedio + fiuPromedio;
    const prioridad = consumoPromedio * 0.35 + moraPromedio * 1.2 + (perdidaPromedio || 0) * 4 + interrupcionPromedio * 2;
    return {
      sector: sector.sector,
      municipio: sector.municipio,
      departamento: sector.departamento,
      zonaBarrio: sector.zonaBarrio,
      usuarios: sector.count,
      lat: sector.lat / sector.count,
      lng: sector.lng / sector.count,
      consumoPromedio,
      moraPromedio,
      perdidaPromedio,
      interrupcionPromedio,
      prioridad,
    };
  })
  .filter((sector) => sector.usuarios >= 50)
  .sort((a, b) => b.prioridad - a.prioridad)
  .slice(0, 50);

const output = {
  generatedAt: new Date().toISOString(),
  source: path.basename(CSV_PATH),
  metrics: {
    ...metrics,
    consumoPromedio: avg(metrics.consumoSum, metrics.consumoCount),
    promedioDiasMora: avg(metrics.moraSum, metrics.moraCount),
    promedioDiasMoraEnMora: avg(metrics.moraDelinquentSum, metrics.moraDelinquentCount),
    porcentajeUsuariosEnMora: metrics.moraCount ? (metrics.usuariosEnMora / metrics.moraCount) * 100 : null,
    promedioDiu: avg(metrics.diuSum, metrics.diuCount),
    promedioFiu: avg(metrics.fiuSum, metrics.fiuCount),
    promedioPerdida: avg(metrics.perdidaTerritorialSum, metrics.validGeoRows),
    promedioPerdidaZonaEspecial: avg(metrics.perdidaSum, metrics.perdidaCount),
  },
  distributions: {
    estrato: toTop(distributions.estrato),
    tipoAreaEspecial: toTop(distributions.tipoAreaEspecial),
    condicionEspecial: toTop(distributions.condicionEspecial),
    comercializador: toTop(distributions.comercializador),
    comercializadorCodigo: toTop(distributions.comercializadorCodigo),
    mercado: toTop(distributions.mercado),
    departamento: toTop(distributions.departamento),
    municipio: toTop(distributions.municipio),
    zonaBarrio: toTop(distributions.zonaBarrio),
    sectorControl: toTop(distributions.sectorControl),
  },
  clusters: clusterRows,
  controlSectors: controlSectorRows,
  filterCounts: Array.from(filterCounts.entries())
    .map(([key, count]) => {
      const [comercializador, municipio, departamento] = key.split("|");
      return { comercializador, municipio, departamento, count };
    })
    .sort((a, b) => b.count - a.count),
  residentialFilterCounts: Array.from(residentialFilterCounts.entries())
    .map(([key, count]) => {
      const [comercializador, municipio, departamento] = key.split("|");
      return { comercializador, municipio, departamento, count };
    })
    .sort((a, b) => b.count - a.count),
  sample: finalSample,
};

fs.writeFileSync(OUT_PATH, JSON.stringify(output));
console.log(`Wrote ${OUT_PATH}`);
console.log(`sample=${finalSample.length} clusters=${clusterRows.length} sectors=${controlSectorRows.length} valid=${metrics.validGeoRows}`);
