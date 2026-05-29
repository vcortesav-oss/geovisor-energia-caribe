import { formatNumber, formatPercent } from "../utils/colorScales";
import { DIU_LABEL, FIU_LABEL } from "../utils/labels";

const cards = [
  {
    key: "totalUsuarios",
    label: "Suscriptores/hogares registrados en la base",
    unit: "registros filtrados",
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

export default function KpiCards({ kpis, filtered, fullDatasetCount }) {
  return (
    <section className="kpi-section">
      <div className="card-header kpi-section__header">
        <h2>Indicadores de continuidad del servicio</h2>
      </div>
      {filtered ? (
        <p className="kpi-context">
          Indicadores calculados solo con los registros filtrados de la base del visor (
          {formatNumber(kpis?.totalUsuarios)} registros). La base completa puede tener más registros con los mismos
          filtros; no corresponde a población oficial DANE.
        </p>
      ) : null}
      <div className="kpi-grid" aria-label="Indicadores principales">
        {cards.map((card) => (
          <article className="kpi-card" key={card.key}>
            <span>{card.label}</span>
            <strong>{card.format(kpis?.[card.key])}</strong>
            {card.key === "totalUsuarios" && filtered && fullDatasetCount != null && fullDatasetCount > 0 ? (
              <small className="kpi-detail">Base completa: {formatNumber(fullDatasetCount)} suscriptores/hogares</small>
            ) : null}
            {card.key === "totalUsuarios" ? (
              <small className="kpi-detail kpi-detail--note">
                Dato calculado sobre registros disponibles en la base filtrada, no sobre población total DANE.
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
