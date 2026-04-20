import type { AttractionCatalogItem, ItineraryItem } from "../types";

const CATALOG_URL = "/data/attractions_scored.csv";
export const FALLBACK_ATTRACTION_IMAGE =
  "https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=900&q=80";

function parseCsvLine(line: string) {
  return line.split(",").map((value) => value.trim());
}

function toNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function imageUrlForAttraction(name: string, region: string) {
  const query = encodeURIComponent(`${name} ${region} Japan`);
  return `https://source.unsplash.com/900x600/?${query}`;
}

export async function loadAttractionCatalog() {
  const response = await fetch(CATALOG_URL);
  if (!response.ok) {
    throw new Error(`Failed to load attraction catalog: ${response.status}`);
  }

  const csv = await response.text();
  const [headerLine, ...lines] = csv.trim().split(/\r?\n/);
  const headers = parseCsvLine(headerLine);

  return lines
    .map((line): AttractionCatalogItem | null => {
      const values = parseCsvLine(line);
      const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
      if (!row.id || !row.name) {
        return null;
      }

      return {
        id: row.id,
        name: row.name,
        region: row.region,
        category: row.category,
        interestTags: row.interest_tags.split("|").filter(Boolean),
        stationAnchor: row.station_anchor,
        distanceToStationKm: toNumber(row.distance_to_station_km),
        interestMatch: toNumber(row.interest_match),
        baseScore: toNumber(row.xai_score),
      };
    })
    .filter((item): item is AttractionCatalogItem => item !== null);
}

export function catalogItemToItineraryItem(
  catalogItem: AttractionCatalogItem,
  order: number,
): ItineraryItem {
  return {
    id: `catalog-${catalogItem.id}`,
    placeName: catalogItem.name,
    region: catalogItem.region,
    baseScore: catalogItem.baseScore,
    xaiReason:
      `${catalogItem.category} · ${catalogItem.stationAnchor} ` +
      `${catalogItem.distanceToStationKm.toFixed(1)} km · ` +
      `interest ${catalogItem.interestMatch.toFixed(2)}`,
    imageUrl: imageUrlForAttraction(catalogItem.name, catalogItem.region),
    visitDurationMin: 75,
    order,
    travelTimeFromPreviousMin: 0,
    startTime: "09:00",
    endTime: "10:15",
    scheduleScore: 1,
    finalScore: catalogItem.baseScore,
  };
}
