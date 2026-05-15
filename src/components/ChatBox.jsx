import { useState, useRef, useEffect } from "react";
import { modifyTrip } from "../services/api";

// 對話式修改 — POST :8001/api/modify
// 從 Apple branch ChatBox.tsx 簡化 port,保留:訊息歷史、輸入、發送、loading 狀態
export default function ChatBox({ trip, onTripUpdate }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: `已為您生成 ${trip?.summary?.totalDays || trip?.days?.length || "?"} 天行程。想調整哪一段?例如「把 D2 的清水寺換成嵐山」` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setLoading(true);
    try {
      const res = await modifyTrip({
        destination: trip?.preferences?.destination || "京都",
        current_itinerary: trip,
        user_request: text,
      });
      const updated = res.itinerary || res.trip || res;
      onTripUpdate?.(updated);
      setMessages((m) => [...m, { role: "assistant", text: res.message || "好的,已為您調整。" }]);
    } catch (err) {
      console.error(err);
      setMessages((m) => [...m, { role: "assistant", text: `⚠️ 修改失敗:${err.message || "後端無回應,請確認 Wen 服務 :8001 是否運作中。"}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={wrap}>
      <div style={header}>
        <span style={{ fontSize: 16, fontWeight: 600, color: "var(--prussian-deep)" }}>對話式調整</span>
        <span style={{ fontSize: 11, color: "var(--mist)" }}>Wen Gemini · localhost:8001</span>
      </div>

      <div ref={scrollRef} style={list}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 8 }}>
            <div style={{
              maxWidth: "85%", padding: "8px 12px", borderRadius: 12,
              background: m.role === "user" ? "var(--prussian)" : "var(--washi-warm)",
              color: m.role === "user" ? "var(--washi)" : "var(--prussian-deep)",
              fontSize: 13, lineHeight: 1.55,
            }}>{m.text}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{
              padding: "8px 12px", borderRadius: 12, background: "var(--washi-warm)",
              color: "var(--mist)", fontSize: 13, fontStyle: "italic",
            }}>
              Gemini 思考中…
            </div>
          </div>
        )}
      </div>

      <div style={inputRow}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="例如:把 D1 第二個景點換成嵐山"
          style={inputStyle}
          disabled={loading}
        />
        <button onClick={send} disabled={loading || !input.trim()} style={sendBtn}>送出</button>
      </div>
    </div>
  );
}

const wrap = {
  display: "flex", flexDirection: "column",
  height: "100%", minHeight: 400, maxHeight: 600,
  background: "#FFFFFF", borderRadius: 12,
  border: "1px solid rgba(27,58,92,0.12)",
  overflow: "hidden",
};

const header = {
  padding: "12px 16px",
  borderBottom: "1px solid rgba(27,58,92,0.08)",
  display: "flex", justifyContent: "space-between", alignItems: "center",
  background: "var(--washi)",
};

const list = {
  flex: 1, overflowY: "auto", padding: 12,
  background: "linear-gradient(180deg, rgba(244,238,226,0.4) 0%, #FFFFFF 100%)",
};

const inputRow = {
  display: "flex", gap: 8, padding: 10,
  borderTop: "1px solid rgba(27,58,92,0.08)",
  background: "#FFFFFF",
};

const inputStyle = {
  flex: 1, padding: "10px 12px", fontSize: 13,
  border: "1px solid rgba(27,58,92,0.2)", borderRadius: 8,
  outline: "none", color: "var(--prussian-deep)",
};

const sendBtn = {
  padding: "10px 18px", fontSize: 13, fontWeight: 600,
  background: "var(--vermillion)", color: "var(--washi)",
  border: "none", borderRadius: 8, cursor: "pointer",
};
