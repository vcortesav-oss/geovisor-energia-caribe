import { DIU_LABEL, FIU_LABEL } from "../utils/labels";
import { anonymizeNiu } from "../utils/dataCleaning";
import { formatNumber, formatPercent } from "../utils/colorScales";

const modeLabels = {
  zona: "Zona especial",
  consumo: "Consumo",
  mora: "Mora",
  perdida: "Pérdida de energía",
};

function Metric({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function UserZonePopup({ row, visualMode }) {
  return (
    <div className="map-zone-popup">
      <h3 className="map-zone-popup__title">{row.sectorControl || row.municipio}</h3>
      <div className="map-zone-popup__body">
        <p className="map-zone-popup__meta">
          NIU {anonymizeNiu(row.niu)} · {row.comercializador}
        </p>
        <dl className="map-zone-popup__metrics">
          <Metric label="Departamento" value={row.departamento} />
          <Metric label="Municipio" value={row.municipio} />
          <Metric label="Consumo (kWh/mes)" value={formatNumber(row.consumo, 1)} />
          <Metric label="Estrato" value={row.estrato} />
          <Metric label="Mora (días)" value={formatNumber(row.diasMora, 0)} />
          <Metric label={DIU_LABEL} value={formatNumber(row.diu, 2)} />
          <Metric label={FIU_LABEL} value={formatNumber(row.fiu, 2)} />
          <Metric label="Tipo de zona especial (FOES)" value={row.zonaBarrio} />
          <Metric
            label="Pérdida de energía (%)"
            value={row.perdidaEnergia != null ? formatPercent(row.perdidaEnergia) : "Sin reporte"}
          />
        </dl>
        <p className="map-zone-popup__note">Lectura del mapa: {modeLabels[visualMode]}</p>
      </div>
    </div>
  );
}
