import { useEffect, useMemo, useRef, useState } from "react";
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

const defaultGuideText =
  "東京 3 天自由行，第一天淺草寺和晴空塔，第二天去澀谷和明治神宮，最後一天逛上野。";

const baseSpots = [
  {
    name: "淺草寺",
    area: "東京",
    rating: "4.6",
    reason: "歷史街區 + 夜間燈景",
    tags: ["文化", "夜景"],
  },
  {
    name: "伏見稻荷大社",
    area: "京都",
    rating: "4.7",
    reason: "清晨鳥居步道體驗",
    tags: ["神社", "健行"],
  },
  {
    name: "道頓堀",
    area: "大阪",
    rating: "4.4",
    reason: "美食密集，交通方便",
    tags: ["美食", "購物"],
  },
];

const keywordSpots = [
  {
    keyword: "東京",
    spot: {
      name: "明治神宮",
      area: "東京",
      rating: "4.6",
      reason: "市區中的靜謐神社，動線好安排",
      tags: ["神社", "散步"],
    },
  },
  {
    keyword: "京都",
    spot: {
      name: "清水寺",
      area: "京都",
      rating: "4.6",
      reason: "經典古都景點，拍照取景佳",
      tags: ["文化", "古都"],
    },
  },
  {
    keyword: "大阪",
    spot: {
      name: "大阪城公園",
      area: "大阪",
      rating: "4.5",
      reason: "地標景點，適合半日行程",
      tags: ["歷史", "公園"],
    },
  },
  {
    keyword: "上野",
    spot: {
      name: "上野公園",
      area: "東京",
      rating: "4.4",
      reason: "博物館與公園集中，雨天備案好安排",
      tags: ["公園", "博物館"],
    },
  },
  {
    keyword: "美食",
    spot: {
      name: "黑門市場",
      area: "大阪",
      rating: "4.3",
      reason: "小吃密度高，適合安排中餐時段",
      tags: ["美食", "市場"],
    },
  },
];

function buildMockResults(input) {
  const matched = keywordSpots
    .filter((item) => input.includes(item.keyword))
    .map((item) => item.spot);
  const merged = [...matched, ...baseSpots].slice(0, 4);

  return merged.map((spot, index) => ({
    ...spot,
    source: `攻略段落 #${index + 2}`,
  }));
}

export default function MapPlanningPage() {
  const [guideInput, setGuideInput] = useState(defaultGuideText);
  const [spots, setSpots] = useState(buildMockResults(defaultGuideText));
  const [isExtracting, setIsExtracting] = useState(false);
  const [statusText, setStatusText] = useState("已載入範例資料，可直接按「模擬萃取景點」。");
  const [lastRunAt, setLastRunAt] = useState("-");
  const [selectedSpotName, setSelectedSpotName] = useState("");
  const timerRef = useRef(null);

  const selectedSpot = useMemo(
    () => spots.find((spot) => spot.name === selectedSpotName) || spots[0],
    [spots, selectedSpotName]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  function handleExtract() {
    const trimmed = guideInput.trim();
    if (!trimmed) {
      setSpots([]);
      setSelectedSpotName("");
      setStatusText("請先輸入旅遊攻略文字或網址。");
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setIsExtracting(true);
    setStatusText("模擬分析中（Embedding -> Retrieval -> Spot Extraction）...");

    timerRef.current = setTimeout(() => {
      const nextSpots = buildMockResults(trimmed);
      setSpots(nextSpots);
      setSelectedSpotName(nextSpots[0]?.name || "");
      setIsExtracting(false);
      setStatusText(`完成：已萃取 ${nextSpots.length} 個景點。`);
      setLastRunAt(
        new Date().toLocaleTimeString("zh-TW", {
          hour12: false,
        })
      );
    }, 1200);
  }

  function handleClear() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setGuideInput("");
    setSpots([]);
    setSelectedSpotName("");
    setIsExtracting(false);
    setStatusText("已清空輸入與輸出。");
    setLastRunAt("-");
  }

  function handleFillSample() {
    setGuideInput(defaultGuideText);
    setStatusText("已帶入範例攻略，點擊「模擬萃取景點」即可查看輸出。");
  }

  return (
    <main className="layout">
      <section className="layout__intro">
        <h1>日本旅遊行程規劃</h1>
        <p>可模擬使用者貼文輸入、RAG 假資料萃取、景點結果與地圖標記互動。</p>
      </section>

      <section className="layout__content">
        <aside className="left-panel">
          <Card>
            <CardHeader>
              <CardTitle>RAG 輸入區（模擬）</CardTitle>
              <CardDescription>先用前端假流程展示輸入輸出，Week 2 再接真實 API</CardDescription>
            </CardHeader>
            <CardContent>
              <label className="field-label" htmlFor="guide-input">
                貼上旅遊攻略文字或網址
              </label>
              <textarea
                id="guide-input"
                className="field-textarea"
                placeholder="例：東京 5 天自由行攻略..."
                rows={6}
                value={guideInput}
                onChange={(event) => setGuideInput(event.target.value)}
              />
              <div className="badge-row">
                <Badge variant="info">RAG: Mock Mode</Badge>
                <Badge variant={isExtracting ? "warning" : "success"}>
                  {isExtracting ? "分析中" : "待命中"}
                </Badge>
              </div>
              <p className="status-line">{statusText}</p>
            </CardContent>
            <CardFooter>
              <Button onClick={handleExtract} disabled={isExtracting}>
                {isExtracting ? "分析中..." : "模擬萃取景點"}
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
              <CardTitle>推薦景點輸出（模擬）</CardTitle>
              <CardDescription>點擊景點卡可切換右側地圖焦點</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="result-meta">
                <Badge>最後執行：{lastRunAt}</Badge>
                <Badge variant="info">輸出筆數：{spots.length}</Badge>
              </div>
              {spots.length === 0 ? (
                <p className="empty-state">尚無輸出，請先輸入攻略並執行模擬萃取。</p>
              ) : (
                <ul className="spot-list">
                  {spots.map((spot) => (
                    <li
                      className={`spot-item ${selectedSpot?.name === spot.name ? "spot-item--active" : ""}`}
                      key={`${spot.name}-${spot.source}`}
                      onClick={() => setSelectedSpotName(spot.name)}
                    >
                      <div className="spot-item__head">
                        <strong>{spot.name}</strong>
                        <Badge variant="success">★ {spot.rating}</Badge>
                      </div>
                      <p>{spot.reason}</p>
                      <p className="spot-item__source">來源：{spot.source}</p>
                      <div className="tag-row">
                        <Badge>{spot.area}</Badge>
                        {spot.tags.map((tag) => (
                          <Tag key={`${spot.name}-${tag}`}>{tag}</Tag>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </aside>

        <section className="map-panel">
          <Card className="map-card">
            <CardHeader>
              <CardTitle>地圖區塊（Google Maps Placeholder）</CardTitle>
              <CardDescription>目前為互動假地圖，Week 2 直接替換成 Google Maps 元件</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="map-placeholder">
                <div className="map-grid" />
                <div className="map-marker-layer" aria-hidden="true">
                  {spots.map((spot, index) => {
                    const left = 18 + (index % 2) * 36 + index * 9;
                    const top = 22 + index * 16;
                    const isActive = selectedSpot?.name === spot.name;
                    return (
                      <button
                        className={`map-marker ${isActive ? "map-marker--active" : ""}`}
                        key={`marker-${spot.name}`}
                        onClick={() => setSelectedSpotName(spot.name)}
                        style={{ left: `${left}%`, top: `${top}%` }}
                        type="button"
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
                <p>Google Maps Embed Area</p>
              </div>
              <div className="map-status">
                <Badge variant="info">模擬標記：{spots.length} 個</Badge>
                {selectedSpot ? (
                  <Badge variant="success">焦點景點：{selectedSpot.name}</Badge>
                ) : (
                  <Badge variant="warning">尚未選擇景點</Badge>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="ghost">路線最佳化（Week 3）</Button>
            </CardFooter>
          </Card>
        </section>
      </section>
    </main>
  );
}

