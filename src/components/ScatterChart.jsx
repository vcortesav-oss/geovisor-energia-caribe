import { useMemo, useState } from "react";
import {
  analyticLayerColor,
  colorByNumericLevel,
  colorForZone,
  formatNumber,
  PALETTE,
} from "../utils/colorScales";
import { DIU_LABEL, FIU_LABEL } from "../utils/labels";
import { anonymizeNiu } from "../utils/dataCleaning";

const MAX_SCATTER_POINTS = 3000;
const OUTLIER_PERCENTILE = 0.99;
const CHART = { width: 820, height: 430, pad: { top: 40, right: 34, bottom: 92, left: 108 } };

const PRESETS = [
  {
    id: "consumo-mora",
    label: "Consumo vs mora",
    xKey: "consumo",
    yKey: "diasMora",
    xLabel: "Consumo (kWh/mes)",
    yLabel: "Mora (días)",
  },
  {
    id: "consumo-perdida",
    label: "Consumo vs pérdida",
    xKey: "consumo",
    yKey: "perdidaEnergia",
    xLabel: "Consumo (kWh/mes)",
    yLabel: "Pérdida de energía (%)",
  },
  {
    id: "diu-fiu",
    label: `${DIU_LABEL} vs ${FIU_LABEL}`,
    xKey: "diu",
    yKey: "fiu",
    xLabel: DIU_LABEL,
    yLabel: FIU_LABEL,
  },
  {
    id: "consumo-interrupcion",
    label: "Consumo vs interrupción",
    xKey: "consumo",
    yKey: "interrupcion",
    xLabel: "Consumo (kWh/mes)",
    yLabel: "DIU + FIU (horas + interrupciones)",
  },
  {
    id: "consumo-estrato",
    label: "Consumo vs estrato",
    xKey: "estrato",
    yKey: "consumo",
    xType: "category",
    xLabel: "Estrato",
    yLabel: "Consumo (kWh/mes)",
    colorBy: "foes",
  },
  {
    id: "consumo-zona",
    label: "Consumo vs zonas especiales",
    xKey: "zonaBarrio",
    yKey: "consumo",
    xType: "category",
    xLabel: "Tipo de zona especial (FOES)",
    yLabel: "Consumo (kWh/mes)",
    colorBy: "consumo",
  },
];

const DEFAULT_PRESET_BY_MODE = {
  general: "consumo-estrato",
  zona: "consumo-estrato",
  consumo: "consumo-mora",
  mora: "consumo-mora",
  perdida: "consumo-perdida",
};

function sampleRows(rows, limit) {
  if (rows.length <= limit) return rows;
  const step = rows.length / limit;
  const out = [];
  for (let i = 0; i < limit; i += 1) {
    out.push(rows[Math.floor(i * step)]);
  }
  return out;
}

function readValue(row, key) {
  if (key === "interrupcion") return (row.diu || 0) + (row.fiu || 0);
  if (key === "estrato") return row.estrato || "Sin dato";
  if (key === "zonaBarrio") return row.zonaBarrio || row.tipoAreaEspecial || "Sin zona especial";
  return row[key];
}

function computeDomain(rows, key) {
  const values = rows
    .map((row) => readValue(row, key))
    .filter((value) => value != null && Number.isFinite(value));
  if (!values.length) return [0, 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || Math.max(Math.abs(max), 1);
  return [Math.max(0, min - span * 0.06), max + span * 0.06];
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1));
  return sorted[index];
}

function computeVisualDomain(rows, key) {
  const values = rows
    .map((row) => readValue(row, key))
    .filter((value) => value != null && Number.isFinite(value));
  if (!values.length) return { domain: [0, 1], adjusted: false, cap: null, actualMax: null };

  const rawDomain = computeDomain(rows, key);
  if (key !== "consumo") {
    return { domain: rawDomain, adjusted: false, cap: null, actualMax: rawDomain[1] };
  }

  const cap = percentile(values, OUTLIER_PERCENTILE);
  const actualMax = Math.max(...values);
  if (!cap || actualMax <= cap * 1.15) {
    return { domain: rawDomain, adjusted: false, cap: null, actualMax };
  }

  return {
    domain: [0, cap * 1.08],
    adjusted: true,
    cap,
    actualMax,
  };
}

function computeCategories(rows, key, limit = 10) {
  const counts = {};
  for (const row of rows) {
    const value = readValue(row, key);
    counts[value] = (counts[value] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => {
      const na = Number.parseInt(a[0], 10);
      const nb = Number.parseInt(b[0], 10);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return b[1] - a[1];
    })
    .slice(0, limit)
    .map(([label]) => label);
}

function scale(value, domain, rangeMin, rangeMax) {
  const [min, max] = domain;
  if (value == null || !Number.isFinite(value)) return null;
  if (max === min) return (rangeMin + rangeMax) / 2;
  return rangeMin + ((value - min) / (max - min)) * (rangeMax - rangeMin);
}

function scaleClamped(value, domain, rangeMin, rangeMax) {
  if (value == null || !Number.isFinite(value)) return null;
  const [min, max] = domain;
  return scale(Math.min(Math.max(value, min), max), domain, rangeMin, rangeMax);
}

function scaleCategory(value, categories, rangeMin, rangeMax, jitterSeed = 0) {
  const index = categories.indexOf(value);
  if (index < 0) return null;
  const bandWidth = (rangeMax - rangeMin) / Math.max(categories.length, 1);
  const center = rangeMin + bandWidth * (index + 0.5);
  const jitter = ((jitterSeed % 17) - 8) * (bandWidth * 0.08);
  return center + jitter;
}

function formatAxisTick(value, digits = 0) {
  if (!Number.isFinite(value)) return "";
  return formatNumber(value, digits);
}

function buildTicks(domain, count = 5) {
  const [min, max] = domain;
  if (max <= min) return [min];
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, index) => min + step * index);
}

export default function ScatterChart({
  rows,
  visualMode,
  analyticLayer,
  maxConsumption,
  maxMora,
}) {
  const [presetId, setPresetId] = useState(DEFAULT_PRESET_BY_MODE[visualMode] || "consumo-mora");
  const preset = PRESETS.find((item) => item.id === presetId) || PRESETS[0];
  const isCategory = preset.xType === "category";

  const plottedRows = useMemo(() => {
    const sampled = sampleRows(rows, MAX_SCATTER_POINTS);
    return sampled.filter((row) => {
      const x = readValue(row, preset.xKey);
      const y = readValue(row, preset.yKey);
      if (isCategory) return x != null && y != null && Number.isFinite(y);
      return x != null && y != null && Number.isFinite(x) && Number.isFinite(y);
    });
  }, [rows, preset, isCategory]);

  const categories = useMemo(
    () => (isCategory ? computeCategories(plottedRows, preset.xKey) : []),
    [plottedRows, preset.xKey, isCategory],
  );

  const xDomain = useMemo(
    () => (isCategory ? [0, Math.max(categories.length, 1)] : computeDomain(plottedRows, preset.xKey)),
    [plottedRows, preset.xKey, isCategory, categories.length],
  );
  const yStats = useMemo(() => computeVisualDomain(plottedRows, preset.yKey), [plottedRows, preset.yKey]);
  const yDomain = yStats.domain;
  const maxPerdida = useMemo(
    () => Math.max(...rows.map((row) => row.perdidaEnergia || 0), 1),
    [rows],
  );

  const plotWidth = CHART.width - CHART.pad.left - CHART.pad.right;
  const plotHeight = CHART.height - CHART.pad.top - CHART.pad.bottom;
  const xTicks = isCategory ? categories : buildTicks(xDomain, 5);
  const yTicks = buildTicks(yDomain, 5);
  const isAnalytic = analyticLayer !== "todos";
  const analyticColor = analyticLayerColor(analyticLayer);

  const colorForPoint = (row) => {
    if (preset.colorBy === "foes") return row.enZonaEspecial ? PALETTE.orange : PALETTE.blue;
    if (visualMode === "consumo" || preset.colorBy === "consumo") {
      return colorByNumericLevel(row.consumo, maxConsumption);
    }
    if (visualMode === "mora") return colorByNumericLevel(row.diasMora, maxMora);
    if (visualMode === "perdida") return colorByNumericLevel(row.perdidaEnergia, maxPerdida);
    if (isAnalytic) return analyticColor;
    if (visualMode === "general") return PALETTE.blue;
    if (visualMode === "zona") return colorForZone(row.zonaBarrio || row.tipoAreaEspecial || row.condicionEspecial);
    if (visualMode === "todos") return PALETTE.blue;
    return colorForZone(row.zonaBarrio || row.tipoAreaEspecial || row.condicionEspecial);
  };

  const legendTitle = (() => {
    if (preset.colorBy === "foes") return "Color por zona FOES";
    if (preset.colorBy === "consumo" || visualMode === "consumo") return "Color por consumo";
    if (visualMode === "mora") return "Color por mora";
    if (visualMode === "perdida") return "Color por pérdida";
    if (visualMode === "general" || visualMode === "todos") return "Coloración general";
    return "Color por zona especial";
  })();

  return (
    <section className="card scatter-card">
      <div className="card-header scatter-card__header">
        <div className="scatter-card__intro">
          <h2>Dispersión de consumo</h2>
          <p>Cada punto representa un suscriptor/hogar · sin promedios por grupo</p>
        </div>
        <label className="scatter-card__selector">
          <span>Variables</span>
          <select value={presetId} onChange={(event) => setPresetId(event.target.value)}>
            {PRESETS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="scatter-card__body">
        <svg
          className="scatter-chart"
          viewBox={`0 0 ${CHART.width} ${CHART.height}`}
          role="img"
          aria-label={`Gráfico de dispersión ${preset.label}`}
        >
          <rect
            x={CHART.pad.left}
            y={CHART.pad.top}
            width={plotWidth}
            height={plotHeight}
            fill="rgba(0, 139, 139, 0.04)"
            stroke="rgba(0, 139, 139, 0.18)"
            rx="8"
          />

          {yTicks.map((tick) => {
            const y = scale(tick, yDomain, CHART.pad.top + plotHeight, CHART.pad.top);
            return (
              <g key={`y-${tick}`}>
                <line
                  x1={CHART.pad.left}
                  y1={y}
                  x2={CHART.pad.left + plotWidth}
                  y2={y}
                  stroke="rgba(102, 112, 133, 0.18)"
                  strokeDasharray="4 4"
                />
                <text x={CHART.pad.left - 10} y={y + 4} textAnchor="end" className="scatter-axis-label">
                  {formatAxisTick(tick, tick < 10 ? 1 : 0)}
                </text>
              </g>
            );
          })}

          {isCategory
            ? categories.map((label, index) => {
                const x =
                  CHART.pad.left +
                  (plotWidth / Math.max(categories.length, 1)) * (index + 0.5);
                return (
                  <g key={`x-${label}`}>
                    <line
                      x1={x}
                      y1={CHART.pad.top}
                      x2={x}
                      y2={CHART.pad.top + plotHeight}
                      stroke="rgba(102, 112, 133, 0.12)"
                      strokeDasharray="3 5"
                    />
                    <text
                      x={x}
                      y={CHART.height - 48}
                      textAnchor="end"
                      transform={`rotate(-30 ${x} ${CHART.height - 48})`}
                      className="scatter-axis-label scatter-axis-label--category"
                    >
                      {label.length > 18 ? `${label.slice(0, 16)}…` : label}
                    </text>
                  </g>
                );
              })
            : xTicks.map((tick) => {
                const x = scale(tick, xDomain, CHART.pad.left, CHART.pad.left + plotWidth);
                return (
                  <text
                    key={`x-${tick}`}
                    x={x}
                    y={CHART.height - 54}
                    textAnchor="middle"
                    className="scatter-axis-label"
                  >
                    {formatAxisTick(tick, tick < 10 ? 1 : 0)}
                  </text>
                );
              })}

          <text
            x={CHART.pad.left + plotWidth / 2}
            y={CHART.height - 12}
            textAnchor="middle"
            className="scatter-axis-title"
          >
            {preset.xLabel}
          </text>
          <text
            transform={`rotate(-90 ${CHART.pad.left - 76} ${CHART.pad.top + plotHeight / 2})`}
            x={CHART.pad.left - 76}
            y={CHART.pad.top + plotHeight / 2}
            textAnchor="middle"
            className="scatter-axis-title"
          >
            {preset.yLabel}
          </text>

          {plottedRows.map((row) => {
            const xValue = readValue(row, preset.xKey);
            const yValue = readValue(row, preset.yKey);
            const x = isCategory
              ? scaleCategory(xValue, categories, CHART.pad.left, CHART.pad.left + plotWidth, row.id?.length || 0)
              : scale(xValue, xDomain, CHART.pad.left, CHART.pad.left + plotWidth);
            const isOutlier = yStats.adjusted && yValue > yDomain[1];
            const y = scaleClamped(yValue, yDomain, CHART.pad.top + plotHeight - 8, CHART.pad.top + 8);
            if (x == null || y == null) return null;
            const fill = colorForPoint(row);
            return (
              <circle
                key={row.id}
                cx={x}
                cy={y}
                r={isOutlier ? 3.5 : 3.8}
                fill={fill}
                fillOpacity={isOutlier ? 0.42 : 0.68}
                stroke={isOutlier ? "#111827" : fill}
                strokeOpacity={isOutlier ? 0.7 : 0.35}
                strokeWidth={isOutlier ? 1.4 : 1}
              >
                <title>
                  {row.municipio} · NIU {anonymizeNiu(row.niu)}
                  {"\n"}
                  {preset.xLabel}: {formatNumber(xValue, isCategory ? 0 : 1)}
                  {"\n"}
                  {preset.yLabel}: {formatNumber(yValue, preset.yKey === "diasMora" ? 0 : 2)}
                  {isOutlier ? "\nValor extremo mostrado en el borde superior para lectura visual." : ""}
                </title>
              </circle>
            );
          })}
        </svg>

        <aside className="scatter-card__meta">
          <p>
            Mostrando <strong>{formatNumber(plottedRows.length)}</strong> de{" "}
            <strong>{formatNumber(rows.length)}</strong> suscriptores/hogares filtrados.
          </p>
          <p>{legendTitle}. La leyenda no modifica datos ni filtros.</p>
          {yStats.adjusted ? (
            <p className="scatter-scale-note">
              La gráfica ajusta la escala al P99 para facilitar la lectura de valores extremos. Los outliers se muestran
              en el borde superior.
            </p>
          ) : null}
          {preset.colorBy === "foes" ? (
            <div className="scatter-legend">
              <span>
                <i style={{ background: PALETTE.blue }} /> Sin zona FOES
              </span>
              <span>
                <i style={{ background: PALETTE.orange }} /> Zona especial FOES
              </span>
            </div>
          ) : (
            <div className="scatter-legend">
              <span>
                <i style={{ background: PALETTE.green }} /> Bajo
              </span>
              <span>
                <i style={{ background: PALETTE.yellow }} /> Medio
              </span>
              <span>
                <i style={{ background: PALETTE.amber }} /> Alto
              </span>
              <span>
                <i style={{ background: PALETTE.orange }} /> Muy alto
              </span>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
