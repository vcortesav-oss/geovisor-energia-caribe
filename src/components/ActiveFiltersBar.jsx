import { formatNumber } from "../utils/colorScales";

export default function ActiveFiltersBar({ entries, filteredCount, totalCount, fullDatasetCount }) {
  if (!entries.length) return null;

  const showSampleNote =
    fullDatasetCount != null && fullDatasetCount > 0 && fullDatasetCount > filteredCount * 1.15;

  return (
    <section className="active-filters-bar" aria-label="Filtros aplicados">
      <div className="active-filters-header">
        <strong>Filtros aplicados</strong>
        <span>
          {formatNumber(filteredCount)} de {formatNumber(totalCount)} suscriptores/hogares en la muestra del visor
        </span>
      </div>
      <div className="active-filters-chips">
        {entries.map((entry) => (
          <article className="active-filter-chip" key={`${entry.label}-${entry.value}`}>
            <span>{entry.label}</span>
            <strong>{entry.value}</strong>
          </article>
        ))}
      </div>
      {showSampleNote ? (
        <p className="active-filters-note">
          La base completa tiene {formatNumber(fullDatasetCount)} suscriptores/hogares con esta selección. En el mapa se
          agrupan {formatNumber(filteredCount)} en clústeres territoriales.
        </p>
      ) : null}
      {filteredCount === 0 && fullDatasetCount != null && fullDatasetCount > 0 ? (
        <p className="active-filters-note">
          La base completa registra {formatNumber(fullDatasetCount)} suscriptores/hogares con esta combinación. Recargue
          la página si no ve clústeres en el mapa.
        </p>
      ) : null}
      {filteredCount === 0 && (fullDatasetCount == null || fullDatasetCount === 0) ? (
        <p className="active-filters-note active-filters-note--empty">
          No hay suscriptores/hogares georreferenciados con esta combinación de filtros en la base analizada.
        </p>
      ) : null}
    </section>
  );
}
