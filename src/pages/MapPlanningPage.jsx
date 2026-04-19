import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Tag,
} from "../components/ui";
import GoogleMapPanel from "../components/map/GoogleMapPanel";

const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const googleMapId = import.meta.env.VITE_GOOGLE_MAP_ID || "";
const ragApiBaseUrl = import.meta.env.VITE_RAG_API_BASE_URL || "http://127.0.0.1:8010";

const defaultGuideText = `這次安排東京 4 天自由行，第一天先到淺草寺和雷門，晚上去晴空塔看夜景。
第二天早上到明治神宮，下午在澀谷逛街，傍晚到新宿都廳看免費夜景。
第三天搭車去鎌倉，參觀鶴岡八幡宮和江之島，再回到市區吃拉麵。
最後一天到上野公園和阿美橫町採買伴手禮，晚上回機場。`;

const spotCatalog = {
  淺草寺: {
    area: "東京",
    rating: "4.6",
    reason: "東京經典文化景點，適合安排半日行程",
    reviewsCount: 438,
    tags: ["文化", "寺廟"],
    position: { lat: 35.7148, lng: 139.7967 },
  },
  雷門: {
    area: "東京",
    rating: "4.5",
    reason: "淺草地標入口，適合拍照打卡",
    reviewsCount: 121,
    tags: ["地標", "文化"],
    position: { lat: 35.7119, lng: 139.7964 },
  },
  晴空塔: {
    area: "東京",
    rating: "4.6",
    reason: "高空夜景視野佳",
    reviewsCount: 906,
    tags: ["夜景", "地標"],
    position: { lat: 35.71, lng: 139.81 },
  },
  明治神宮: {
    area: "東京",
    rating: "4.6",
    reason: "市中心大型神社，動線好安排",
    reviewsCount: 377,
    tags: ["神社", "散步"],
    position: { lat: 35.6764, lng: 139.6993 },
  },
  澀谷: {
    area: "東京",
    rating: "4.4",
    reason: "購物與美食集中區域",
    reviewsCount: 664,
    tags: ["逛街", "美食"],
    position: { lat: 35.6595, lng: 139.7005 },
  },
  新宿都廳: {
    area: "東京",
    rating: "4.4",
    reason: "免費觀景台，夜景熱門點",
    reviewsCount: 243,
    tags: ["夜景", "觀景台"],
    position: { lat: 35.6896, lng: 139.6917 },
  },
  鶴岡八幡宮: {
    area: "鎌倉",
    rating: "4.5",
    reason: "鎌倉代表性神社",
    reviewsCount: 194,
    tags: ["神社", "歷史"],
    position: { lat: 35.3258, lng: 139.5568 },
  },
  江之島: {
    area: "神奈川",
    rating: "4.4",
    reason: "海景與步道兼具",
    reviewsCount: 356,
    tags: ["海景", "散步"],
    position: { lat: 35.2997, lng: 139.4806 },
  },
  上野公園: {
    area: "東京",
    rating: "4.4",
    reason: "博物館與公園集中，雨天也好安排",
    reviewsCount: 248,
    tags: ["公園", "博物館"],
    position: { lat: 35.7148, lng: 139.7745 },
  },
  阿美橫町: {
    area: "東京",
    rating: "4.2",
    reason: "購物與小吃密集商圈",
    reviewsCount: 88,
    tags: ["購物", "美食"],
    position: { lat: 35.708, lng: 139.7744 },
  },
};

function normalizeSpotName(name) {
  return String(name || "").replace(/[：:、，。．\s]/g, "").trim();
}

function scoreFromName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  const rating = 4.0 + (hash % 9) * 0.1; // 4.0 - 4.8
  return rating.toFixed(1);
}

function reviewCountFromName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 131 + name.charCodeAt(i)) >>> 0;
  }
  return 15 + (hash % 220);
}

function extractContextSentence(name, sourceText) {
  if (!sourceText) {
    return "";
  }
  const index = sourceText.indexOf(name);
  if (index < 0) {
    return "";
  }

  let left = Math.max(0, index - 50);
  let right = Math.min(sourceText.length, index + name.length + 50);

  const leftStop = sourceText.lastIndexOf("。", index);
  if (leftStop >= 0) {
    left = leftStop + 1;
  }

  const nextStops = [sourceText.indexOf("。", index), sourceText.indexOf("\n", index)].filter((p) => p >= 0);
  if (nextStops.length > 0) {
    right = Math.min(...nextStops) + 1;
  }

  return sourceText.slice(left, right).replace(/\s+/g, " ").trim();
}

function inferAreaFromText(text) {
  if (!text) {
    return "日本";
  }
  const areaCandidates = ["東京", "京都", "大阪", "鎌倉", "神奈川", "北海道", "福岡", "沖繩"];
  const found = areaCandidates.find((area) => text.includes(area));
  return found || "日本";
}

function inferTagsFromText(text) {
  const rules = [
    { keyword: "夜景", tag: "夜景" },
    { keyword: "神社", tag: "神社" },
    { keyword: "寺", tag: "文化" },
    { keyword: "公園", tag: "公園" },
    { keyword: "美食", tag: "美食" },
    { keyword: "逛", tag: "逛街" },
    { keyword: "海", tag: "海景" },
  ];
  const tags = rules.filter((rule) => text.includes(rule.keyword)).map((rule) => rule.tag);
  return tags.length > 0 ? dedupe(tags).slice(0, 2) : ["RAG", "待補資料"];
}

function dedupe(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
  }
  return result;
}

function fallbackPosition(name, index) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  const lat = 35.6 + ((hash % 3000) / 10000) + index * 0.01;
  const lng = 139.5 + (((hash >> 3) % 3000) / 10000) + index * 0.01;
  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
  };
}

function toSpotFromBackend(name, index, sourceText, backendSpot) {
  const cleanedName = normalizeSpotName(name);
  const aliases = {
    東京晴空塔: "晴空塔",
    東京鐵塔: "晴空塔",
    明治神宮外苑: "明治神宮",
    上野動物園: "上野公園",
  };
  const normalizedName = aliases[cleanedName] || cleanedName;

  const catalogEntry =
    spotCatalog[normalizedName] ||
    Object.entries(spotCatalog).find(([key]) => normalizedName.includes(key) || key.includes(normalizedName))?.[1] ||
    null;

  if (catalogEntry) {
    const reviewsCount = Number(backendSpot?.reviews_count ?? catalogEntry.reviewsCount ?? reviewCountFromName(normalizedName));
    return {
      name: normalizedName,
      ...catalogEntry,
      reason: backendSpot?.source_excerpt
        ? `攻略提及：${backendSpot.source_excerpt}`
        : catalogEntry.reason,
      source: backendSpot?.xai || `RAG 萃取 #${index + 1}`,
      sourceExcerpt: backendSpot?.source_excerpt || "",
      sourceChunkIndex: backendSpot?.source_chunk_index || 0,
      reviewsCount,
      dataInsufficient: reviewsCount < 50 || Boolean(backendSpot?.is_data_insufficient),
    };
  }

  const contextSentence = backendSpot?.source_excerpt || extractContextSentence(normalizedName, sourceText);
  const reason = contextSentence
    ? `攻略提及：${contextSentence}`
    : "由 RAG 從攻略文字萃取，建議納入候選行程。";
  const reviewsCount = Number(backendSpot?.reviews_count ?? reviewCountFromName(normalizedName));

  return {
    name: normalizedName,
    area: inferAreaFromText(contextSentence || sourceText),
    rating: scoreFromName(normalizedName),
    reason,
    tags: inferTagsFromText(contextSentence || sourceText),
    position: fallbackPosition(normalizedName, index),
    source: backendSpot?.xai || `RAG 萃取 #${index + 1}`,
    sourceExcerpt: backendSpot?.source_excerpt || "",
    sourceChunkIndex: backendSpot?.source_chunk_index || 0,
    reviewsCount,
    dataInsufficient: reviewsCount < 50 || Boolean(backendSpot?.is_data_insufficient),
  };
}

export default function MapPlanningPage() {
  const [guideInput, setGuideInput] = useState(defaultGuideText);
  const [guideUrl, setGuideUrl] = useState("");
  const [spots, setSpots] = useState([]);
  const [itineraryGroups, setItineraryGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("all");
  const [itinerarySpots, setItinerarySpots] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [statusText, setStatusText] = useState("貼上攻略文字或輸入 URL，按「驗證萃取景點」呼叫後端 RAG API。");
  const [lastRunAt, setLastRunAt] = useState("-");
  const [selectedSpotName, setSelectedSpotName] = useState("");
  const [apiMeta, setApiMeta] = useState({
    provider: "ollama",
    embedModel: "-",
    genModel: "-",
    inputSource: "-",
    warning: "",
  });

  const selectedGroup = useMemo(
    () => itineraryGroups.find((group) => group.group_id === selectedGroupId) || null,
    [itineraryGroups, selectedGroupId]
  );

  const visibleSpots = useMemo(() => {
    if (!selectedGroup || selectedGroupId === "all") {
      return spots;
    }
    const allowedNames = new Set((selectedGroup.spot_names || []).map((name) => normalizeSpotName(name)));
    return spots.filter((spot) => allowedNames.has(normalizeSpotName(spot.name)));
  }, [spots, selectedGroup, selectedGroupId]);

  const selectedSpot = useMemo(
    () => visibleSpots.find((spot) => spot.name === selectedSpotName) || visibleSpots[0],
    [visibleSpots, selectedSpotName]
  );

  async function handleExtract() {
    const text = guideInput.trim();
    const url = guideUrl.trim();
    if (!text && !url) {
      setStatusText("請先貼上攻略文字，或輸入攻略 URL。");
      setSpots([]);
      setSelectedSpotName("");
      return;
    }

    setIsExtracting(true);
    setStatusText("RAG 驗證中：呼叫 API -> 向量化 -> 檢索 -> 萃取景點...");

    try {
      const response = await fetch(`${ragApiBaseUrl}/api/rag/extract`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          url,
          query: "請列出文章中的旅遊景點名稱",
          top_k: 4,
          reset_db: false,
        }),
      });

      if (!response.ok) {
        let message = `API error (${response.status})`;
        try {
          const errorPayload = await response.json();
          message = errorPayload.detail || message;
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(message);
      }

      const payload = await response.json();
      const names = dedupe((payload.spot_names || []).map((item) => normalizeSpotName(item)));
      const backendSpotMap = new Map(
        (payload.spots || []).map((item) => [normalizeSpotName(item.name), item])
      );
      const sourceTextForFallback = text || (payload.spots || []).map((item) => item.source_text || "").join("\n");
      const nextSpots = names.map((name, index) =>
        toSpotFromBackend(name, index, sourceTextForFallback, backendSpotMap.get(normalizeSpotName(name)))
      );
      const nextGroups = (payload.itinerary_groups || [])
        .map((group, index) => ({
          group_id: group.group_id || `group-${index + 1}`,
          title: group.title || `行程 ${index + 1}`,
          spot_names: dedupe((group.spot_names || []).map((name) => normalizeSpotName(name))),
          spot_count: Number(group.spot_count || (group.spot_names || []).length || 0),
        }))
        .filter((group) => group.spot_names.length > 0);

      setSpots(nextSpots);
      setItineraryGroups(nextGroups);
      setSelectedGroupId(nextGroups[0]?.group_id || "all");
      setSelectedSpotName(nextSpots[0]?.name || "");
      setItinerarySpots([]);
      setApiMeta({
        provider: payload.provider || "ollama",
        embedModel: payload.embed_model || "-",
        genModel: payload.gen_model || "-",
        inputSource: payload.input_source || "-",
        warning: payload.generation_warning || "",
      });

      if (nextSpots.length === 0) {
        setStatusText("RAG 已執行，但沒有萃取到景點名稱。");
      } else {
        setStatusText(
          nextGroups.length > 1
            ? `驗證成功：已萃取 ${nextSpots.length} 個景點，並分成 ${nextGroups.length} 組行程。`
            : `驗證成功：已萃取 ${nextSpots.length} 個景點，可逐一加入右側行程。`
        );
      }

      setLastRunAt(
        new Date().toLocaleTimeString("zh-TW", {
          hour12: false,
        })
      );
    } catch (error) {
      setStatusText(`RAG API 呼叫失敗：${error.message}`);
      setApiMeta({
        provider: "ollama",
        embedModel: "-",
        genModel: "-",
        inputSource: "-",
        warning: "",
      });
      setItineraryGroups([]);
      setSelectedGroupId("all");
    } finally {
      setIsExtracting(false);
    }
  }

  function handleFillSample() {
    setGuideInput(defaultGuideText);
    setGuideUrl("");
    setStatusText("已帶入範例攻略，按「驗證萃取景點」即可測試。");
  }

  function handleClear() {
    setGuideInput("");
    setGuideUrl("");
    setSpots([]);
    setItineraryGroups([]);
    setSelectedGroupId("all");
    setItinerarySpots([]);
    setSelectedSpotName("");
    setApiMeta({
      provider: "ollama",
      embedModel: "-",
      genModel: "-",
      inputSource: "-",
      warning: "",
    });
    setLastRunAt("-");
    setStatusText("已清空輸入與輸出。");
  }

  function handleAddToItinerary(spot) {
    setItinerarySpots((prev) => {
      if (prev.some((item) => item.name === spot.name)) {
        return prev;
      }
      return [...prev, spot];
    });
    setSelectedSpotName(spot.name);
  }

  function handleRemoveFromItinerary(spotName) {
    setItinerarySpots((prev) => prev.filter((spot) => spot.name !== spotName));
  }

  function handleAddAllToItinerary() {
    setItinerarySpots(visibleSpots);
    if (visibleSpots[0]) {
      setSelectedSpotName(visibleSpots[0].name);
    }
  }

  function handleClearItinerary() {
    setItinerarySpots([]);
  }

  return (
    <main className="layout">
      <section className="layout__intro">
        <h1>日本旅遊行程規劃</h1>
        <p>貼入攻略文字後直接呼叫後端 RAG，驗證能否萃取景點名稱並映射到地圖。</p>
      </section>

      <section className="layout__content">
        <aside className="left-panel">
          <Card>
            <CardHeader>
              <CardTitle>RAG 輸入區（已串接後端）</CardTitle>
              <CardDescription>API Endpoint: {ragApiBaseUrl}/api/rag/extract</CardDescription>
            </CardHeader>
            <CardContent>
              <label className="field-label" htmlFor="guide-input">
                貼上旅遊攻略文字（或下方輸入 URL）
              </label>
              <textarea
                id="guide-input"
                className="field-textarea"
                placeholder="貼上完整攻略文章..."
                rows={8}
                value={guideInput}
                onChange={(event) => setGuideInput(event.target.value)}
              />
              <label className="field-label" htmlFor="guide-url">
                攻略 URL（可選）
              </label>
              <input
                id="guide-url"
                className="field-input"
                placeholder="https://example.com/japan-guide"
                value={guideUrl}
                onChange={(event) => setGuideUrl(event.target.value)}
              />
              <div className="badge-row">
                <Badge variant="info">RAG: API Mode</Badge>
                <Badge variant={isExtracting ? "warning" : "success"}>
                  {isExtracting ? "分析中" : "待命中"}
                </Badge>
              </div>
              <p className="status-line">{statusText}</p>
            </CardContent>
            <CardFooter>
              <Button onClick={handleExtract} disabled={isExtracting}>
                {isExtracting ? "驗證中..." : "驗證萃取景點"}
              </Button>
              <Button variant="secondary" onClick={handleClear} disabled={isExtracting}>
                清空內容
              </Button>
              <Button variant="ghost" onClick={handleFillSample} disabled={isExtracting}>
                帶入範例
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>萃取結果</CardTitle>
              <CardDescription>點擊景點卡可同步右側地圖焦點</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="result-meta">
                <Badge>最後執行：{lastRunAt}</Badge>
                <Badge variant="info">景點數：{spots.length}</Badge>
                <Badge variant="info">分組：{itineraryGroups.length || "-"}</Badge>
                <Badge variant="success">目前 provider：{apiMeta.provider}</Badge>
                <Badge variant="info">來源：{apiMeta.inputSource}</Badge>
                <Badge variant="neutral">Embed: {apiMeta.embedModel}</Badge>
                <Badge variant="neutral">Gen: {apiMeta.genModel}</Badge>
              </div>
              {apiMeta.warning ? <p className="status-line">{apiMeta.warning}</p> : null}
              {spots.length === 0 ? (
                <p className="empty-state">尚無景點結果，請先執行驗證。</p>
              ) : (
                <>
                  {itineraryGroups.length > 0 ? (
                    <div className="group-filter">
                      <label className="field-label" htmlFor="group-select">
                        行程分組檢視
                      </label>
                      <select
                        id="group-select"
                        className="field-select"
                        value={selectedGroupId}
                        onChange={(event) => setSelectedGroupId(event.target.value)}
                      >
                        <option value="all">全部景點（不分組）</option>
                        {itineraryGroups.map((group) => (
                          <option key={group.group_id} value={group.group_id}>
                            {group.title}（{group.spot_count}）
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  <ul className="spot-list">
                    {visibleSpots.map((spot) => (
                      <li
                        className={`spot-item ${selectedSpot?.name === spot.name ? "spot-item--active" : ""}`}
                        key={`${spot.name}-${spot.source}`}
                        onClick={() => setSelectedSpotName(spot.name)}
                      >
                        <div className="spot-item__head">
                          <strong>{spot.name}</strong>
                          <div className="spot-item__head-badges">
                            <Badge variant="success">★ {spot.rating}</Badge>
                            {spot.dataInsufficient ? (
                              <Badge variant="warning">資料較少（{spot.reviewsCount}）</Badge>
                            ) : (
                              <Badge variant="info">評論 {spot.reviewsCount}</Badge>
                            )}
                          </div>
                        </div>
                        <p>{spot.reason}</p>
                        <p className="spot-item__source">來源：{spot.source}</p>
                        {spot.sourceExcerpt ? <p className="spot-item__excerpt">片段：{spot.sourceExcerpt}</p> : null}
                        <div className="tag-row">
                          <Badge>{spot.area}</Badge>
                          {spot.tags.map((tag) => (
                            <Tag key={`${spot.name}-${tag}`}>{tag}</Tag>
                          ))}
                        </div>
                        <div className="spot-item__actions">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleAddToItinerary(spot);
                            }}
                          >
                            加入行程
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {visibleSpots.length === 0 ? (
                    <p className="empty-state">此分組目前沒有可顯示的景點。</p>
                  ) : null}
                </>
              )}
            </CardContent>
            <CardFooter>
              <Button
                variant="secondary"
                onClick={handleAddAllToItinerary}
                disabled={visibleSpots.length === 0 || isExtracting}
              >
                全部加入行程
              </Button>
              <Button variant="ghost" onClick={handleClearItinerary} disabled={itinerarySpots.length === 0}>
                清空行程
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>我的行程（Week 3）</CardTitle>
              <CardDescription>加入至少 2 個景點即可在地圖顯示建議路線</CardDescription>
            </CardHeader>
            <CardContent>
              {itinerarySpots.length === 0 ? (
                <p className="empty-state">尚未加入景點。</p>
              ) : (
                <ol className="itinerary-list">
                  {itinerarySpots.map((spot, index) => (
                    <li key={`itinerary-${spot.name}`} className="itinerary-item">
                      <div className="itinerary-item__head">
                        <strong>
                          {index + 1}. {spot.name}
                        </strong>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveFromItinerary(spot.name)}
                        >
                          移除
                        </Button>
                      </div>
                      <p className="spot-item__source">{spot.source}</p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </aside>

        <section className="map-panel">
          <Card className="map-card">
            <CardHeader>
              <CardTitle>Google Maps（景點驗證）</CardTitle>
              <CardDescription>RAG 萃取出的景點會顯示 marker，點擊 marker 顯示資訊</CardDescription>
            </CardHeader>
            <CardContent>
              <GoogleMapPanel
                apiKey={googleMapsApiKey}
                mapId={googleMapId}
                spots={visibleSpots}
                routeSpots={itinerarySpots}
                selectedSpotName={selectedSpotName}
                onMarkerSelect={setSelectedSpotName}
              />
              <div className="map-status">
                <Badge variant="info">地圖標記：{visibleSpots.length} 個</Badge>
                <Badge variant={itinerarySpots.length >= 2 ? "success" : "warning"}>
                  路線點位：{itinerarySpots.length} 個
                </Badge>
                {selectedSpot ? (
                  <Badge variant="success">焦點景點：{selectedSpot.name}</Badge>
                ) : (
                  <Badge variant="warning">尚未選擇景點</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      </section>
    </main>
  );
}
