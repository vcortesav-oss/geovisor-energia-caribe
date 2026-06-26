import { useEffect, useMemo, useRef, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
  ZoomControl,
} from "react-leaflet";
import L from "leaflet";
import ClusterPopup from "./ClusterPopup";
import {
  analyticLayerColor,
  colorByNumericLevel,
  colorForZone,
  formatNumber,
  opacityForMora,
  PALETTE,
} from "../utils/colorScales";
import { buildMapClusters, gridSizeForZoom, INDIVIDUAL_ZOOM, radiusForCluster } from "../utils/mapClusters";

const CARIBE_CENTER = [10.45, -74.9];
const CARIBE_ZOOM = 8;
const MAX_RENDERED_CLUSTERS = 4000;

function MapZoomTracker({ onZoomChange }) {
  const map = useMapEvents({
    zoomend: () => onZoomChange(map.getZoom()),
  });

  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);

  return null;
}

function fitMapToRows(map, rows) {
  if (!rows.length) {
    map.setView(CARIBE_CENTER, CARIBE_ZOOM);
    return;
  }

  const bounds = L.latLngBounds(rows.map((row) => [row.lat, row.lng]));
  if (!bounds.isValid()) return;

  map.fitBounds(bounds, {
    padding: [48, 48],
    maxZoom: rows.length <= 40 ? 13 : 11,
  });
}

function MapBounds({ rows }) {
  const map = useMap();

  useEffect(() => {
    fitMapToRows(map, rows);
    window.requestAnimationFrame(() => {
      map.invalidateSize();
    });
  }, [map, rows]);

  return null;
}

function MapInvalidateSize() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    if (!container) return undefined;

    const refresh = () => map.invalidateSize({ animate: false });

    refresh();
    const frameId = window.requestAnimationFrame(refresh);
    const timerId = window.setTimeout(refresh, 200);
    const lateTimerId = window.setTimeout(refresh, 600);

    window.addEventListener("resize", refresh);

    const shell = container.closest(".map-shell");
    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            refresh();
          })
        : null;

    if (resizeObserver && shell) {
      resizeObserver.observe(shell);
    }

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timerId);
      window.clearTimeout(lateTimerId);
      window.removeEventListener("resize", refresh);
      resizeObserver?.disconnect();
    };
  }, [map]);

  return null;
}

const CENTER_MAP_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="1.8" />
    <path d="M12 5v3.5M12 15.5V19M5 12h3.5M15.5 12H19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </svg>
`;

function MapCenterControl({ rows }) {
  const map = useMap();
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  useEffect(() => {
    let button = null;
    let cancelled = false;
    let retryTimer = null;

    const handleClick = (event) => {
      L.DomEvent.stopPropagation(event);
      L.DomEvent.preventDefault(event);
      fitMapToRows(map, rowsRef.current);
    };

    const attach = () => {
      if (cancelled) return;

      const bar = map.getContainer()?.querySelector(".leaflet-control-zoom.leaflet-bar");
      if (!bar) {
        retryTimer = window.setTimeout(attach, 100);
        return;
      }

      button = bar.querySelector(".leaflet-control-center-map");
      if (!button) {
        button = L.DomUtil.create("a", "leaflet-control-center-map", bar);
        button.href = "#";
        button.title = "Centrar mapa en la selección";
        button.setAttribute("role", "button");
        button.setAttribute("aria-label", "Centrar mapa en la selección");
        button.innerHTML = CENTER_MAP_ICON;
        L.DomEvent.disableClickPropagation(button);
      }

      L.DomEvent.off(button);
      L.DomEvent.on(button, "click", handleClick);
    };

    attach();

    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      if (button) {
        L.DomEvent.off(button);
        button.remove();
      }
    };
  }, [map]);

  return null;
}

function clusterCountLine(cluster) {
  if (!cluster.hasSubscriberField) {
    return <span>{formatNumber(cluster.registros)} registros georreferenciados agrupados</span>;
  }

  return (
    <span>
      {formatNumber(cluster.subscribers)} suscriptores/hogares · {formatNumber(cluster.registros)} registros agrupados
    </span>
  );
}

function clusterTooltipContent(cluster, visualMode) {
  if (visualMode === "consumo") {
    return (
      <>
        <strong>{formatNumber(cluster.consumoPromedio, 1)} kWh/mes prom.</strong>
        {clusterCountLine(cluster)}
      </>
    );
  }
  if (visualMode === "mora") {
    return (
      <>
        <strong>{formatNumber(cluster.moraPromedio, 0)} días mora prom.</strong>
        {clusterCountLine(cluster)}
      </>
    );
  }
  if (visualMode === "perdida") {
    return (
      <>
        <strong>
          {cluster.perdidaPromedio != null
            ? `${formatNumber(cluster.perdidaPromedio, 2)}% pérdida prom.`
            : "Sin reporte de pérdida"}
        </strong>
        {clusterCountLine(cluster)}
      </>
    );
  }
  return (
    <>
      <strong>{formatNumber(cluster.registros)} registros georreferenciados</strong>
      <span>{cluster.municipio} · {formatNumber(cluster.registros)} registros agrupados</span>
    </>
  );
}

export default function MapView({ rows, analyticLayer, visualMode, maxConsumption, maxMora, baseFilteredTotal }) {
  const [zoom, setZoom] = useState(CARIBE_ZOOM);

  // El clustering depende del zoom: vista general agrega más, zoom alto = puntos casi individuales.
  const clusters = useMemo(() => buildMapClusters(rows, gridSizeForZoom(zoom)), [rows, zoom]);
  const isDetail = zoom >= INDIVIDUAL_ZOOM;

  // En vista general, evitar clústeres de 1 suscriptor/hogar (ruido visual).
  const renderClusters = useMemo(() => {
    const list = isDetail ? clusters : clusters.filter((cluster) => cluster.subscribers > 1);
    const base = list.length ? list : clusters;
    if (base.length <= MAX_RENDERED_CLUSTERS) return base;
    return [...base].sort((a, b) => b.subscribers - a.subscribers).slice(0, MAX_RENDERED_CLUSTERS);
  }, [clusters, isDetail]);

  const maxClusterCount = useMemo(
    () => Math.max(...renderClusters.map((cluster) => cluster.subscribers), 1),
    [renderClusters],
  );
  const isAnalytic = analyticLayer !== "todos";
  const analyticColor = analyticLayerColor(analyticLayer);
  const maxPerdida = Math.max(...rows.map((row) => row.perdidaEnergia || 0), 1);

  const colorForCluster = (cluster) => {
    if (isAnalytic) return analyticColor;
    if (visualMode === "consumo") return colorByNumericLevel(cluster.consumoPromedio, maxConsumption);
    if (visualMode === "mora") return colorByNumericLevel(cluster.moraPromedio, maxMora);
    if (visualMode === "perdida") return colorByNumericLevel(cluster.perdidaPromedio, maxPerdida);
    if (visualMode === "zona") return colorForZone(cluster.zonaBarrio);
    return PALETTE.cyanBlue;
  };

  return (
    <section className="card map-card">
      <div className="card-header">
        <h2>Mapa de concentración de suscriptores/hogares</h2>
        <span>
          {formatNumber(rows.length)} registros georreferenciados · {formatNumber(baseFilteredTotal)}{" "}
          suscriptores/hogares en base filtrada
        </span>
      </div>

      <div className="map-shell">
        <MapContainer
          center={CARIBE_CENTER}
          zoom={CARIBE_ZOOM}
          scrollWheelZoom
          zoomControl={false}
          className="map-view"
        >
          <ZoomControl position="topleft" />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapInvalidateSize />
          <MapZoomTracker onZoomChange={setZoom} />
          <MapBounds rows={rows} />
          {renderClusters.map((cluster) => {
            const fillColor = colorForCluster(cluster);
            return (
              <CircleMarker
                key={cluster.id}
                center={[cluster.lat, cluster.lng]}
                radius={isDetail ? 6 : radiusForCluster(cluster.subscribers, maxClusterCount)}
                pathOptions={{
                  color: fillColor,
                  fillColor,
                  fillOpacity: Math.min(0.78, opacityForMora(cluster.moraPromedio, maxMora)),
                  opacity: 0.6,
                  weight: 0.8,
                }}
              >
                <Tooltip direction="top" offset={[0, -4]} opacity={0.96} className="map-hover-tip">
                  {clusterTooltipContent(cluster, visualMode)}
                </Tooltip>
                <Popup className="map-zone-popup-wrapper" closeButton minWidth={300} maxWidth={360}>
                  <ClusterPopup cluster={cluster} visualMode={visualMode} isDetail={isDetail} />
                </Popup>
              </CircleMarker>
            );
          })}
          <MapCenterControl rows={rows} />
        </MapContainer>
      </div>
    </section>
  );
}

export { buildMapClusters };
