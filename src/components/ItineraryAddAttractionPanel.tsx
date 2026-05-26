import { useEffect, useMemo, useState } from 'react';
import type {
  Attraction,
  DayPlan,
  PreferenceProfile,
  RecommendationMetadata,
  RecommendationPoi,
  RestaurantMetadata,
  RestaurantVenue,
  Trip,
} from '../types';
import {
  getNearbyRestaurants,
  getPois,
  getRecommendationMetadata,
  getRecommendedPois,
  getRestaurantMetadata,
  getRestaurants,
} from '../services/api';

const INTEREST_FIELDS = [
  { label: '歷史古蹟', key: '歷史' },
  { label: '藝術展覽', key: '藝術' },
  { label: '自然風景', key: '自然' },
  { label: '熱門打卡', key: '打卡' },
  { label: '戶外活動', key: '戶外' },
  { label: '室內景點', key: '室內' },
  { label: '親子友善', key: '親子' },
  { label: '科學知識', key: '科學' },
  { label: '購物逛街', key: '購物' },
  { label: '溫泉放鬆', key: '溫泉' },
  { label: '宗教文化', key: '宗教' },
] as const;

const DEFAULT_INTEREST_PREFERENCES: PreferenceProfile = Object.fromEntries(
  INTEREST_FIELDS.map(field => [field.key, 0]),
);

const CATEGORY_TO_ATTRACTION: Record<string, Attraction['category']> = {
  博物館: '文化',
  寺社: '文化',
  文化藝術: '文化',
  景點: '景點',
  溫泉: '自然',
  自然: '自然',
  購物: '購物',
  遊樂: '活動',
};

function inferRegionFromDay(day?: DayPlan): string {
  const rawRegion = day?.attractions?.[0]?.location?.split('・')[0]?.trim() ?? '';
  if (rawRegion.includes('東京')) return '東京都';
  if (rawRegion.includes('京都')) return '京都府';
  if (rawRegion.includes('大阪')) return '大阪府';
  if (rawRegion.includes('神奈川')) return '神奈川県';
  if (rawRegion.includes('山梨')) return '山梨県';
  return rawRegion;
}

function buildInitialInterestPreferences(trip: Trip): PreferenceProfile {
  const next = { ...DEFAULT_INTEREST_PREFERENCES };
  for (const interest of trip.preferences.interests ?? []) {
    if (interest === '文化') {
      next.歷史 = 0.8;
      next.藝術 = 0.6;
      next.宗教 = 0.8;
    }
    if (interest === '自然') {
      next.自然 = 0.9;
      next.戶外 = 0.7;
      next.溫泉 = 0.5;
    }
    if (interest === '購物') {
      next.購物 = 0.9;
      next.打卡 = 0.6;
    }
    if (interest === '美食') {
      next.打卡 = Math.max(next.打卡 ?? 0, 0.3);
    }
  }
  return next;
}

function compactPreferences(preferences: PreferenceProfile): PreferenceProfile {
  return Object.fromEntries(
    Object.entries(preferences).filter(([, value]) => value > 0),
  );
}

function buildRecommendationSummary(poi: RecommendationPoi): string {
  if (poi.context) {
    return poi.context;
  }
  if (poi.description) {
    return poi.description;
  }
  if (typeof poi.final_score === 'number') {
    return `依據目前興趣偏好，這個景點在 ${poi.region} 的推薦分數為 ${Math.round(poi.final_score * 100)} 分。`;
  }
  if (typeof poi.static_score === 'number') {
    return `這是 ${poi.region} 可加入的高評價景點，靜態評分為 ${Math.round(poi.static_score * 100)} 分。`;
  }
  return `這是 ${poi.region} 可直接加入行程的景點資料。`;
}

function buildRestaurantSummary(restaurant: RestaurantVenue): string {
  if (restaurant.context) return restaurant.context;
  if (restaurant.description) return restaurant.description;
  if (typeof restaurant.google_rating === 'number') {
    return `${restaurant.name} 位於 ${restaurant.region}，Google 評分 ${restaurant.google_rating.toFixed(1)}。`;
  }
  return `${restaurant.name} 位於 ${restaurant.region}，可直接加入今日餐飲安排。`;
}

function mapPoiToAttraction(poi: RecommendationPoi): Attraction {
  const matchedInterests = Array.isArray(poi.interests)
    ? poi.interests.filter((interest): interest is '美食' | '文化' | '購物' | '自然' =>
      interest === '美食' || interest === '文化' || interest === '購物' || interest === '自然')
    : [];

  return {
    id: `poi-${poi.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: poi.name,
    category: CATEGORY_TO_ATTRACTION[poi.category] ?? '景點',
    description: poi.context ?? poi.description ?? `${poi.name} 位於 ${poi.region}，可從推薦清單直接加入當日行程。`,
    image: poi.image_url ?? '',
    duration: '待安排',
    rating: poi.google_rating ?? 0,
    estimatedCost: '待確認',
    location: poi.region || '-',
    position: typeof poi.lat === 'number' && typeof poi.lng === 'number'
      ? { lat: poi.lat, lng: poi.lng }
      : null,
    baseScore: Math.round((poi.static_score ?? poi.final_score ?? 0.7) * 100),
    foodScore: matchedInterests.includes('美食') ? 90 : 40,
    explorationScore: matchedInterests.includes('自然') ? 85 : 55,
    xai: {
      summary: buildRecommendationSummary(poi),
      scores: [
        {
          label: '興趣匹配',
          value: Math.round((poi.score_breakdown?.interest_match ?? poi.final_score ?? 0) * 100),
        },
        {
          label: '靜態評分',
          value: Math.round((poi.score_breakdown?.static_score ?? poi.static_score ?? 0) * 100),
        },
        {
          label: '總分',
          value: Math.round((poi.final_score ?? poi.static_score ?? 0) * 100),
        },
      ],
      matchedInterests,
      isManual: true,
    },
  };
}

function mapRestaurantToAttraction(restaurant: RestaurantVenue): Attraction {
  return {
    id: `restaurant-${restaurant.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: restaurant.name,
    category: '美食',
    description: restaurant.description ?? restaurant.context ?? `${restaurant.name} 可作為當日餐飲安排加入行程。`,
    image: restaurant.image_url ?? '',
    duration: '用餐時間待安排',
    rating: restaurant.google_rating ?? 0,
    estimatedCost: '待確認',
    location: restaurant.region || '-',
    position: typeof restaurant.lat === 'number' && typeof restaurant.lng === 'number'
      ? { lat: restaurant.lat, lng: restaurant.lng }
      : null,
    baseScore: Math.round((restaurant.static_score ?? restaurant.final_score ?? 0.7) * 100),
    foodScore: 95,
    explorationScore: 30,
    xai: {
      summary: buildRestaurantSummary(restaurant),
      scores: [
        { label: '餐飲適合度', value: 95 },
        { label: '靜態評分', value: Math.round((restaurant.static_score ?? restaurant.final_score ?? 0) * 100) },
        { label: 'Google 評分', value: Math.round((restaurant.google_rating ?? 0) * 20) },
      ],
      matchedInterests: ['美食'],
      isManual: true,
    },
  };
}

function ResultThumbnail({ imageUrl, name }: { imageUrl?: string; name: string }) {
  const [imgError, setImgError] = useState(false);

  if (imageUrl && !imgError) {
    return (
      <img
        src={imageUrl}
        alt={name}
        onError={() => setImgError(true)}
        className="poi-result-thumb"
      />
    );
  }

  return (
    <div className="poi-result-thumb placeholder">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
      <span>無圖片</span>
    </div>
  );
}

interface ItineraryAddAttractionPanelProps {
  trip: Trip;
  currentDay?: DayPlan;
  existingAttractions: Attraction[];
  onAddAttraction: (attraction: Attraction, options?: { afterAttractionId?: string }) => void;
  nearbyRestaurantRequest?: {
    attraction: Attraction;
    token: number;
  } | null;
}

export default function ItineraryAddAttractionPanel({
  trip,
  currentDay,
  existingAttractions,
  onAddAttraction,
  nearbyRestaurantRequest,
}: ItineraryAddAttractionPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [contentType, setContentType] = useState<'poi' | 'restaurant'>('poi');
  const [mode, setMode] = useState<'all' | 'recommended'>('all');
  const [restaurantMode, setRestaurantMode] = useState<'all' | 'nearby'>('all');
  const [poiMetadata, setPoiMetadata] = useState<RecommendationMetadata | null>(null);
  const [restaurantMetadata, setRestaurantMetadata] = useState<RestaurantMetadata | null>(null);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [topK, setTopK] = useState(10);
  const [restaurantTopK, setRestaurantTopK] = useState(10);
  const [restaurantRadiusM, setRestaurantRadiusM] = useState(500);
  const [interestPreferences, setInterestPreferences] = useState<PreferenceProfile>(() => buildInitialInterestPreferences(trip));
  const [results, setResults] = useState<RecommendationPoi[]>([]);
  const [restaurantResults, setRestaurantResults] = useState<RestaurantVenue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [nearbySourceAttraction, setNearbySourceAttraction] = useState<Attraction | null>(null);

  const guessedRegion = useMemo(() => inferRegionFromDay(currentDay), [currentDay]);
  const existingNames = useMemo(
    () => new Set(existingAttractions.map(attraction => attraction.name)),
    [existingAttractions],
  );
  const filteredPoiResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return results;

    return results.filter((poi) => {
      const haystacks = [
        poi.name,
        poi.region,
        poi.category,
        poi.description ?? '',
        ...(poi.interests ?? []),
      ];

      return haystacks.some((value) => value.toLowerCase().includes(query));
    });
  }, [results, searchTerm]);
  const filteredRestaurantResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return restaurantResults;

    return restaurantResults.filter((restaurant) => {
      const haystacks = [
        restaurant.name,
        restaurant.region,
        restaurant.category,
        restaurant.description ?? '',
        restaurant.context ?? '',
      ];

      return haystacks.some((value) => value.toLowerCase().includes(query));
    });
  }, [restaurantResults, searchTerm]);
  const activeMetadata = contentType === 'poi' ? poiMetadata : restaurantMetadata;

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setError('');
    const load = contentType === 'poi'
      ? (!poiMetadata ? getRecommendationMetadata().then(response => !cancelled && setPoiMetadata(response)) : Promise.resolve())
      : (!restaurantMetadata ? getRestaurantMetadata().then(response => !cancelled && setRestaurantMetadata(response)) : Promise.resolve());

    load.catch(err => {
      if (cancelled) return;
      setError(err instanceof Error ? err.message : `無法取得${contentType === 'poi' ? '推薦' : '餐廳'}設定`);
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, contentType, poiMetadata, restaurantMetadata]);

  useEffect(() => {
    if (!activeMetadata) return;

    const nextRegion = activeMetadata.regions.includes(guessedRegion)
      ? guessedRegion
      : activeMetadata.regions[0] ?? '';

    setSelectedRegion(nextRegion);
    setSelectedCategory('');
    setSearchTerm('');
    setError('');
  }, [activeMetadata, guessedRegion, contentType]);

  useEffect(() => {
    setInterestPreferences(buildInitialInterestPreferences(trip));
  }, [trip.preferences.interests]);

  useEffect(() => {
    if (!nearbyRestaurantRequest) return;
    setIsOpen(true);
    setContentType('restaurant');
    setRestaurantMode('nearby');
    setNearbySourceAttraction(nearbyRestaurantRequest.attraction);
    setSearchTerm('');
  }, [nearbyRestaurantRequest]);

  useEffect(() => {
    if (
      !isOpen ||
      contentType !== 'restaurant' ||
      restaurantMode !== 'nearby' ||
      !nearbySourceAttraction?.position
    ) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError('');

    getNearbyRestaurants({
      lat: nearbySourceAttraction.position.lat,
      lng: nearbySourceAttraction.position.lng,
      radiusM: restaurantRadiusM,
      topK: restaurantTopK,
      category: selectedCategory || undefined,
    })
      .then((nextRestaurants) => {
        if (cancelled) return;
        setRestaurantResults(nextRestaurants);
        setResults([]);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : '載入附近餐廳失敗');
        setRestaurantResults([]);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    contentType,
    restaurantMode,
    nearbySourceAttraction,
    restaurantRadiusM,
    restaurantTopK,
    selectedCategory,
  ]);

  async function handleFetch() {
    if (!selectedRegion) {
      setError('請先選擇地區');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (contentType === 'restaurant') {
        const nextRestaurants = restaurantMode === 'nearby' && nearbySourceAttraction?.position
          ? await getNearbyRestaurants({
            lat: nearbySourceAttraction.position.lat,
            lng: nearbySourceAttraction.position.lng,
            radiusM: restaurantRadiusM,
            topK: restaurantTopK,
            category: selectedCategory || undefined,
          })
          : await getRestaurants({
            region: selectedRegion,
            category: selectedCategory || undefined,
          });
        setRestaurantResults(nextRestaurants);
        setResults([]);
      } else {
        const nextResults = mode === 'all'
          ? await getPois({
            region: selectedRegion,
            category: selectedCategory || undefined,
          })
          : await getRecommendedPois({
            region: selectedRegion,
            category: selectedCategory || undefined,
            preferences: compactPreferences(interestPreferences),
            topK,
          });
        setResults(nextResults);
        setRestaurantResults([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `載入${contentType === 'poi' ? '景點' : '餐廳'}失敗`);
      setResults([]);
      setRestaurantResults([]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <aside className={`add-attraction-panel ${isOpen ? 'open' : ''}`}>
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="add-attraction-floating-btn"
        title={isOpen ? '收起面板' : '增加景點'}
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="add-attraction-panel-body">
          {/* ── Segmented Control: POI / Restaurant ── */}
          <div className="segmented-control" data-active={contentType}>
            <div className="segmented-slider" />
            <button
              type="button"
              onClick={() => { setContentType('poi'); setNearbySourceAttraction(null); }}
              className={`segmented-btn ${contentType === 'poi' ? 'active' : ''}`}
            >
              添加景點
            </button>
            <button
              type="button"
              onClick={() => { setContentType('restaurant'); setRestaurantMode('all'); }}
              className={`segmented-btn ${contentType === 'restaurant' ? 'active' : ''}`}
            >
              添加餐廳
            </button>
          </div>

          {/* ── Two-column layout: filters left, results right ── */}
          <div className="drawer-two-col">

            {/* LEFT: filters */}
            <div className="drawer-filters">

              {contentType === 'poi' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>啟用興趣推薦</span>
                  <button
                    type="button"
                    onClick={() => setMode(mode === 'all' ? 'recommended' : 'all')}
                    className={`toggle-switch ${mode === 'recommended' ? 'on' : 'off'}`}
                  >
                    <div className="toggle-thumb" />
                  </button>
                </div>
              )}

              {contentType === 'restaurant' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>啟用附近餐廳推薦</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (restaurantMode === 'all') {
                        setRestaurantMode('nearby');
                      } else {
                        setRestaurantMode('all');
                        setNearbySourceAttraction(null);
                      }
                    }}
                    className={`toggle-switch ${restaurantMode === 'nearby' ? 'on' : 'off'}`}
                  >
                    <div className="toggle-thumb" />
                  </button>
                </div>
              )}

              {contentType === 'restaurant' && restaurantMode === 'nearby' && !nearbySourceAttraction && (
                <div className="panel-status" style={{ color: 'var(--color-accent)', background: '#FDE8EC' }}>
                  * 請點選左側景點
                </div>
              )}

              {!(contentType === 'restaurant' && restaurantMode === 'nearby') && (
                <div className="panel-field">
                  <label>地區</label>
                  <select value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)} className="panel-select">
                    <option value="">請選擇地區</option>
                    {(activeMetadata?.regions ?? []).map(region => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                </div>
              )}

              {contentType === 'restaurant' && restaurantMode === 'nearby' && nearbySourceAttraction && (
                <div className="panel-status">
                  以「{nearbySourceAttraction.name}」為中心推薦附近餐廳
                </div>
              )}

              <div className="panel-field">
                <label>{contentType === 'poi' ? '類型' : '餐廳種類'}</label>
                <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="panel-select">
                  <option value="">全部類型</option>
                  {(activeMetadata?.categories ?? []).map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {!(contentType === 'poi' && mode === 'recommended') && (
                <div className="panel-field">
                  <label>搜尋</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="panel-input"
                    placeholder={contentType === 'poi' ? '名稱、地區、興趣...' : '名稱、地區、種類...'}
                  />
                </div>
              )}

              {contentType === 'restaurant' && restaurantMode === 'nearby' && (
                <>
                  <div className="panel-field">
                    <label>搜尋半徑</label>
                    <select value={restaurantRadiusM} onChange={e => setRestaurantRadiusM(Number(e.target.value))} className="panel-select">
                      {[300, 500, 800, 1200, 2000].map(v => <option key={v} value={v}>{v} 公尺</option>)}
                    </select>
                  </div>
                  <div className="panel-field">
                    <label>推薦數量</label>
                    <select value={restaurantTopK} onChange={e => setRestaurantTopK(Number(e.target.value))} className="panel-select">
                      {[5, 10, 20, 30].map(v => <option key={v} value={v}>{v} 間</option>)}
                    </select>
                  </div>
                </>
              )}

              {contentType === 'poi' && mode === 'recommended' && (
                <>
                  <div className="panel-field">
                    <label>推薦數量</label>
                    <select value={topK} onChange={e => setTopK(Number(e.target.value))} className="panel-select">
                      {[5, 10, 15, 20].map(v => <option key={v} value={v}>{v} 個</option>)}
                    </select>
                  </div>
                  <div className="interest-slider-list">
                    {INTEREST_FIELDS.map(field => (
                      <label key={field.key} className="interest-slider-row">
                        <span>{field.label}</span>
                        <input
                          type="range" min="0" max="1" step="0.1"
                          value={interestPreferences[field.key] ?? 0}
                          onChange={e => setInterestPreferences(prev => ({ ...prev, [field.key]: Number(e.target.value) }))}
                        />
                        <strong>{(interestPreferences[field.key] ?? 0).toFixed(1)}</strong>
                      </label>
                    ))}
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={handleFetch}
                className="btn-primary"
                style={{ width: '100%', padding: '10px 16px', marginTop: 4 }}
              >
                {contentType === 'restaurant'
                  ? restaurantMode === 'nearby' ? '搜尋附近餐廳' : '搜尋餐廳'
                  : mode === 'all' ? '搜尋景點' : '開始推薦'}
              </button>

              {error && <div className="panel-status error">{error}</div>}
              {isLoading && <div className="panel-status">載入中...</div>}
            </div>

            {/* RIGHT: results */}
            <div className="drawer-results">
              {!isLoading && !error && results.length === 0 && restaurantResults.length === 0 && (
                <div className="panel-status">選好條件後，點擊載入{contentType === 'poi' ? '景點' : '餐廳'}，並直接加入 Day {currentDay?.day ?? 1}。</div>
              )}

              {contentType === 'poi' && !isLoading && results.length > 0 && (
                <>
                  <div className="panel-status">已載入 {results.length} 筆，顯示 {filteredPoiResults.length} 筆</div>
                  <div className="poi-results">
                    {filteredPoiResults.map(poi => {
                      const isAdded = existingNames.has(poi.name);
                      return (
                        <div key={`${poi.id}-${poi.name}`} className="poi-result-card">
                          <div className="poi-result-top">
                            <ResultThumbnail imageUrl={poi.image_url} name={poi.name} />
                            <div className="poi-result-main">
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                <div>
                                  <div className="poi-result-title">{poi.name}</div>
                                  <div className="poi-result-meta">{poi.region} ・ {poi.category}</div>
                                </div>
                                {typeof poi.final_score === 'number' && (
                                  <div className="poi-score">{Math.round(poi.final_score * 100)}</div>
                                )}
                              </div>
                              {Array.isArray(poi.interests) && poi.interests.length > 0 && (
                                <div className="poi-interest-tags">
                                  {poi.interests.slice(0, 4).map(interest => <span key={interest}>{interest}</span>)}
                                </div>
                              )}
                              <div className="poi-result-summary">{buildRecommendationSummary(poi)}</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onAddAttraction(mapPoiToAttraction(poi))}
                            disabled={isAdded}
                            className="btn-primary"
                            style={{ width: '100%', padding: '9px 14px', background: isAdded ? '#D6D3D1' : undefined, cursor: isAdded ? 'not-allowed' : 'pointer' }}
                          >
                            {isAdded ? '今日已加入' : '加入今天行程'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {results.length > 0 && filteredPoiResults.length === 0 && (
                    <div className="panel-status">目前搜尋條件沒有匹配結果，請換個關鍵字。</div>
                  )}
                </>
              )}

              {contentType === 'restaurant' && !isLoading && restaurantResults.length > 0 && (
                <>
                  <div className="panel-status">已載入 {restaurantResults.length} 筆，顯示 {filteredRestaurantResults.length} 筆</div>
                  <div className="poi-results">
                    {filteredRestaurantResults.map(restaurant => {
                      const isAdded = existingNames.has(restaurant.name);
                      return (
                        <div key={`${restaurant.id}-${restaurant.name}`} className="poi-result-card">
                          <div className="poi-result-top">
                            <ResultThumbnail imageUrl={restaurant.image_url} name={restaurant.name} />
                            <div className="poi-result-main">
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                <div>
                                  <div className="poi-result-title">{restaurant.name}</div>
                                  <div className="poi-result-meta">{restaurant.region} ・ {restaurant.category}</div>
                                </div>
                                {typeof restaurant.google_rating === 'number' && (
                                  <div className="poi-score">{restaurant.google_rating.toFixed(1)}</div>
                                )}
                              </div>
                              <div className="poi-result-summary">{buildRestaurantSummary(restaurant)}</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onAddAttraction(
                              mapRestaurantToAttraction(restaurant),
                              restaurantMode === 'nearby' && nearbySourceAttraction
                                ? { afterAttractionId: nearbySourceAttraction.id }
                                : undefined,
                            )}
                            disabled={isAdded}
                            className="btn-primary"
                            style={{ width: '100%', padding: '9px 14px', background: isAdded ? '#D6D3D1' : undefined, cursor: isAdded ? 'not-allowed' : 'pointer' }}
                          >
                            {isAdded ? '今日已加入' : '加入今天行程'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {restaurantResults.length > 0 && filteredRestaurantResults.length === 0 && (
                    <div className="panel-status">目前搜尋條件沒有匹配結果，請換個關鍵字。</div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

