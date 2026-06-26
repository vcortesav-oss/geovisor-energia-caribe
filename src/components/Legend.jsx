import { PALETTE, SERVICE_COLORS, analyticLayerColor, colorForZone } from "../utils/colorScales";
import { ANALYTIC_LAYER_OPTIONS } from "../utils/labels";

const zoneSamples = ["Sin zona especial", "Barrio subnormal", "Área rural de menor desarrollo", "Zona de difícil gestión"];

const numericLegend = [
  ["Bajo", PALETTE.green],
  ["Medio", PALETTE.yellow],
  ["Alto", PALETTE.amber],
  ["Muy alto", PALETTE.orange],
];

const modeTitles = {
  general: "Vista general",
  zona: "Color por zona especial",
  consumo: "Color por nivel de consumo",
  mora: "Color por días de mora",
  perdida: "Color por pérdida de energía",
};

export default function Legend({ renderedCount, totalCount, layerLabel, visualMode }) {
  const showZones = visualMode === "zona";
  const showGeneral = visualMode === "general";
  const analyticLayers = ANALYTIC_LAYER_OPTIONS.filter((layer) => layer.value !== "todos");

  return (
    <aside className="card legend-card">
      <div className="card-header">
        <h2>Leyendas</h2>
      </div>

      <div className="legend-section">
        <h3>{modeTitles[visualMode]}</h3>
        <div className="legend-items">
          {showGeneral ? (
            <span className="legend-item">
              <i style={{ background: PALETTE.cyanBlue }} />
              Visualización neutra/general
            </span>
          ) : showZones ? (
            zoneSamples.map((zone) => (
                <span className="legend-item" key={zone}>
                  <i style={{ background: zone === "Sin zona especial" ? PALETTE.cyanBlue : colorForZone(zone) }} />
                  {zone}
                </span>
              ))
          ) : (
            numericLegend.map(([label, color]) => (
                <span className="legend-item" key={label}>
                  <i style={{ background: color }} />
                  {label}
                </span>
              ))
          )}
        </div>
      </div>

      <div className="legend-section">
        <h3>Tamaño del clúster por concentración</h3>
        <div className="size-legend">
          <span className="dot small" />
          <span className="dot medium" />
          <span className="dot large" />
          <span>Baja · media · alta concentración</span>
        </div>
      </div>

      <div className="legend-section">
        <h3>Opacidad por días de mora</h3>
        <div className="gradient-bar">
          {SERVICE_COLORS.map((color) => (
            <span key={color} style={{ background: color }} />
          ))}
        </div>
        <div className="legend-scale">
          <span>Sin mora</span>
          <span>Mora alta</span>
        </div>
      </div>

      <div className="legend-section">
        <h3>Capas analíticas</h3>
        <div className="legend-items">
          {analyticLayers.map((layer) => (
            <span className="legend-item" key={layer.value}>
              <i style={{ background: analyticLayerColor(layer.value) }} />
              {layer.label}
            </span>
          ))}
        </div>
      </div>

      <p className="map-note">
        Capa activa: <strong>{layerLabel}</strong>. Mostrando {renderedCount.toLocaleString("es-CO")} clústeres de{" "}
        {totalCount.toLocaleString("es-CO")} suscriptores/hogares filtrados.
      </p>
    </aside>
  );
}
