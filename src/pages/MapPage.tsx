import { useState, useCallback, useRef, useEffect, useContext } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import type { Trip, Attraction } from '../types';
import { MOCK_TRIP } from '../services/api';
import { TripContext } from '../contexts/TripContext';
import Navbar from '../components/Navbar';

const CATEGORY_COLORS: Record<string, string> = {
  '景點': '#C45A3F',
  '文化': '#6366F1',
  '購物': '#10B981',
  '自然': '#2D9B6F',
};

// Geocoded coordinates for MOCK_TRIP attractions
const ATTRACTION_COORDS: Record<string, { lat: number; lng: number }> = {
  'a01': { lat: 34.9671, lng: 135.7727 },
  'a02': { lat: 35.0048, lng: 135.7654 },
  'a03': { lat: 35.0036, lng: 135.7781 },
  'a04': { lat: 35.0394, lng: 135.7292 },
  'a05': { lat: 35.0170, lng: 135.6775 },
  'a06': { lat: 35.0057, lng: 135.7625 },
  'a07': { lat: 35.6851, lng: 139.7100 },
  'a08': { lat: 35.6595, lng: 139.7005 },
  'a09': { lat: 35.7148, lng: 139.7967 },
  'a10': { lat: 35.6654, lng: 139.7707 },
  'a11': { lat: 35.6984, lng: 139.7731 },
  'a12': { lat: 35.3605, lng: 139.0228 },
  'a13': { lat: 35.2322, lng: 139.1061 },
  'a14': { lat: 35.6197, lng: 139.7831 },
  'a15': { lat: 35.6339, lng: 139.7788 },
  'a16': { lat: 35.3607, lng: 138.7274 },
  'a17': { lat: 34.6687, lng: 135.5024 },
  'a18': { lat: 34.9948, lng: 135.7850 },
};

const DAY_CENTERS: Record<number, { lat: number; lng: number }> = {
  0: { lat: 35.0116, lng: 135.7681 },
  1: { lat: 35.0200, lng: 135.7000 },
  2: { lat: 35.6892, lng: 139.7503 },
  3: { lat: 35.2800, lng: 139.0600 },
  4: { lat: 35.6250, lng: 139.7800 },
  5: { lat: 35.3607, lng: 138.7274 },
  6: { lat: 34.9937, lng: 135.7850 },
};

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
};

// ── InfoWindow content ────────────────────────────────────────────
function AttractionInfoWindow({ attraction }: { attraction: Attraction }) {
  const color = CATEGORY_COLORS[attraction.category] ?? '#C45A3F';
  const [imgError, setImgError] = useState(false);

  return (
    <div style={{ maxWidth: 260, fontFamily: 'Inter, sans-serif', lineHeight: 1.5 }}>
      {/* Image */}
      {attraction.image && !imgError ? (
        <img
          src={attraction.image}
          alt={attraction.name}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 10, display: 'block' }}
        />
      ) : (
        <div style={{
          width: '100%', height: 56, borderRadius: 8, marginBottom: 10,
          background: `${color}18`, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 12, color: '#AEAB9E',
        }}>
          目前無圖片
        </div>
      )}

      {/* Category + Rating */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 4,
          background: `${color}20`, color, fontWeight: 700,
        }}>
          {attraction.category}
        </span>
        <span style={{ fontSize: 12, color: '#F59E0B', fontWeight: 700 }}>
          ★ {attraction.rating ?? '-'}
        </span>
      </div>

      {/* Name */}
      <div style={{ fontSize: 15, fontWeight: 700, color: '#2C2C2A', marginBottom: 6 }}>
        {attraction.name}
      </div>

      {/* Location */}
      <div style={{ fontSize: 11, color: '#7E7C73', marginBottom: 6 }}>
        📍 {attraction.location ?? '-'}
      </div>

      {/* Recommend reason / XAI summary */}
      <div style={{
        fontSize: 12, color: '#555', lineHeight: 1.6, marginBottom: 8,
        paddingLeft: 8, borderLeft: `3px solid ${color}`,
      }}>
        {(attraction.xai?.summary || attraction.description)
          ? (attraction.xai?.summary || attraction.description).slice(0, 90) + '…'
          : '暫無推薦說明'}
      </div>

      {/* Duration + Cost */}
      <div style={{ display: 'flex', gap: 10, fontSize: 11, color: '#7E7C73', marginBottom: 6 }}>
        <span>⏱ {attraction.duration ?? '-'}</span>
        <span>💰 {attraction.estimatedCost ?? '-'}</span>
      </div>

      {/* Reviews count fallback + source */}
      <div style={{ display: 'flex', gap: 8, fontSize: 10, color: '#AEAB9E' }}>
        <span>評論：-</span>
        <span>來源：AI 行程規劃</span>
      </div>
    </div>
  );
}

// ── Attraction card in sidebar ────────────────────────────────────
function AttractionCard({
  attraction,
  idx,
  isSelected,
  hasCoords,
  onClick,
}: {
  attraction: Attraction;
  idx: number;
  isSelected: boolean;
  hasCoords: boolean;
  onClick: () => void;
}) {
  const color = CATEGORY_COLORS[attraction.category] ?? '#C45A3F';
  const [imgError, setImgError] = useState(false);
  const reason = attraction.xai?.summary || attraction.description;

  return (
    <div
      onClick={() => hasCoords && onClick()}
      style={{
        borderBottom: '1px solid var(--color-border)',
        cursor: hasCoords ? 'pointer' : 'default',
        background: isSelected ? '#FDF6F4' : 'transparent',
        borderLeft: `4px solid ${isSelected ? color : 'transparent'}`,
        transition: 'background 0.2s, border-left-color 0.2s',
        overflow: 'hidden',
      }}
    >
      {/* ── Collapsed row (always visible) ── */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Index badge */}
        <div style={{
          width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
          background: isSelected ? color : '#EEECEA',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700,
          color: isSelected ? '#fff' : 'var(--color-text-muted)',
          transition: 'all 0.2s',
        }}>
          {idx + 1}
        </div>

        {/* Name + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: isSelected ? 700 : 600,
            color: 'var(--color-text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            marginBottom: 4,
          }}>
            {attraction.name}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              📍 {attraction.location ?? '-'}
            </span>
            <span style={{
              fontSize: 10, padding: '1px 7px', borderRadius: 4,
              background: `${color}18`, color, fontWeight: 600,
            }}>
              {attraction.category}
            </span>
            {attraction.duration && (
              <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                ⏱ {attraction.duration}
              </span>
            )}
          </div>
        </div>

        {/* Rating */}
        <div style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B', flexShrink: 0 }}>
          ★ {attraction.rating ?? '-'}
        </div>

        {/* Chevron */}
        <div style={{
          fontSize: 10, color: '#AEAB9E', flexShrink: 0,
          transform: isSelected ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
          lineHeight: 1,
        }}>
          ▼
        </div>
      </div>

      {/* ── Expanded panel (visible only when selected) ── */}
      {isSelected && (
        <div style={{ borderTop: `1px solid ${color}30`, background: '#FFF9F7' }}>
          {/* Image */}
          {attraction.image && !imgError ? (
            <img
              src={attraction.image}
              alt={attraction.name}
              onError={() => setImgError(true)}
              style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{
              height: 48, background: `${color}10`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: '#AEAB9E',
            }}>
              目前無圖片
            </div>
          )}

          <div style={{ padding: '12px 16px 14px' }}>

            {/* Reason / XAI summary */}
            {reason && (
              <div style={{
                fontSize: 11, color: '#6B6966', lineHeight: 1.6,
                marginBottom: 10, paddingLeft: 8,
                borderLeft: `3px solid ${color}`,
              }}>
                {reason}
              </div>
            )}

            {/* Cost */}
            {attraction.estimatedCost && (
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 10 }}>
                💰 預估費用：{attraction.estimatedCost}
              </div>
            )}

            {/* XAI scores */}
            {attraction.xai?.scores?.length > 0 && (
              <div style={{ padding: '8px 10px', background: '#F2F0EC', borderRadius: 6 }}>
                <div style={{ fontSize: 10, color: '#AEAB9E', fontWeight: 600, marginBottom: 6 }}>AI 分析</div>
                {attraction.xai.scores.slice(0, 3).map(s => (
                  <div key={s.label} style={{ marginBottom: 5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6B6966', marginBottom: 2 }}>
                      <span>{s.label}</span>
                      <span style={{ color: s.color, fontWeight: 700 }}>{s.value}</span>
                    </div>
                    <div style={{ height: 4, background: '#E5E3DE', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${s.value}%`, background: s.color, borderRadius: 2, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Missing coords warning */}
            {!hasCoords && (
              <div style={{ fontSize: 10, color: '#AEAB9E', marginTop: 8 }}>⚠ 無座標資料，無法定位</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function MapPage() {
  const { tripId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Read shared trip from context; fall back to navigation state or MOCK_TRIP
  const ctx = useContext(TripContext);
  const trip: Trip = ctx?.trip ?? (location.state as { trip?: Trip })?.trip ?? MOCK_TRIP;

  const [activeDay, setActiveDay] = useState(0);
  const [selectedAttraction, setSelectedAttraction] = useState<Attraction | null>(null);
  const [mapCenter, setMapCenter] = useState(DAY_CENTERS[0] ?? { lat: 35.0116, lng: 135.7681 });
  const [mapZoom, setMapZoom] = useState(13);
  const mapRef = useRef<google.maps.Map | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '',
  });

  const onLoad = useCallback((map: google.maps.Map) => { mapRef.current = map; }, []);
  const onUnmount = useCallback(() => { mapRef.current = null; }, []);

  const dayAttractions = trip.days[activeDay]?.attractions ?? [];

  // When day changes, pan to day center and reset selection
  useEffect(() => {
    const center = DAY_CENTERS[activeDay] ?? { lat: 35.0116, lng: 135.7681 };
    setMapCenter(center);
    setMapZoom(13);
    setSelectedAttraction(null);
    if (mapRef.current) {
      mapRef.current.panTo(center);
      mapRef.current.setZoom(13);
    }
  }, [activeDay]);

  // Scroll selected card into view
  useEffect(() => {
    if (selectedAttraction) {
      const el = cardRefs.current[selectedAttraction.id];
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedAttraction]);

  function focusAttraction(attraction: Attraction) {
    const coords = ATTRACTION_COORDS[attraction.id];
    setSelectedAttraction(prev => prev?.id === attraction.id ? null : attraction);
    if (coords && mapRef.current) {
      mapRef.current.panTo(coords);
      mapRef.current.setZoom(16);
      setMapCenter(coords);
      setMapZoom(16);
    }
  }

  const accentColor = '#C45A3F';

  return (
    <div style={{ height: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Navbar
        showBack
        backLabel="返回行程"
        backPath={`/itinerary/${tripId}`}
        rightActions={
          <button style={{
            padding: '6px 14px',
            width: 'auto',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: 'default',
            borderRadius: 6,
            border: `1.5px dashed ${accentColor}`,
            background: `${accentColor}0D`,
            color: accentColor,
          }}>
            地圖檢視
          </button>
        }
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Sidebar ── */}
        <div style={{
          width: 360,
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          background: '#FAFAF8',
        }}>

          {/* Day tabs */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
            background: '#FFFFFF',
          }}>
            {trip.days.map((day, i) => (
              <button
                key={i}
                onClick={() => setActiveDay(i)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: `1.5px solid ${i === activeDay ? accentColor : 'var(--color-border)'}`,
                  background: i === activeDay ? accentColor : '#FFFFFF',
                  color: i === activeDay ? '#FFFFFF' : 'var(--color-text-muted)',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit',
                }}
              >
                Day {day.day}
              </button>
            ))}
          </div>

          {/* Day header */}
          <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid var(--color-border)', background: '#FFFFFF' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>
              Day {trip.days[activeDay]?.day}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 3 }}>
              共 {dayAttractions.length} 個景點・點擊卡片或 marker 定位
            </div>
          </div>

          {/* Attractions list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {dayAttractions.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🗺️</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>此天暫無景點</div>
                <div style={{ fontSize: 11 }}>請先在上一頁選擇或匯入景點清單</div>
              </div>
            ) : (
              dayAttractions.map((attraction, idx) => (
                <div
                  key={attraction.id}
                  ref={el => { cardRefs.current[attraction.id] = el; }}
                >
                  <AttractionCard
                    attraction={attraction}
                    idx={idx}
                    isSelected={selectedAttraction?.id === attraction.id}
                    hasCoords={!!ATTRACTION_COORDS[attraction.id]}
                    onClick={() => focusAttraction(attraction)}
                  />
                </div>
              ))
            )}
          </div>

          {/* Back to itinerary */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)', background: '#FFFFFF' }}>
            <button
              onClick={() => navigate(`/itinerary/${tripId}`, { state: { trip } })}
              className="btn-primary"
              style={{ padding: '10px', fontSize: 13 }}
            >
              返回行程編輯
            </button>
          </div>
        </div>

        {/* ── Map area ── */}
        <div style={{ flex: 1, position: 'relative' }}>
          {/* Error state */}
          {loadError && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 40 }}>⚠️</div>
              <div style={{ fontSize: 16, color: 'var(--color-text)', fontWeight: 600 }}>地圖載入失敗</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{loadError.message}</div>
            </div>
          )}

          {/* Loading state */}
          {!isLoaded && !loadError && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                border: `3px solid ${accentColor}`,
                borderTopColor: 'transparent',
                animation: 'spin 0.8s linear infinite',
              }} />
              <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>地圖載入中…</div>
            </div>
          )}

          {isLoaded && (
            <GoogleMap
              mapContainerStyle={MAP_CONTAINER_STYLE}
              center={mapCenter}
              zoom={mapZoom}
              options={MAP_OPTIONS}
              onLoad={onLoad}
              onUnmount={onUnmount}
            >
              {/* Markers */}
              {dayAttractions.map((attraction, idx) => {
                const coords = ATTRACTION_COORDS[attraction.id];
                if (!coords) return null;
                const color = CATEGORY_COLORS[attraction.category] ?? accentColor;
                const isSelected = selectedAttraction?.id === attraction.id;

                return (
                  <Marker
                    key={attraction.id}
                    position={coords}
                    onClick={() => focusAttraction(attraction)}
                    label={{
                      text: String(idx + 1),
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: '700',
                    }}
                    icon={{
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: isSelected ? 20 : 14,
                      fillColor: color,
                      fillOpacity: 1,
                      strokeColor: '#FFFFFF',
                      strokeWeight: isSelected ? 3 : 2,
                    }}
                    zIndex={isSelected ? 100 : idx}
                  />
                );
              })}

              {/* InfoWindow — synced with selected card */}
              {selectedAttraction && ATTRACTION_COORDS[selectedAttraction.id] && (
                <InfoWindow
                  position={ATTRACTION_COORDS[selectedAttraction.id]}
                  onCloseClick={() => setSelectedAttraction(null)}
                  options={{ pixelOffset: new google.maps.Size(0, -24) }}
                >
                  <AttractionInfoWindow attraction={selectedAttraction} />
                </InfoWindow>
              )}
            </GoogleMap>
          )}

          {/* Floating legend */}
          {isLoaded && (
            <div style={{
              position: 'absolute',
              bottom: 24,
              right: 24,
              background: 'rgba(255,255,255,0.96)',
              borderRadius: 10,
              padding: '10px 14px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              border: '1px solid var(--color-border)',
              fontSize: 11,
            }}>
              {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, color: 'var(--color-text)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                  {cat}
                </div>
              ))}
            </div>
          )}

          {/* No-coord warning badge */}
          {isLoaded && dayAttractions.some(a => !ATTRACTION_COORDS[a.id]) && (
            <div style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'rgba(255,255,255,0.95)',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 11,
              color: '#888',
              border: '1px solid var(--color-border)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}>
              ⚠ 部分景點無座標，已略過顯示
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
