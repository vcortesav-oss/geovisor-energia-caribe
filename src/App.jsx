import Papa from "papaparse";
import { useEffect, useMemo, useState } from "react";
import FiltersPanel from "./components/FiltersPanel";
import ActiveFiltersBar from "./components/ActiveFiltersBar";
import KpiCards from "./components/KpiCards";
import Legend from "./components/Legend";
import MapView, { buildMapClusters } from "./components/MapView";
import ScatterChart from "./components/ScatterChart";
import {
  CAPA_LABELS,
  DEFAULT_DATA_URL,
  DEFAULT_OPTIMIZED_DATA_URL,
  INITIAL_FILTERS,
  applyFilters,
  buildFilterOptionsFromOptimized,
  buildRiskThresholds,
  calculateKpis,
  calculateKpisFromMetrics,
  filterByAnalyticLayer,
  getActiveFilterEntries,
  getFullDatasetFilterCount,
  hasDataFilters,
  normalizeRows,
  splitQuality,
  topCategories,
} from "./utils/dataCleaning";
import { formatNumber, formatPercent } from "./utils/colorScales";
import { DIU_LABEL, FIU_LABEL, normalizeAnalyticLayer } from "./utils/labels";

const superserviciosLogoUrl = "/superservicios-logo.png";
const observatorioLogoUrl = "/observatorio-logo.png";
const COLOMBIA_DIVIPOLA_URL = "/data/colombia-divipola.json";

function QualityPanel({ issues, totalRows, validRows }) {
  const items = [
    ["Registros sin latitud o longitud", issues.sinCoordenadas],
    ["Coordenadas fuera de Colombia", issues.fueraColombia],
    ["Consumos nulos o negativos", issues.consumoInvalido],
    ["DIU/FIU nulos", issues.diuFiuNulos],
    ["Estratos no validos", issues.estratoInvalido],
  ];

  return (
    <section className="card quality-card">
      <div className="card-header">
        <h2>Calidad de datos</h2>
        <span>{formatNumber(validRows)} georreferenciados validos</span>
      </div>
      <div className="quality-grid">
        {items.map(([label, value]) => (
          <article key={label}>
            <strong>{formatNumber(value)}</strong>
            <span>{label}</span>
          </article>
        ))}
      </div>
      <p>Base cargada: {formatNumber(totalRows)} registros.</p>
    </section>
  );
}

function DistributionPanel({ title, data }) {
  return (
    <section className="card distribution-card">
      <div className="card-header">
        <h2>{title}</h2>
      </div>
      <div className="distribution-list">
        {data.map((item) => (
          <article key={item.label}>
            <div>
              <strong>{item.label}</strong>
              <span>{formatNumber(item.count)} suscriptores/hogares</span>
            </div>
            <div className="bar-track" aria-hidden="true">
              <i style={{ width: `${Math.max(item.pct, 2)}%` }} />
            </div>
            <em>{formatPercent(item.pct)}</em>
          </article>
        ))}
      </div>
    </section>
  );
}

function consumptionBuckets(rows) {
  const buckets = [
    { label: "Sin consumo", min: null, max: 0, count: 0 },
    { label: "Bajo (1 a 100)", min: 1, max: 100, count: 0 },
    { label: "Medio (101 a 300)", min: 101, max: 300, count: 0 },
    { label: "Alto (301 a 800)", min: 301, max: 800, count: 0 },
    { label: "Muy alto (más de 800)", min: 801, max: Infinity, count: 0 },
  ];
  for (const row of rows) {
    const value = row.consumo;
    const bucket =
      value == null || value <= 0
        ? buckets[0]
        : buckets.find((item) => value >= item.min && value <= item.max) || buckets[buckets.length - 1];
    bucket.count += 1;
  }
  return buckets.map((bucket) => ({
    label: bucket.label,
    count: bucket.count,
    pct: rows.length ? (bucket.count / rows.length) * 100 : 0,
  }));
}

function MapInsightsPanel({ rows, visualMode, filtered }) {
  const zoneRows = topCategories(rows, "zonaBarrio", 4);
  const consumptionRows = consumptionBuckets(rows);
  const dominantZone = zoneRows[0]?.label || "Sin datos";
  const modeText = {
    zona: "Los colores separan los suscriptores/hogares por tipo de zona especial.",
    consumo: "Los colores muestran bajo, medio, alto y muy alto consumo.",
    mora: "Los colores resaltan dónde se concentran hogares con más días de mora.",
    perdida: "Los colores resaltan zonas con mayor porcentaje de pérdida de energía.",
  };

  return (
    <section className="card map-insights-card">
      <div className="card-header">
        <h2>Consumo energético por territorio</h2>
        <span>{formatNumber(rows.length)} suscriptores/hogares {filtered ? "en la selección" : "analizados"}</span>
      </div>
      <div className="map-insights-body">
        <article className="insight-summary">
          <strong>{dominantZone}</strong>
          <span>Zona predominante en el filtro actual</span>
          <p>{modeText[visualMode]}</p>
        </article>
        <div>
          <h3>Suscriptores/hogares por zona</h3>
          <div className="mini-bars">
            {zoneRows.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <i style={{ width: `${Math.max(item.pct, 2)}%` }} />
                <em>{formatPercent(item.pct)}</em>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3>Suscriptores/hogares por consumo</h3>
          <div className="mini-bars">
            {consumptionRows.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <i style={{ width: `${Math.max(item.pct, 2)}%` }} />
                <em>{formatPercent(item.pct)}</em>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DataValidationPanel({ optimized }) {
  if (!optimized?.metrics) return null;
  return (
    <section className="card validation-card">
      <div>
        <strong>Datos rectificados para lectura territorial</strong>
        <span>
          El archivo cargado contiene coordenadas por suscriptor/hogar, consumo, mora, pérdidas, DIU/FIU, estrato y
          zonas especiales. No incluye nombre oficial de barrio; por eso el visor construye sectores operativos desde
          la ubicación geográfica para apoyar vigilancia y control.
        </span>
      </div>
      <article>
        <b>{formatNumber(optimized.metrics.validGeoRows)}</b>
        <span>suscriptores/hogares georreferenciados en toda la base (sin filtros)</span>
      </article>
      <article>
        <b>{formatNumber(optimized.controlSectors?.length || 0)}</b>
        <span>sectores críticos calculados</span>
      </article>
    </section>
  );
}

function buildControlPriorities(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = row.sectorControl || row.municipio || "Sector sin clasificar";
    const current = groups.get(key) || {
      sector: key,
      usuarios: 0,
      consumo: 0,
      mora: 0,
      perdida: 0,
      interrupcion: 0,
      withPerdida: 0,
      withMora: 0,
    };
    current.usuarios += 1;
    current.consumo += row.consumo || 0;
    current.mora += row.diasMora || 0;
    current.perdida += row.perdidaEnergia || 0;
    current.interrupcion += (row.diu || 0) + (row.fiu || 0);
    if (row.perdidaEnergia != null) current.withPerdida += 1;
    if (row.diasMora != null) current.withMora += 1;
    groups.set(key, current);
  }

  return Array.from(groups.values())
    .map((item) => {
      const consumoPromedio = item.consumo / Math.max(item.usuarios, 1);
      const moraPromedio = item.mora / Math.max(item.withMora || item.usuarios, 1);
      const perdidaPromedio = item.perdida / Math.max(item.withPerdida || item.usuarios, 1);
      const interrupcionPromedio = item.interrupcion / Math.max(item.usuarios, 1);
      const prioridad = consumoPromedio * 0.35 + moraPromedio * 1.2 + perdidaPromedio * 4 + interrupcionPromedio * 2;
      return { ...item, consumoPromedio, moraPromedio, perdidaPromedio, interrupcionPromedio, prioridad };
    })
    .filter((item) => item.usuarios >= 10)
    .sort((a, b) => b.prioridad - a.prioridad)
    .slice(0, 6);
}

function ControlPanel({ rows }) {
  const priorities = buildControlPriorities(rows);
  return (
    <section className="card control-card">
      <div className="card-header">
        <h2>Pérdida de energía por territorio</h2>
        <span>Calculado sobre la selección actual ({formatNumber(rows.length)} suscriptores/hogares)</span>
      </div>
      <div className="control-grid">
        {priorities.map((item, index) => (
          <article key={item.sector}>
            <strong>{index + 1}. {item.sector}</strong>
            <span>{formatNumber(item.usuarios)} suscriptores/hogares georreferenciados</span>
            <div className="control-metrics">
              <p><b>{formatNumber(item.consumoPromedio, 1)}</b><span>Consumo prom. (kWh/mes)</span></p>
              <p><b>{formatNumber(item.moraPromedio, 1)}</b><span>Mora prom. (días)</span></p>
              <p><b>{formatPercent(item.perdidaPromedio)}</b><span>Pérdida prom. (%)</span></p>
              <p><b>{formatNumber(item.interrupcionPromedio, 2)}</b><span>Continuidad prom. (DIU + FIU)</span></p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

const TABLE_PAGE_SIZE = 12;

function DataTable({ rows }) {
  const [page, setPage] = useState(0);

  const rowsWithLoss = useMemo(
    () => rows.filter((row) => row.perdidaEnergia != null && Number.isFinite(row.perdidaEnergia)),
    [rows],
  );
  const tableRows = rowsWithLoss.length ? rowsWithLoss : rows;

  const sortedRows = useMemo(
    () =>
      [...tableRows].sort((a, b) => {
        const score = (row) =>
          (row.perdidaEnergia != null ? 20 : 0) +
          (row.enZonaEspecial ? 4 : 0) +
          (row.diu != null ? 2 : 0) +
          (row.fiu != null ? 2 : 0) +
          (row.diasMora > 0 ? 1 : 0) +
          (row.perdidaEnergia || 0);
        return score(b) - score(a);
      }),
    [tableRows],
  );

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / TABLE_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageStart = currentPage * TABLE_PAGE_SIZE;
  const pageRows = sortedRows.slice(pageStart, pageStart + TABLE_PAGE_SIZE);
  const pageEnd = sortedRows.length ? Math.min(pageStart + pageRows.length, sortedRows.length) : 0;

  useEffect(() => {
    setPage(0);
  }, [rows]);

  return (
    <section className="card data-card">
      <div className="card-header">
        <h2>Mora y comportamiento comercial</h2>
        <span>
          {rowsWithLoss.length
            ? `${formatNumber(rowsWithLoss.length)} con pérdida reportada`
            : `${formatNumber(rows.length)} registros`}
        </span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>NIU</th>
              <th>Empresa</th>
              <th>Departamento</th>
              <th>Municipio</th>
              <th>Sector / barrio</th>
              <th>Consumo (kWh/mes)</th>
              <th>Estrato</th>
              <th>Mora (días)</th>
              <th>{DIU_LABEL}</th>
              <th>{FIU_LABEL}</th>
              <th>Zona especial</th>
              <th>% perdida</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length ? (
              pageRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.niu}</td>
                  <td>{row.comercializador}</td>
                  <td>{row.departamento}</td>
                  <td>{row.municipio}</td>
                  <td>{row.sectorControl}</td>
                  <td>{formatNumber(row.consumo, 1)}</td>
                  <td>{row.estrato}</td>
                  <td>{formatNumber(row.diasMora)}</td>
                  <td>{formatNumber(row.diu, 2)}</td>
                  <td>{formatNumber(row.fiu, 2)}</td>
                  <td>{row.zonaBarrio}</td>
                  <td>{row.perdidaEnergia != null ? formatPercent(row.perdidaEnergia) : "Sin reporte"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={12} className="table-empty">
                  No hay registros para la selección actual.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {sortedRows.length > TABLE_PAGE_SIZE ? (
        <div className="table-pagination" aria-label="Paginación de la tabla">
          <p>
            Mostrando {formatNumber(pageStart + 1)}–{formatNumber(pageEnd)} de {formatNumber(sortedRows.length)}{" "}
            registros
          </p>
          <div className="table-pagination__controls">
            <button type="button" disabled={currentPage === 0} onClick={() => setPage((value) => value - 1)}>
              Anterior
            </button>
            <span>
              Página {formatNumber(currentPage + 1)} de {formatNumber(totalPages)}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setPage((value) => value + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      ) : sortedRows.length ? (
        <div className="table-pagination table-pagination--single">
          <p>Mostrando {formatNumber(sortedRows.length)} registros</p>
        </div>
      ) : null}
    </section>
  );
}

function TerritoryInfoPanel({ rows, optimized, useFilteredData }) {
  const blocks = useFilteredData
    ? [
        ["Empresas comercializadoras", topCategories(rows, "comercializador", 5)],
        ["Departamentos", topCategories(rows, "departamento", 5)],
        ["Municipios principales", topCategories(rows, "municipio", 5)],
      ]
    : optimized?.distributions
      ? [
          ["Empresas comercializadoras", optimized.distributions.comercializador],
          ["Departamentos", optimized.distributions.departamento],
          ["Municipios principales", optimized.distributions.municipio],
        ]
      : [
          ["Empresas comercializadoras", topCategories(rows, "comercializador", 5)],
          ["Departamentos", topCategories(rows, "departamento", 5)],
          ["Municipios principales", topCategories(rows, "municipio", 5)],
        ];

  if (!blocks[0]?.[1]?.length) return null;

  return (
    <section className="card query-card">
      <div className="card-header">
        <h2>Composición territorial y comercial</h2>
        <span>{useFilteredData ? "Según filtros aplicados" : "Suscriptores/hogares activos analizados"}</span>
      </div>
      <div className="query-grid">
        {blocks.map(([title, blockRows]) => (
          <article key={title}>
            <h3>{title}</h3>
            {blockRows.slice(0, 5).map((row) => (
              <p key={row.label}>
                <strong>{row.label}</strong>
                <span>{formatNumber(row.count)} suscriptores/hogares</span>
              </p>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}

export default function App() {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ ...INITIAL_FILTERS });
  const [resetVersion, setResetVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [optimized, setOptimized] = useState(null);
  const [colombiaGeo, setColombiaGeo] = useState(null);

  useEffect(() => {
    fetch(COLOMBIA_DIVIPOLA_URL)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setColombiaGeo(Array.isArray(data) ? data : null))
      .catch(() => setColombiaGeo(null));
  }, []);

  useEffect(() => {
    const optimizedUrl = import.meta.env.VITE_OPTIMIZED_DATA_URL || DEFAULT_OPTIMIZED_DATA_URL;
    fetch(optimizedUrl)
      .then((response) => {
        if (!response.ok) throw new Error("optimized-data-unavailable");
        return response.json();
      })
      .then((data) => {
        setOptimized(data);
        setRows(data.sample || []);
        setLoading(false);
      })
      .catch(() => {
        const dataUrl = import.meta.env.VITE_DATA_URL || DEFAULT_DATA_URL;
        Papa.parse(dataUrl, {
          download: true,
          header: true,
          delimiter: "|",
          skipEmptyLines: true,
          worker: true,
          complete: ({ data, errors }) => {
            if (errors?.length) {
              setError(`Se detectaron ${errors.length} advertencias al leer el CSV.`);
            }
            setRows(normalizeRows(data));
            setLoading(false);
          },
          error: (parseError) => {
            setError(parseError.message || "No fue posible cargar el dataset.");
            setLoading(false);
          },
        });
      });
  }, []);

  const { validGeoRows } = useMemo(() => {
    if (optimized?.metrics) {
      return {
        validGeoRows: rows,
        issues: {},
      };
    }
    return splitQuality(rows);
  }, [optimized, rows]);

  const options = useMemo(
    () => buildFilterOptionsFromOptimized(optimized, rows, colombiaGeo),
    [optimized, rows, colombiaGeo],
  );
  const municipioOptions = useMemo(() => {
    if (filters.departamento !== "Todos" && options.municipiosByDepartamento?.[filters.departamento]) {
      return options.municipiosByDepartamento[filters.departamento];
    }
    return options.municipios;
  }, [filters.departamento, options]);

  // Saneamos cualquier capa analítica descontinuada (p.ej. "Pérdida de energía (%)").
  useEffect(() => {
    const normalized = normalizeAnalyticLayer(filters.capaAnalitica);
    if (normalized !== filters.capaAnalitica) {
      setFilters((prev) => ({ ...prev, capaAnalitica: normalized }));
    }
  }, [filters.capaAnalitica]);

  const handleFiltersChange = (nextFilters) => {
    const updated = { ...nextFilters };
    updated.capaAnalitica = normalizeAnalyticLayer(updated.capaAnalitica);
    // Si cambia el departamento, valida que el municipio pertenezca al nuevo departamento.
    if (updated.departamento !== filters.departamento && updated.municipio !== "Todos") {
      const validMunicipios =
        updated.departamento !== "Todos"
          ? options.municipiosByDepartamento?.[updated.departamento] || []
          : options.municipios;
      if (!validMunicipios.includes(updated.municipio)) {
        updated.municipio = "Todos";
      }
    }
    setFilters(updated);
  };

  const filteredRows = useMemo(() => applyFilters(validGeoRows, filters), [validGeoRows, filters]);
  const thresholds = useMemo(() => buildRiskThresholds(filteredRows), [filteredRows]);
  const analyticRows = useMemo(
    () => filterByAnalyticLayer(filteredRows, filters.capaAnalitica, thresholds),
    [filteredRows, filters.capaAnalitica, thresholds],
  );
  const activeFilterEntries = useMemo(() => getActiveFilterEntries(filters), [filters]);
  const fullDatasetFilterCount = useMemo(
    () => getFullDatasetFilterCount(optimized?.filterCounts, filters, optimized),
    [optimized, filters],
  );
  const dataFiltersAreActive = hasDataFilters(filters);
  const displayRows = analyticRows;
  const kpis = useMemo(() => {
    if (optimized?.metrics && !dataFiltersAreActive) return calculateKpisFromMetrics(optimized.metrics);
    return calculateKpis(displayRows);
  }, [displayRows, dataFiltersAreActive, optimized]);
  const estratoDistribution = useMemo(
    () =>
      optimized?.distributions?.estrato && !dataFiltersAreActive
        ? optimized.distributions.estrato
        : topCategories(displayRows, "estrato", 6),
    [displayRows, dataFiltersAreActive, optimized],
  );
  const areaDistribution = useMemo(
    () =>
      optimized?.distributions?.zonaBarrio && !dataFiltersAreActive
        ? optimized.distributions.zonaBarrio
        : topCategories(displayRows, "zonaBarrio", 5),
    [displayRows, dataFiltersAreActive, optimized],
  );
  const qualityStats = useMemo(() => {
    if (dataFiltersAreActive) {
      const filteredQuality = splitQuality(displayRows);
      return {
        issues: filteredQuality.issues,
        validRows: filteredQuality.validGeoRows.length,
        totalRows: displayRows.length,
      };
    }
    if (optimized?.metrics) {
      return {
        issues: {
          sinCoordenadas: optimized.metrics.sinCoordenadas || 0,
          fueraColombia: optimized.metrics.fueraColombia || 0,
          consumoInvalido: optimized.metrics.consumoInvalido || 0,
          diuFiuNulos: optimized.metrics.diuFiuNulos || 0,
          estratoInvalido: optimized.metrics.estratoInvalido || 0,
        },
        validRows: optimized.metrics.validGeoRows || displayRows.length,
        totalRows: optimized.metrics.totalRows || rows.length,
      };
    }
    const baseQuality = splitQuality(displayRows);
    return {
      issues: baseQuality.issues,
      validRows: baseQuality.validGeoRows.length,
      totalRows: displayRows.length,
    };
  }, [dataFiltersAreActive, displayRows, optimized, rows.length]);
  const maxConsumption = useMemo(() => Math.max(...displayRows.map((row) => row.consumo || 0), 1), [displayRows]);
  const maxMora = useMemo(() => Math.max(...displayRows.map((row) => row.diasMora || 0), 1), [displayRows]);
  const zonaEspecialCount = useMemo(
    () => displayRows.filter((row) => row.enZonaEspecial).length,
    [displayRows],
  );

  /*
   * Fallback CSV path stays available for endpoint experiments, but the default
   * view uses the optimized JSON generated from the SQL output columns.
   */
  const resetFilters = () => {
    setFilters({ ...INITIAL_FILTERS });
    setResetVersion((version) => version + 1);
  };
  const mapClusterCount = useMemo(() => buildMapClusters(displayRows).length, [displayRows]);
  const mapKey = `${resetVersion}-${Object.values(filters).join("|")}`;

  return (
    <main className="dashboard">
      <header className="hero-header">
        <div className="hero-brand">
          <img className="entity-logo" src={superserviciosLogoUrl} alt="Superservicios" />
          <div>
            <span className="eyebrow">Observatorio de Energía del Caribe</span>
            <h1>Visión territorial de suscriptores y hogares de energía</h1>
            <p>
              Seguimiento geográfico de suscriptores/hogares, consumo, mora, calidad del servicio, zonas especiales y
              pérdidas de energía.
            </p>
          </div>
        </div>
        <div className="hero-actions">
          <div className="observatorio-badge">
            <img className="observatorio-logo" src={observatorioLogoUrl} alt="Observatorio Superservicios" />
          </div>
        </div>
      </header>

      {error ? <div className="alert">{error}</div> : null}
      {optimized ? (
        <section className="source-banner">
          <div>
            <span>Cobertura analizada</span>
            <strong>{dataFiltersAreActive ? "Selección filtrada" : "Región Caribe colombiana"}</strong>
          </div>
          <article>
            <strong>{formatNumber(dataFiltersAreActive ? displayRows.length : optimized.metrics.validGeoRows)}</strong>
            <span>{dataFiltersAreActive ? "suscriptores/hogares en la selección" : "suscriptores/hogares con ubicación válida"}</span>
          </article>
          <article>
            <strong>{formatNumber(dataFiltersAreActive ? zonaEspecialCount : optimized.metrics.zonaEspecial)}</strong>
            <span>{dataFiltersAreActive ? "en zona especial (selección)" : "suscriptores/hogares en zona especial"}</span>
          </article>
          <article>
            <strong>{formatNumber(displayRows.length)}</strong>
            <span>suscriptores/hogares visibles en mapa y gráficos</span>
          </article>
        </section>
      ) : null}
      <DataValidationPanel optimized={optimized} />

      <ActiveFiltersBar
        entries={activeFilterEntries}
        filteredCount={displayRows.length}
        totalCount={dataFiltersAreActive ? filteredRows.length : optimized?.metrics?.validGeoRows || validGeoRows.length}
        fullDatasetCount={fullDatasetFilterCount}
      />
      <KpiCards kpis={kpis} filtered={dataFiltersAreActive} fullDatasetCount={fullDatasetFilterCount} />

      <div className="layout-grid">
        <FiltersPanel
          key={`filters-${resetVersion}`}
          filters={filters}
          options={options}
          municipioOptions={municipioOptions}
          onChange={handleFiltersChange}
          onReset={resetFilters}
        />
        <MapView
          key={`map-${mapKey}`}
          rows={displayRows}
          analyticLayer={filters.capaAnalitica}
          visualMode={filters.visualMode}
          maxConsumption={maxConsumption}
          maxMora={maxMora}
        />
      </div>

      <ScatterChart
        rows={displayRows}
        visualMode={filters.visualMode}
        analyticLayer={filters.capaAnalitica}
        maxConsumption={maxConsumption}
        maxMora={maxMora}
      />

      <MapInsightsPanel rows={displayRows} visualMode={filters.visualMode} filtered={dataFiltersAreActive} />
      <ControlPanel rows={displayRows} />

      <div className="bottom-grid">
        <Legend
          renderedCount={mapClusterCount}
          totalCount={displayRows.length}
          layerLabel={CAPA_LABELS[filters.capaAnalitica] || filters.capaAnalitica}
          visualMode={filters.visualMode}
        />
        <QualityPanel
          issues={qualityStats.issues}
          totalRows={qualityStats.totalRows}
          validRows={qualityStats.validRows}
        />
      </div>

      <div className="insights-grid">
        <DistributionPanel title="Análisis por estrato" data={estratoDistribution} />
        <DistributionPanel title="Análisis por zona especial FOES" data={areaDistribution} />
        <TerritoryInfoPanel rows={displayRows} optimized={optimized} useFilteredData={dataFiltersAreActive} />
        <DataTable rows={displayRows} />
      </div>

      <footer className="site-footer">
        <div className="site-footer__media" aria-hidden="true">
          <img src="/guia-rostros.png" alt="" loading="lazy" />
        </div>
        <div className="site-footer__credits">
          <p>
            <span>Desarrollo:</span> Victor Hugo Cortes
          </p>
          <p>
            <span>Revisó:</span> Luis Javier Mosquera y Diego Andres Mateus
          </p>
        </div>
        <img
          className="site-footer__logo"
          src={observatorioLogoUrl}
          alt="Observatorio Superservicios"
          loading="lazy"
        />
      </footer>
    </main>
  );
}
