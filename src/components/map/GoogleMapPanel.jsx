import { useEffect, useMemo, useRef, useState } from "react";
import { loadGoogleMapsApi } from "../../lib/googleMapsLoader";

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildInfoWindowContent(spot) {
  const warningText = spot.dataInsufficient
    ? `<p>資料警示：評論數 ${escapeHtml(String(spot.reviewsCount ?? "-"))}，資料較少</p>`
    : `<p>評論數：${escapeHtml(String(spot.reviewsCount ?? "-"))}</p>`;
  const sourceText = spot.source ? `<p>來源：${escapeHtml(spot.source)}</p>` : "";
  return `
    <div class="gm-info">
      <h4>${escapeHtml(spot.name)}</h4>
      <p>評分：${escapeHtml(spot.rating)}</p>
      <p>推薦原因：${escapeHtml(spot.reason)}</p>
      ${warningText}
      ${sourceText}
    </div>
  `;
}

function detachMarker(marker) {
  if (!marker) {
    return;
  }

  if (typeof marker.setMap === "function") {
    marker.setMap(null);
    return;
  }

  marker.map = null;
}

function toRouteLocationLabel(spot) {
  const name = String(spot?.name || "").trim();
  const area = String(spot?.area || "").trim();
  if (name) {
    return area ? `${name} ${area} 日本` : `${name} 日本`;
  }
  if (spot?.position?.lat != null && spot?.position?.lng != null) {
    return `${spot.position.lat},${spot.position.lng}`;
  }
  return "";
}

function buildGoogleMapsDirectionsUrl(points) {
  if (!Array.isArray(points) || points.length < 2) {
    return "";
  }

  const normalized = points.map((spot) => toRouteLocationLabel(spot)).filter(Boolean);
  if (normalized.length < 2) {
    return "";
  }

  const origin = encodeURIComponent(normalized[0]);
  const destination = encodeURIComponent(normalized[normalized.length - 1]);
  const waypointValues = normalized.slice(1, -1).slice(0, 8);
  const waypoints =
    waypointValues.length > 0 ? `&waypoints=${encodeURIComponent(waypointValues.join("|"))}` : "";

  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints}&travelmode=driving`;
}

export default function GoogleMapPanel({
  apiKey,
  mapId = "",
  spots,
  routeSpots = [],
  selectedSpotName,
  onMarkerSelect,
}) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const mapsRef = useRef(null);
  const infoWindowRef = useRef(null);
  const markersRef = useRef([]);
  const directionsServiceRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const directionsDeniedRef = useRef(false);
  const constructorsRef = useRef({
    MapClass: null,
    InfoWindowClass: null,
    AdvancedMarkerClass: null,
    DirectionsServiceClass: null,
    DirectionsRendererClass: null,
    TravelMode: null,
  });

  const [mapError, setMapError] = useState("");
  const [isMapReady, setIsMapReady] = useState(false);
  const [routeError, setRouteError] = useState("");

  const selectedSpot = useMemo(
    () => spots.find((spot) => spot.name === selectedSpotName) || spots[0],
    [spots, selectedSpotName]
  );
  const routePoints = useMemo(
    () => routeSpots.filter((spot) => spot?.position),
    [routeSpots]
  );
  const googleMapsDirectionsUrl = useMemo(
    () => buildGoogleMapsDirectionsUrl(routePoints),
    [routePoints]
  );

  useEffect(() => {
    if (!apiKey) {
      setMapError("尚未設定 Google Maps API Key，請先在 .env 設定 VITE_GOOGLE_MAPS_API_KEY。");
      return;
    }

    let isCancelled = false;

    async function initMap() {
      try {
        const maps = await loadGoogleMapsApi(apiKey);
        if (isCancelled || !mapElementRef.current) {
          return;
        }

        let mapsLib = null;
        let markerLib = null;
        let routesLib = null;
        if (typeof maps.importLibrary === "function") {
          mapsLib = await maps.importLibrary("maps");
          markerLib = await maps.importLibrary("marker").catch(() => null);
          routesLib = await maps.importLibrary("routes").catch(() => null);
        }

        const MapClass = mapsLib?.Map || maps.Map;
        const InfoWindowClass = mapsLib?.InfoWindow || maps.InfoWindow;
        const AdvancedMarkerClass = markerLib?.AdvancedMarkerElement || null;
        const DirectionsServiceClass = routesLib?.DirectionsService || maps.DirectionsService || null;
        const DirectionsRendererClass = routesLib?.DirectionsRenderer || maps.DirectionsRenderer || null;
        const TravelMode = routesLib?.TravelMode || maps.TravelMode || null;

        if (typeof MapClass !== "function") {
          throw new Error("Google Maps Map constructor 不可用，請檢查 API Key 或瀏覽器外掛。");
        }

        mapsRef.current = maps;
        constructorsRef.current = {
          MapClass,
          InfoWindowClass,
          AdvancedMarkerClass,
          DirectionsServiceClass,
          DirectionsRendererClass,
          TravelMode,
        };

        mapRef.current = new MapClass(mapElementRef.current, {
          center: { lat: 35.6812, lng: 139.7671 },
          zoom: 5.4,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          mapId: mapId || undefined,
        });

        infoWindowRef.current = new InfoWindowClass();
        if (DirectionsRendererClass) {
          directionsRendererRef.current = new DirectionsRendererClass({
            suppressMarkers: true,
            preserveViewport: true,
            polylineOptions: {
              strokeColor: "#0f766e",
              strokeOpacity: 0.9,
              strokeWeight: 5,
            },
          });
          directionsRendererRef.current.setMap(mapRef.current);
        }
        if (DirectionsServiceClass) {
          directionsServiceRef.current = new DirectionsServiceClass();
        }

        setMapError("");
        setIsMapReady(true);
      } catch (error) {
        if (!isCancelled) {
          setMapError(error.message || "Google Maps 載入失敗。");
        }
      }
    }

    initMap();

    return () => {
      isCancelled = true;
      markersRef.current.forEach((marker) => detachMarker(marker));
      markersRef.current = [];
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
    };
  }, [apiKey, mapId]);

  useEffect(() => {
    if (!isMapReady || !mapRef.current || !mapsRef.current) {
      return;
    }

    markersRef.current.forEach((marker) => detachMarker(marker));
    markersRef.current = [];

    const maps = mapsRef.current;
    const map = mapRef.current;
    const infoWindow = infoWindowRef.current;
    const { AdvancedMarkerClass } = constructorsRef.current;
    const useAdvancedMarker = Boolean(AdvancedMarkerClass && mapId);

    spots.forEach((spot) => {
      if (!spot.position) {
        return;
      }

      let marker;
      if (useAdvancedMarker) {
        marker = new AdvancedMarkerClass({
          map,
          position: spot.position,
          title: spot.name,
        });
      } else {
        marker = new maps.Marker({
          map,
          position: spot.position,
          title: spot.name,
        });
      }

      const handleMarkerClick = () => {
        infoWindow.setContent(buildInfoWindowContent(spot));
        infoWindow.open({ anchor: marker, map });
        onMarkerSelect?.(spot.name);
      };

      if (useAdvancedMarker) {
        marker.addEventListener("gmp-click", handleMarkerClick);
      } else {
        marker.addListener("click", handleMarkerClick);
      }

      markersRef.current.push(marker);
    });
  }, [isMapReady, mapId, spots, onMarkerSelect]);

  useEffect(() => {
    if (!isMapReady || !mapRef.current) {
      return;
    }

    const renderer = directionsRendererRef.current;
    const service = directionsServiceRef.current;
    const { TravelMode } = constructorsRef.current;

    if (routePoints.length < 2) {
      if (renderer) {
        renderer.set("directions", null);
      }
      setRouteError("");
      directionsDeniedRef.current = false;
      return;
    }

    if (!renderer || !service || !TravelMode) {
      setRouteError("目前專案未啟用地圖內建路線 API，請改用下方 Google Maps 導航連結。");
      return;
    }
    if (directionsDeniedRef.current) {
      setRouteError("Directions API 被拒絕，請直接使用下方 Google Maps 導航連結。");
      return;
    }

    const origin = routePoints[0].position;
    const destination = routePoints[routePoints.length - 1].position;
    const waypoints = routePoints.slice(1, -1).map((spot) => ({
      location: spot.position,
      stopover: true,
    }));
    setRouteError("");

    service.route(
      {
        origin,
        destination,
        waypoints,
        optimizeWaypoints: true,
        travelMode: TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK" && result) {
          renderer.setDirections(result);
          setRouteError("");
          directionsDeniedRef.current = false;
        } else {
          renderer.set("directions", null);
          directionsDeniedRef.current = status === "REQUEST_DENIED";
          setRouteError(
            status === "REQUEST_DENIED"
              ? "Directions API 被拒絕（通常是未啟用 Legacy Directions API）。請改用下方 Google Maps 導航連結。"
              : `地圖內路線規劃失敗（${status}），可改用下方 Google Maps 導航連結。`
          );
        }
      }
    );
  }, [googleMapsDirectionsUrl, isMapReady, routePoints]);

  useEffect(() => {
    if (!isMapReady || !selectedSpot || !selectedSpot.position || !mapRef.current) {
      return;
    }

    const map = mapRef.current;
    const infoWindow = infoWindowRef.current;
    const matchedMarker = markersRef.current.find((marker) => marker.title === selectedSpot.name);

    map.panTo(selectedSpot.position);
    map.setZoom(Math.max(map.getZoom(), 10));

    if (matchedMarker && infoWindow) {
      infoWindow.setContent(buildInfoWindowContent(selectedSpot));
      infoWindow.open({ anchor: matchedMarker, map });
    }
  }, [isMapReady, selectedSpot]);

  if (mapError) {
    return <div className="map-placeholder map-placeholder--error">{mapError}</div>;
  }

  return (
    <>
      <div className="map-canvas" ref={mapElementRef} />
      {routeError && googleMapsDirectionsUrl ? (
        <div className="map-route-fallback">
          <p>{routeError}</p>
          <a
            className="map-route-fallback__link"
            href={googleMapsDirectionsUrl}
            target="_blank"
            rel="noreferrer"
          >
            在 Google Maps 開啟路線
          </a>
        </div>
      ) : null}
    </>
  );
}
