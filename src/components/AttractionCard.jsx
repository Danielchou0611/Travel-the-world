import { useState } from "react";

// 簡化版 AttractionCard — 從 Apple branch port 過來
// 完整 XAI ⓘ 展開,使用 ray 色票(prussian/vermillion/ochre)
export default function AttractionCard({ attraction, rank, onMove }) {
  const [showXAI, setShowXAI] = useState(false);
  const a = attraction;

  return (
    <article
      style={{
        display: "grid",
        gridTemplateColumns: "120px 1fr auto",
        gap: 14,
        padding: 14,
        background: "#FFFFFF",
        border: "1px solid rgba(27,58,92,0.12)",
        borderRadius: 12,
        marginBottom: 12,
        boxShadow: "0 1px 3px rgba(15,41,66,0.06)",
        transition: "transform 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 6px 18px rgba(15,41,66,0.12)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(15,41,66,0.06)";
      }}
    >
      {/* image */}
      <div
        style={{
          width: 120, height: 96, borderRadius: 8, overflow: "hidden",
          background: a.image ? `url(${a.image}) center/cover` : "linear-gradient(135deg, var(--washi-warm), var(--ochre))",
        }}
      />

      {/* main */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{
            fontSize: 11, padding: "2px 8px", borderRadius: 999,
            background: "rgba(27,58,92,0.08)", color: "var(--prussian)",
            fontWeight: 600,
          }}>
            #{rank}
          </span>
          <h4 style={{ margin: 0, fontSize: 17, color: "var(--prussian-deep)", fontWeight: 600 }}>{a.name}</h4>
          <span style={{
            fontSize: 10, padding: "2px 6px", borderRadius: 4,
            background: a.category === "美食" ? "rgba(188,70,48,0.12)" : "rgba(27,58,92,0.08)",
            color: a.category === "美食" ? "var(--vermillion)" : "var(--prussian)",
          }}>{a.category}</span>
        </div>
        <p style={{
          margin: "0 0 6px 0", fontSize: 13, color: "var(--sumi-warm)",
          lineHeight: 1.55,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>{a.description}</p>
        <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--mist)" }}>
          <span>⏱ {a.duration}</span>
          <span>⭐ {a.rating}</span>
          <span>💴 {a.estimatedCost}</span>
          <span>📍 {a.location}</span>
        </div>

        {/* XAI 展開 */}
        {showXAI && a.xai && (
          <div style={{
            marginTop: 10, padding: 12, borderRadius: 8,
            background: "var(--washi)",
            borderLeft: "3px solid var(--vermillion)",
          }}>
            <p style={{ margin: "0 0 8px 0", fontSize: 12, color: "var(--sumi-warm)", lineHeight: 1.6 }}>
              {a.xai.summary}
            </p>
            {a.xai.scores?.map((s) => (
              <div key={s.label} style={{ marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--prussian)", marginBottom: 2 }}>
                  <span>{s.label}</span>
                  <span style={{ fontWeight: 600 }}>{s.value}</span>
                </div>
                <div style={{ height: 4, background: "rgba(27,58,92,0.1)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: `${s.value}%`, height: "100%", background: s.color || "var(--prussian)" }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, justifyContent: "flex-start" }}>
        <button
          onClick={() => setShowXAI(!showXAI)}
          aria-label="顯示推薦理由"
          style={{
            width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--prussian)",
            background: showXAI ? "var(--prussian)" : "transparent",
            color: showXAI ? "var(--washi)" : "var(--prussian)",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          ⓘ
        </button>
        {onMove && (
          <>
            <button onClick={() => onMove(-1)} style={btnGhost} aria-label="向上">↑</button>
            <button onClick={() => onMove(1)} style={btnGhost} aria-label="向下">↓</button>
          </>
        )}
      </div>
    </article>
  );
}

const btnGhost = {
  width: 32, height: 24, borderRadius: 4,
  border: "1px solid rgba(27,58,92,0.2)",
  background: "transparent", color: "var(--prussian)",
  fontSize: 12, cursor: "pointer",
};
