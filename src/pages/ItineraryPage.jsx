import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AttractionCard from "../components/AttractionCard";
import ChatBox from "../components/ChatBox";
import { MOCK_TRIP_FALLBACK, rerankAttractions } from "../services/api";

// Apple branch ItineraryPage(631 行 TSX)的精簡 JSX 版
// 保留:Day tab 切換、AttractionCard 列表、What-if 滑桿即時重排、ChatBox 對話修改
// 移除:拖拉編輯、FLIP 動畫、跨天移動(這些 v0 不需要)
export default function ItineraryPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Trip 來源優先序:location.state.trip > sessionStorage > MOCK
  const initialTrip = (() => {
    if (location.state?.trip) return location.state.trip;
    const cached = sessionStorage.getItem("occupath_trip");
    if (cached) try { return JSON.parse(cached); } catch {}
    return MOCK_TRIP_FALLBACK;
  })();

  const [trip, setTrip] = useState(initialTrip);
  const [activeDay, setActiveDay] = useState(0);
  const [explorationStyle, setExplorationStyle] = useState(initialTrip.preferences?.explorationStyle ?? 50);
  const [foodVsAttractions, setFoodVsAttractions] = useState(initialTrip.preferences?.foodVsAttractions ?? 50);

  useEffect(() => {
    sessionStorage.setItem("occupath_trip", JSON.stringify(trip));
  }, [trip]);

  const day = trip.days?.[activeDay];

  // What-if 即時重排
  const rankedAttractions = useMemo(() => {
    if (!day?.attractions) return [];
    return rerankAttractions(day.attractions, { explorationStyle, foodVsAttractions });
  }, [day?.attractions, explorationStyle, foodVsAttractions]);

  if (!trip?.days?.length) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--sumi-warm)" }}>
        <p>還沒有行程資料。請先回到偏好頁產生行程。</p>
        <button onClick={() => navigate("/plan-j")} style={btnPrimary}>← 回到偏好頁</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--washi)", paddingBottom: 80 }}>
      {/* Header */}
      <header style={header}>
        <button onClick={() => navigate(-1)} style={btnGhost}>← 返回</button>
        <h2 style={{ margin: 0, color: "var(--prussian-deep)", fontSize: 20, fontWeight: 600 }}>
          {trip.preferences?.destination || "京都"} · {trip.summary?.totalDays || trip.days.length} 天行程
        </h2>
        <div style={{ fontSize: 12, color: "var(--mist)" }}>
          ID: {trip.id?.slice(0, 12) || "—"}
        </div>
      </header>

      {/* Body 兩欄:行程 + ChatBox */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 380px",
        gap: 24,
        maxWidth: 1280, margin: "0 auto", padding: "20px 24px",
      }}>
        <div>
          {/* Day tabs */}
          <div style={dayTabs}>
            {trip.days.map((d, i) => (
              <button
                key={d.day || i}
                onClick={() => setActiveDay(i)}
                style={{
                  ...dayTabBtn,
                  background: activeDay === i ? "var(--prussian)" : "transparent",
                  color: activeDay === i ? "var(--washi)" : "var(--prussian)",
                  borderColor: activeDay === i ? "var(--prussian)" : "rgba(27,58,92,0.2)",
                }}
              >
                D{d.day || i + 1}
                <span style={{ fontSize: 10, opacity: 0.8, marginLeft: 6 }}>{d.date}</span>
              </button>
            ))}
          </div>

          {/* Day warning */}
          {day?.warning && (
            <div style={{
              padding: "10px 14px", marginBottom: 12,
              background: "rgba(212,165,116,0.15)", borderLeft: "3px solid var(--ochre)",
              fontSize: 13, color: "var(--prussian-deep)", borderRadius: 6,
            }}>⚠ {day.warning}</div>
          )}

          {/* What-if 滑桿 */}
          <div style={whatIfBox}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--prussian-deep)", marginBottom: 10 }}>
              What-if · 即時重排
            </div>
            <SliderRow
              label="輕鬆 ↔ 探索"
              value={explorationStyle}
              onChange={setExplorationStyle}
            />
            <SliderRow
              label="美食 ↔ 景點"
              value={foodVsAttractions}
              onChange={setFoodVsAttractions}
            />
          </div>

          {/* Attraction list */}
          <div style={{ marginTop: 16 }}>
            {rankedAttractions.map((a, idx) => (
              <AttractionCard key={a.id} attraction={a} rank={idx + 1} />
            ))}
          </div>
        </div>

        {/* ChatBox */}
        <aside>
          <ChatBox trip={trip} onTripUpdate={setTrip} />
        </aside>
      </div>
    </div>
  );
}

function SliderRow({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--sumi-warm)", marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ fontWeight: 600, color: "var(--vermillion)" }}>{value}</span>
      </div>
      <input
        type="range" min="0" max="100" value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "var(--prussian)" }}
      />
    </div>
  );
}

const header = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "16px 24px",
  background: "#FFFFFF",
  borderBottom: "1px solid rgba(27,58,92,0.08)",
};

const dayTabs = {
  display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap",
};

const dayTabBtn = {
  padding: "8px 14px", fontSize: 13, fontWeight: 600,
  border: "1px solid", borderRadius: 8, cursor: "pointer",
  transition: "all 0.15s",
};

const whatIfBox = {
  padding: 14,
  background: "#FFFFFF",
  border: "1px solid rgba(27,58,92,0.12)",
  borderRadius: 12,
};

const btnPrimary = {
  padding: "10px 20px", fontSize: 14, fontWeight: 600,
  background: "var(--prussian)", color: "var(--washi)",
  border: "none", borderRadius: 8, cursor: "pointer",
};

const btnGhost = {
  padding: "6px 12px", fontSize: 13,
  background: "transparent", color: "var(--prussian)",
  border: "1px solid rgba(27,58,92,0.2)", borderRadius: 6, cursor: "pointer",
};
