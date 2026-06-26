import { INITIAL_FILTERS, TIPO_SERVICIO_OPTIONS, ANALYTIC_LAYER_OPTIONS } from "../utils/dataCleaning";

const visualModes = [
  { value: "general", label: "Vista general" },
  { value: "zona", label: "Color por zona especial" },
  { value: "consumo", label: "Color por consumo" },
  { value: "mora", label: "Color por mora" },
  { value: "perdida", label: "Color por pérdida" },
];

function SelectField({ label, value, options, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="Todos">Todos</option>
        {(options || []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function FiltersPanel({ filters, options, municipioOptions, onChange, onReset }) {
  const setFilter = (key, value) => onChange({ ...filters, [key]: value });
  const activeCount = Object.entries(filters).filter(
    ([key, value]) => key !== "visualMode" && key !== "capaAnalitica" && value !== INITIAL_FILTERS[key],
  ).length;
  const handleReset = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onReset();
  };

  return (
    <aside className="card filters-card">
      <div className="card-header">
        <h2>Filtros territoriales</h2>
        <button type="button" onClick={handleReset}>
          Limpiar {activeCount ? `(${activeCount})` : ""}
        </button>
      </div>

      <div className="filters-grid">
        <SelectField
          label="Empresa comercializadora"
          value={filters.comercializador}
          options={options.comercializadores}
          onChange={(value) => setFilter("comercializador", value)}
        />
        <SelectField
          label="Mercado"
          value={filters.mercado}
          options={options.mercados}
          onChange={(value) => setFilter("mercado", value)}
        />
        <SelectField
          label="Departamento"
          value={filters.departamento}
          options={options.departamentos}
          onChange={(value) => setFilter("departamento", value)}
        />
        <SelectField
          label="Municipio"
          value={filters.municipio}
          options={municipioOptions || options.municipios}
          onChange={(value) => setFilter("municipio", value)}
        />
        <SelectField
          label="Sector / barrio operativo"
          value={filters.sectorControl}
          options={options.sectoresControl}
          onChange={(value) => setFilter("sectorControl", value)}
        />
        <SelectField
          label="Tipo de zona especial (FOES)"
          value={filters.zonaBarrio}
          options={options.zonasBarrios}
          onChange={(value) => setFilter("zonaBarrio", value)}
        />
        <SelectField
          label="Tipo de servicio"
          value={filters.tipoServicio}
          options={TIPO_SERVICIO_OPTIONS}
          onChange={(value) => setFilter("tipoServicio", value)}
        />
        <SelectField
          label="Estrato"
          value={filters.estrato}
          options={options.estratos}
          onChange={(value) => setFilter("estrato", value)}
        />
        <SelectField
          label="Condición especial del servicio"
          value={filters.condicionEspecial}
          options={options.condicionesEspeciales}
          onChange={(value) => setFilter("condicionEspecial", value)}
        />
        <label className="field field-highlight">
          <span>Lectura del mapa</span>
          <select value={filters.visualMode} onChange={(event) => setFilter("visualMode", event.target.value)}>
            {visualModes.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Capa analítica</span>
          <select value={filters.capaAnalitica} onChange={(event) => setFilter("capaAnalitica", event.target.value)}>
            {ANALYTIC_LAYER_OPTIONS.map((layer) => (
              <option key={layer.value} value={layer.value}>
                {layer.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </aside>
  );
}
