import { DIU_LABEL, FIU_LABEL } from "../utils/labels";
import { formatNumber, formatPercent } from "../utils/colorScales";

function Metric({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export default function ClusterPopup({ cluster, visualMode }) {
  const modeLabels = {
    zona: "Zona especial FOES",
    consumo: "Consumo",
    mora: "Mora",
    perdida: "Pérdida de energía",
  };

  return (
    <div className="map-zone-popup">
      <h3 className="map-zone-popup__title">
        {cluster.municipio} · {formatNumber(cluster.count)} suscriptores/hogares
      </h3>
      <div className="map-zone-popup__body">
        <p className="map-zone-popup__meta">
          {cluster.departamento} · {formatNumber(cluster.lat, 4)}, {formatNumber(cluster.lng, 4)}
        </p>
        <dl className="map-zone-popup__metrics">
          <Metric label="Suscriptores/hogares" value={formatNumber(cluster.count)} />
          <Metric label="Estrato predominante" value={cluster.estratoPredominante} />
          <Metric label="Distribución por estrato" value={cluster.estratoDistribucion} />
          <Metric label="Departamento" value={cluster.departamento} />
          <Metric label="Municipio" value={cluster.municipio} />
          <Metric
            label="Coordenadas promedio"
            value={`${formatNumber(cluster.lat, 4)}, ${formatNumber(cluster.lng, 4)}`}
          />
          <Metric label="Consumo promedio (kWh/mes)" value={formatNumber(cluster.consumoPromedio, 1)} />
          <Metric label="Consumo total (kWh/mes)" value={formatNumber(cluster.consumoTotal, 0)} />
          <Metric
            label="Mora promedio (días)"
            value={cluster.moraPromedio != null ? formatNumber(cluster.moraPromedio, 1) : "-"}
          />
          <Metric
            label="Hogares en mora"
            value={`${formatNumber(cluster.hogaresEnMora)} (${formatNumber(cluster.pctEnMora, 1)}%)`}
          />
          <Metric
            label={DIU_LABEL}
            value={cluster.diuPromedio != null ? formatNumber(cluster.diuPromedio, 2) : "-"}
          />
          <Metric
            label={FIU_LABEL}
            value={cluster.fiuPromedio != null ? formatNumber(cluster.fiuPromedio, 2) : "-"}
          />
          <Metric label="Tipo de zona especial FOES" value={cluster.zonaEspecialPredominante} />
          <Metric
            label="Hogares en zona FOES"
            value={`${formatNumber(cluster.enZonaEspecial)} (${formatNumber(cluster.pctZonaEspecial, 1)}%)`}
          />
          <Metric
            label="Pérdida de energía (%)"
            value={cluster.perdidaPromedio != null ? formatPercent(cluster.perdidaPromedio) : "Sin reporte"}
          />
        </dl>
        <p className="map-zone-popup__note">Lectura del mapa: {modeLabels[visualMode]}</p>
      </div>
    </div>
  );
}
