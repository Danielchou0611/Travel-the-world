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
  return `
    <div class="gm-info">
      <h4>${escapeHtml(spot.name)}</h4>
      <p>評分：${escapeHtml(spot.rating)}</p>
      <p>推薦原因：${escapeHtml(spot.reason)}</p>
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

export default function GoogleMapPanel({ apiKey, mapId = "", spots, selectedSpotName, onMarkerSelect }) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const mapsRef = useRef(null);
  const infoWindowRef = useRef(null);
  const markersRef = useRef([]);
  const constructorsRef = useRef({
    MapClass: null,
    InfoWindowClass: null,
    AdvancedMarkerClass: null,
  });

  const [mapError, setMapError] = useState("");
  const [isMapReady, setIsMapReady] = useState(false);

  const selectedSpot = useMemo(
    () => spots.find((spot) => spot.name === selectedSpotName) || spots[0],
    [spots, selectedSpotName]
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
        if (typeof maps.importLibrary === "function") {
          mapsLib = await maps.importLibrary("maps");
          markerLib = await maps.importLibrary("marker").catch(() => null);
        }

        const MapClass = mapsLib?.Map || maps.Map;
        const InfoWindowClass = mapsLib?.InfoWindow || maps.InfoWindow;
        const AdvancedMarkerClass = markerLib?.AdvancedMarkerElement || null;

        if (typeof MapClass !== "function") {
          throw new Error("Google Maps Map constructor 不可用，請檢查 API Key 或瀏覽器外掛。");
        }

        mapsRef.current = maps;
        constructorsRef.current = {
          MapClass,
          InfoWindowClass,
          AdvancedMarkerClass,
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

  return <div className="map-canvas" ref={mapElementRef} />;
}
