const DEFAULT_GRID_SIZE = 0.022;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function topCategory(counts) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] || "Sin dato";
}

function formatDistribution(counts, total, limit = 4) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => `${label}: ${count} (${Math.round((count / total) * 100)}%)`)
    .join(" · ");
}

/** Agrupa suscriptores/hogares en celdas geográficas para visualizar concentración territorial. */
export function buildMapClusters(rows, gridSize = DEFAULT_GRID_SIZE) {
  const buckets = new Map();

  for (const row of rows) {
    const latCell = Math.round(row.lat / gridSize);
    const lngCell = Math.round(row.lng / gridSize);
    const key = `${latCell}:${lngCell}`;

    let cluster = buckets.get(key);
    if (!cluster) {
      cluster = {
        id: key,
        count: 0,
        latSum: 0,
        lngSum: 0,
        consumoSum: 0,
        moraSum: 0,
        moraCount: 0,
        moraPositive: 0,
        diuSum: 0,
        fiuSum: 0,
        diuCount: 0,
        fiuCount: 0,
        perdidaSum: 0,
        perdidaCount: 0,
        estratoCounts: {},
        departamentoCounts: {},
        municipioCounts: {},
        zonaCounts: {},
        enZonaEspecial: 0,
      };
      buckets.set(key, cluster);
    }

    cluster.count += 1;
    cluster.latSum += row.lat;
    cluster.lngSum += row.lng;
    cluster.consumoSum += row.consumo || 0;

    if (row.diasMora != null && Number.isFinite(row.diasMora)) {
      cluster.moraSum += row.diasMora;
      cluster.moraCount += 1;
      if (row.diasMora > 0) cluster.moraPositive += 1;
    }
    if (row.diu != null && Number.isFinite(row.diu)) {
      cluster.diuSum += row.diu;
      cluster.diuCount += 1;
    }
    if (row.fiu != null && Number.isFinite(row.fiu)) {
      cluster.fiuSum += row.fiu;
      cluster.fiuCount += 1;
    }
    if (row.perdidaEnergia != null && Number.isFinite(row.perdidaEnergia)) {
      cluster.perdidaSum += row.perdidaEnergia;
      cluster.perdidaCount += 1;
    }

    const estrato = row.estrato || "Sin dato";
    cluster.estratoCounts[estrato] = (cluster.estratoCounts[estrato] || 0) + 1;

    const departamento = row.departamento || "Sin dato";
    cluster.departamentoCounts[departamento] = (cluster.departamentoCounts[departamento] || 0) + 1;

    const municipio = row.municipio || "Sin dato";
    cluster.municipioCounts[municipio] = (cluster.municipioCounts[municipio] || 0) + 1;

    const zona = row.zonaBarrio || row.tipoAreaEspecial || "Sin zona especial";
    cluster.zonaCounts[zona] = (cluster.zonaCounts[zona] || 0) + 1;

    if (row.enZonaEspecial) cluster.enZonaEspecial += 1;
  }

  return Array.from(buckets.values()).map((cluster) => {
    const count = cluster.count;
    const consumoPromedio = cluster.consumoSum / count;

    return {
      id: cluster.id,
      count,
      lat: cluster.latSum / count,
      lng: cluster.lngSum / count,
      consumoPromedio,
      consumoTotal: cluster.consumoSum,
      moraPromedio: cluster.moraCount ? cluster.moraSum / cluster.moraCount : null,
      hogaresEnMora: cluster.moraPositive,
      pctEnMora: count ? (cluster.moraPositive / count) * 100 : 0,
      diuPromedio: cluster.diuCount ? cluster.diuSum / cluster.diuCount : null,
      fiuPromedio: cluster.fiuCount ? cluster.fiuSum / cluster.fiuCount : null,
      perdidaPromedio: cluster.perdidaCount ? cluster.perdidaSum / cluster.perdidaCount : null,
      estratoPredominante: topCategory(cluster.estratoCounts),
      estratoDistribucion: formatDistribution(cluster.estratoCounts, count),
      departamento: topCategory(cluster.departamentoCounts),
      municipio: topCategory(cluster.municipioCounts),
      zonaEspecialPredominante: topCategory(cluster.zonaCounts),
      enZonaEspecial: cluster.enZonaEspecial,
      pctZonaEspecial: count ? (cluster.enZonaEspecial / count) * 100 : 0,
      consumo: consumoPromedio,
      diasMora: cluster.moraCount ? cluster.moraSum / cluster.moraCount : 0,
      perdidaEnergia: cluster.perdidaCount ? cluster.perdidaSum / cluster.perdidaCount : null,
      diu: cluster.diuCount ? cluster.diuSum / cluster.diuCount : null,
      fiu: cluster.fiuCount ? cluster.fiuSum / cluster.fiuCount : null,
      zonaBarrio: topCategory(cluster.zonaCounts),
    };
  });
}

export function radiusForCluster(count, maxCount) {
  const max = Math.max(maxCount, 1);
  const scaled = Math.sqrt(count / max);
  return clamp(8 + scaled * 22, 8, 30);
}
