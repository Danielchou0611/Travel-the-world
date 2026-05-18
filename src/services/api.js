// Occupath v0 — 統一 API client(三服務)
// Wen :8001 行程生成 / Austin :8010 RAG / Django :8000 景點資料

const WEN_API = import.meta.env.VITE_WEN_API || "http://localhost:8001/api";
const AUSTIN_API = import.meta.env.VITE_AUSTIN_API || "http://localhost:8010/api";
const DJANGO_API = import.meta.env.VITE_DJANGO_API || "http://localhost:8000/api";

// ── 共用 ─────────────────────────────────────────
async function jpost(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${url} ${res.status}: ${text}`);
  }
  return res.json();
}

async function jget(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

// ── Wen ver8:行程生成(支援多城市 + 餐廳 + position)──
// 來源:Wen server.py 5/17 update — destination: Union[List[str], str]
export async function generateTrip(prefs) {
  const payload = {
    // 多城市:傳陣列;單城市:傳字串。Wen ver8 兩者都接
    destination: Array.isArray(prefs.destination)
      ? prefs.destination
      : (prefs.destination || "京都"),
    days: prefs.days,
    budget: prefs.budget,
    interests: prefs.interests || [],
    explorationStyle: prefs.explorationStyle ?? 50,
    foodVsAttractions: prefs.foodVsAttractions ?? 50,
    mustVisit: prefs.mustVisit || "",
    ragContent: prefs.ragContent || "",
    specialRequirements: prefs.specialRequirements || "",
  };
  return jpost(`${WEN_API}/generate`, payload);
}

// ── Wen:對話式修改 ──────────────────────────────
export async function modifyTrip({ destination, current_itinerary, user_request }) {
  return jpost(`${WEN_API}/modify`, { destination, current_itinerary, user_request });
}

// ── Austin:RAG 攻略萃取 ─────────────────────────
export async function extractFromGuide({ text, url }) {
  return jpost(`${AUSTIN_API}/rag/extract`, { text, url });
}

// ── Django:景點清單 + metadata ─────────────────
export async function listPOIs({ region, category, search, interests } = {}) {
  const qs = new URLSearchParams();
  if (region) qs.set("region", region);
  if (category) qs.set("category", category);
  if (search) qs.set("search", search);
  if (interests) qs.set("interests", interests);
  return jget(`${DJANGO_API}/pois/?${qs}`);
}

export async function getMetadata() {
  return jget(`${DJANGO_API}/metadata/`);
}

// ── Django 5/17:餐廳清單(李冠霖 19萬筆)─────────
export async function listRestaurants({ region, category, venue_type, search } = {}) {
  const qs = new URLSearchParams();
  if (region) qs.set("region", region);
  if (category) qs.set("category", category);
  if (venue_type) qs.set("venue_type", venue_type);
  if (search) qs.set("search", search);
  return jget(`${DJANGO_API}/restaurants/?${qs}`);
}

export async function getRestaurantMetadata() {
  return jget(`${DJANGO_API}/restaurants/metadata/`);
}

// 帶座標 + 半徑的餐廳推薦(找景點附近的餐廳)
export async function recommendRestaurants({ lat, lng, radius_m = 500, region, category, limit = 10 } = {}) {
  return jpost(`${DJANGO_API}/restaurants/recommendations/`, {
    lat, lng, radius_m, region, category, limit,
  });
}

// ── 本機 fallback:Wen / Austin / Django 全斷時用 ──
// schema 對齊 Wen ver8 真實回傳(含 position{lat,lng}、可選 color 移除)
export const MOCK_TRIP_FALLBACK = {
  id: "mock-trip-001",
  preferences: {
    destination: "京都",
    days: 3, budget: 30000, interests: ["文化", "美食"],
    explorationStyle: 60, foodVsAttractions: 40,
    mustVisit: "清水寺", ragContent: "", specialRequirements: "",
  },
  summary: { totalDays: 3, totalBudget: "NT$ 30,000", totalAttractions: 6, avgPerDay: 2 },
  days: [
    {
      day: 1, date: "5/20 (二)",
      attractions: [
        {
          id: "a01", name: "伏見稻荷大社", nameEn: "Fushimi Inari Taisha",
          category: "景點",
          description: "千本鳥居是京都最具代表性的景點,沿著山坡蜿蜒的朱紅鳥居在晨光中格外壯觀。",
          image: "https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=400&h=300&fit=crop",
          duration: "2–3 小時", rating: 4.8, estimatedCost: "免費", location: "京都・伏見区",
          position: { lat: 34.9671, lng: 135.7727 },
          baseScore: 92, foodScore: 10, explorationScore: 85,
          xai: {
            summary: "與您的文化興趣高度匹配。",
            scores: [
              { label: "文化符合度", value: 95, color: "#1B3A5C" },
              { label: "評分熱度", value: 88, color: "#BC4630" },
              { label: "探索指數", value: 72, color: "#D4A574" },
            ],
            matchedInterests: ["文化"],
          },
        },
        {
          id: "a02", name: "錦市場", nameEn: "Nishiki Market",
          category: "美食",
          description: "京都的廚房,百年市場,湯豆腐、京漬物、抹茶甜點。",
          image: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=300&fit=crop",
          duration: "1–2 小時", rating: 4.6, estimatedCost: "¥1,000-3,000", location: "京都・中京区",
          position: { lat: 35.0048, lng: 135.7654 },
          baseScore: 85, foodScore: 95, explorationScore: 40,
          xai: {
            summary: "美食興趣首選,京都最重要的飲食文化據點。",
            scores: [
              { label: "美食符合度", value: 95, color: "#BC4630" },
              { label: "文化深度", value: 78, color: "#1B3A5C" },
              { label: "探索指數", value: 42, color: "#D4A574" },
            ],
            matchedInterests: ["美食", "文化"],
          },
        },
      ],
    },
  ],
  generatedAt: new Date().toISOString(),
};

// ── Trip normalizer:把 Wen ver8 真實回傳補上 UI 必要欄位 ───
// Wen 真實回傳缺 baseScore/foodScore/explorationScore/nameEn(rerank 用)
// → 用 rating × 20 當 baseScore,用 category 推 foodScore/explorationScore
export function normalizeTrip(trip) {
  if (!trip?.days) return trip;
  return {
    ...trip,
    days: trip.days.map((d) => ({
      ...d,
      attractions: (d.attractions || []).map((a, idx) => ({
        nameEn: a.nameEn || "",
        baseScore: a.baseScore ?? Math.round((a.rating || 4) * 20),
        foodScore: a.foodScore ?? (a.category === "美食" ? 90 : 30),
        explorationScore: a.explorationScore ?? (a.category === "景點" ? 80 : 40),
        ...a,
        xai: a.xai
          ? {
              summary: a.xai.summary || "",
              matchedInterests: a.xai.matchedInterests || [],
              scores: (a.xai.scores || []).map((s, i) => ({
                color: s.color || ["#1B3A5C", "#BC4630", "#D4A574"][i % 3],
                ...s,
              })),
            }
          : { summary: "", matchedInterests: [], scores: [] },
      })),
    })),
  };
}

// 去重(Apple 5/17 回報 mipig / 京都勝牛重複 3-4 次)
export function dedupeAttractions(trip) {
  if (!trip?.days) return trip;
  const seen = new Set();
  return {
    ...trip,
    days: trip.days.map((d) => ({
      ...d,
      attractions: (d.attractions || []).filter((a) => {
        const key = a.id || a.name;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }),
    })),
  };
}

// ── 即時重排(前端 What-if 滑桿用)─────────────────
// 0.4 baseScore + 0.3 foodWeight + 0.3 explorationWeight
export function rerankAttractions(attractions, { explorationStyle, foodVsAttractions }) {
  const foodWeight = (100 - foodVsAttractions) / 100; // 0=偏景點,100=偏食
  const exploreWeight = explorationStyle / 100;
  return [...attractions].sort((a, b) => {
    const sa = 0.4 * a.baseScore + 0.3 * a.foodScore * foodWeight + 0.3 * a.explorationScore * exploreWeight;
    const sb = 0.4 * b.baseScore + 0.3 * b.foodScore * foodWeight + 0.3 * b.explorationScore * exploreWeight;
    return sb - sa;
  });
}
