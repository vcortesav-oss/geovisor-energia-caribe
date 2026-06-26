import { formatNumber, formatPercent } from "../utils/colorScales";
import { DIU_LABEL, FIU_LABEL } from "../utils/labels";

const cards = [
  {
    key: "totalUsuarios",
    label: "Suscriptores/hogares registrados en la base",
    unit: "suscriptores/hogares en la base",
    format: (value) => formatNumber(value),
  },
  {
    key: "consumoPromedio",
    label: "Consumo promedio",
    unit: "kWh/mes",
    format: (value) => formatNumber(value, 1),
  },
  {
    key: "usuariosZonaEspecial",
    label: "Suscriptores/hogares en zona especial",
    unit: "hogares",
    format: (value) => formatNumber(value),
  },
  {
    key: "promedioDiu",
    label: `Promedio ${DIU_LABEL}`,
    unit: "horas/suscriptor/año",
    format: (value) => formatNumber(value, 2),
  },
  {
    key: "promedioFiu",
    label: `Promedio ${FIU_LABEL}`,
    unit: "interrupciones/suscriptor/año",
    format: (value) => formatNumber(value, 2),
  },
  {
    key: "porcentajeUsuariosEnMora",
    label: "Porcentaje de hogares en mora",
    unit: "%",
    format: (value) => (value == null || !Number.isFinite(value) ? "-" : formatNumber(value, 1)),
    detailKey: "promedioDiasMoraEnMora",
    detailFormat: (value) =>
      value == null || !Number.isFinite(value)
        ? ""
        : `${formatNumber(value, 1)} días promedio entre hogares en mora`,
  },
  {
    key: "promedioPerdida",
    label: "Promedio pérdida regional",
    unit: "porcentaje",
    format: formatPercent,
  },
];

export default function KpiCards({ kpis, filtered, fullDatasetCount, visualizedCount }) {
  // Valor principal del total: base filtrada dinámica (total general o por filtro).
  // Si no hay conteo de base completa disponible, se usa el total calculado.
  const baseTotal =
    filtered && fullDatasetCount != null && fullDatasetCount > 0 ? fullDatasetCount : kpis?.totalUsuarios;

  const cardValue = (card) => (card.key === "totalUsuarios" ? card.format(baseTotal) : card.format(kpis?.[card.key]));

  return (
    <section className="kpi-section">
      <div className="card-header kpi-section__header">
        <h2>Indicadores de continuidad del servicio</h2>
      </div>
      <p className="kpi-context">
        Los indicadores se calculan con base en los registros disponibles según los filtros aplicados. El mapa solo
        visualiza registros georreferenciados agrupados territorialmente; no corresponde a población oficial DANE.
      </p>
      <div className="kpi-grid" aria-label="Indicadores principales">
        {cards.map((card) => (
          <article className="kpi-card" key={card.key}>
            <span>{card.label}</span>
            <strong>{cardValue(card)}</strong>
            {card.key === "totalUsuarios" ? (
              <small className="kpi-detail">
                Georreferenciados/visualizados en el mapa: {formatNumber(visualizedCount)}
              </small>
            ) : null}
            {card.key === "totalUsuarios" ? (
              <small className="kpi-detail kpi-detail--note">
                Total dinámico de la base filtrada; los registros del mapa son los georreferenciados agrupados, no
                población oficial DANE.
              </small>
            ) : null}
            {card.detailKey && card.detailFormat(kpis?.[card.detailKey]) ? (
              <small className="kpi-detail">{card.detailFormat(kpis?.[card.detailKey])}</small>
            ) : null}
            <em className="kpi-unit">{card.unit}</em>
          </article>
        ))}
      </div>
    </section>
  );
}
