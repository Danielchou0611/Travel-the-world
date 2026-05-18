import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

// 60 秒互動體驗頁 — 訪客不裝後端、不註冊就能感受 XAI 核心
// 5 步:選 J/P → 看 mock 行程 → 點 XAI ⓘ → 拉 What-if 滑桿 → 看 ChatBox 對話 → CTA 進真實產品

const MOCK_SPOTS_J = [
  {
    id: "j01", rank: 1, name: "伏見稻荷大社", category: "景點",
    duration: "2-3 小時", rating: 4.8, cost: "免費",
    description: "千本鳥居蜿蜒於山坡,朱紅鳥居在晨光中格外壯觀。",
    baseScore: 92, foodScore: 10, explorationScore: 85,
    xai: {
      summary: "與您的「文化」興趣高度匹配,京都文化的最高代表。",
      scores: [
        { label: "文化符合度", value: 95, color: "var(--prussian)" },
        { label: "評分熱度", value: 88, color: "var(--vermillion)" },
        { label: "探索指數", value: 72, color: "var(--ochre)" },
      ],
    },
  },
  {
    id: "j02", rank: 2, name: "錦市場", category: "美食",
    duration: "1-2 小時", rating: 4.6, cost: "¥1,000-3,000",
    description: "京都的廚房,百年市場,湯豆腐、京漬物、抹茶甜點。",
    baseScore: 85, foodScore: 95, explorationScore: 40,
    xai: {
      summary: "美食興趣首選,京都最重要的飲食文化據點。",
      scores: [
        { label: "美食符合度", value: 95, color: "var(--vermillion)" },
        { label: "文化深度", value: 78, color: "var(--prussian)" },
        { label: "探索指數", value: 42, color: "var(--ochre)" },
      ],
    },
  },
  {
    id: "j03", rank: 3, name: "嵐山竹林", category: "自然",
    duration: "1-2 小時", rating: 4.7, cost: "免費",
    description: "綠竹參天形成天然走廊,光影流動如電影場景。",
    baseScore: 88, foodScore: 20, explorationScore: 80,
    xai: {
      summary: "自然 + 文化雙重符合,適合放鬆型行程。",
      scores: [
        { label: "自然符合度", value: 92, color: "var(--kohaku)" },
        { label: "氛圍評分", value: 85, color: "var(--prussian)" },
        { label: "人潮指數", value: 60, color: "var(--ochre)" },
      ],
    },
  },
];

// 純算術重排(對齊 ItineraryPage 的 rerankAttractions)
function rerank(spots, { explorationStyle, foodVsAttractions }) {
  const foodWeight = (100 - foodVsAttractions) / 100;
  const exploreWeight = explorationStyle / 100;
  return [...spots].sort((a, b) => {
    const sa = 0.4 * a.baseScore + 0.3 * a.foodScore * foodWeight + 0.3 * a.explorationScore * exploreWeight;
    const sb = 0.4 * b.baseScore + 0.3 * b.foodScore * foodWeight + 0.3 * b.explorationScore * exploreWeight;
    return sb - sa;
  });
}

export default function TourPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0..5
  const [persona, setPersona] = useState(null); // 'j' | 'p'
  const [expandedXAI, setExpandedXAI] = useState(null);
  const [exploreSlider, setExploreSlider] = useState(50);
  const [foodSlider, setFoodSlider] = useState(50);

  const rankedSpots = useMemo(
    () => rerank(MOCK_SPOTS_J, { explorationStyle: exploreSlider, foodVsAttractions: foodSlider }),
    [exploreSlider, foodSlider]
  );

  function next() { setStep((s) => Math.min(s + 1, 5)); }
  function back() { setStep((s) => Math.max(s - 1, 0)); }

  return (
    <div style={page}>
      {/* Top bar: progress + skip */}
      <header style={topbar}>
        <a href="/brand_preview.html" style={brandLink}>← Occupath</a>
        <div style={progressWrap}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ ...progressDot, background: i <= step ? "var(--vermillion)" : "rgba(27,58,92,0.15)" }} />
          ))}
        </div>
        <button onClick={() => navigate("/quiz")} style={skipBtn}>跳過 · 進入產品 →</button>
      </header>

      {/* Step content */}
      <main style={main}>
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.section key="s0" {...slideAnim} style={section}>
              <p style={eyebrow}>—— 60 秒體驗 ——</p>
              <h1 style={titleLarge}>看看 Occupath<br/>怎麼跟其他 AI 不一樣。</h1>
              <p style={subtle}>5 步、不到一分鐘、不需要註冊。</p>
              <button onClick={next} style={ctaPrimary}>開始 →</button>
              <p style={tinyNote}>每一步都是真實互動,不是影片。試完你會明白為什麼「AI 推薦的理由」很重要。</p>
            </motion.section>
          )}

          {step === 1 && (
            <motion.section key="s1" {...slideAnim} style={section}>
              <p style={eyebrow}>STEP 1 / 5</p>
              <h2 style={titleMid}>你規劃旅行的方式是哪一種?</h2>
              <p style={subtle}>不是測 MBTI,只是 Occupath 給你不一樣的介面。</p>
              <div style={personaGrid}>
                <button
                  onClick={() => { setPersona("j"); next(); }}
                  style={{ ...personaCard, borderColor: "var(--prussian)" }}
                >
                  <div style={personaIcon}>🗾</div>
                  <p style={personaTitle}>行程指揮官</p>
                  <p style={personaDesc}>「天數、預算、想去什麼都先說清楚,讓 AI 一次排好」</p>
                  <p style={personaTag}>The Conductor · J 人</p>
                </button>
                <button
                  onClick={() => { setPersona("p"); next(); }}
                  style={{ ...personaCard, borderColor: "var(--vermillion)" }}
                >
                  <div style={personaIcon}>🍃</div>
                  <p style={personaTitle}>隨興探險家</p>
                  <p style={personaDesc}>「看心情慢慢挑,不要時間表,只要一個方向」</p>
                  <p style={personaTag}>The Wanderer · P 人</p>
                </button>
              </div>
              <button onClick={back} style={ctaGhost}>← 上一步</button>
            </motion.section>
          )}

          {step === 2 && (
            <motion.section key="s2" {...slideAnim} style={section}>
              <p style={eyebrow}>STEP 2 / 5 · 假設你給了我們以下偏好</p>
              <h2 style={titleMid}>這是 AI 生成的京都 1 日行程。</h2>
              <div style={mockPrefsBar}>
                <span><b>3 天</b> · 京都</span>
                <span><b>30,000 TWD</b></span>
                <span>興趣:<b>文化 · 美食</b></span>
                <span>偏好:輕鬆探索</span>
              </div>
              <div style={spotList}>
                {MOCK_SPOTS_J.map((spot) => (
                  <article key={spot.id} style={spotCard}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                      <span style={rankBadge}>#{spot.rank}</span>
                      <h3 style={spotName}>{spot.name}</h3>
                      <span style={{ ...categoryTag, background: spot.category === "美食" ? "rgba(188,70,48,0.12)" : "rgba(27,58,92,0.08)", color: spot.category === "美食" ? "var(--vermillion)" : "var(--prussian)" }}>
                        {spot.category}
                      </span>
                    </div>
                    <p style={spotDesc}>{spot.description}</p>
                    <div style={spotMeta}>
                      <span>⏱ {spot.duration}</span>
                      <span>⭐ {spot.rating}</span>
                      <span>💴 {spot.cost}</span>
                    </div>
                  </article>
                ))}
              </div>
              <p style={tinyNote}>看起來不錯,對吧?但你會信任這個推薦嗎?你知道為什麼是這 3 個地方,而不是其他 30,000 個景點嗎?</p>
              <div style={ctaRow}>
                <button onClick={back} style={ctaGhost}>← 上一步</button>
                <button onClick={next} style={ctaPrimary}>看 AI 如何解釋自己 →</button>
              </div>
            </motion.section>
          )}

          {step === 3 && (
            <motion.section key="s3" {...slideAnim} style={section}>
              <p style={eyebrow}>STEP 3 / 5 · 點任一個 ⓘ</p>
              <h2 style={titleMid}>每個推薦,都告訴你「為什麼」。</h2>
              <p style={subtle}>這是 Occupath 跟 ChatGPT / Klook 最大的差別。點開 ⓘ 看 4 個推薦因子的分數分解。</p>
              <div style={spotList}>
                {MOCK_SPOTS_J.map((spot) => (
                  <article key={spot.id} style={spotCard}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                      <span style={rankBadge}>#{spot.rank}</span>
                      <h3 style={spotName}>{spot.name}</h3>
                      <button
                        onClick={() => setExpandedXAI(expandedXAI === spot.id ? null : spot.id)}
                        style={{ ...xaiButton, background: expandedXAI === spot.id ? "var(--prussian)" : "transparent", color: expandedXAI === spot.id ? "var(--washi)" : "var(--prussian)" }}
                        aria-label="顯示推薦理由"
                      >
                        ⓘ
                      </button>
                    </div>
                    <p style={spotDesc}>{spot.description}</p>
                    <AnimatePresence>
                      {expandedXAI === spot.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                          style={{ overflow: "hidden" }}
                        >
                          <div style={xaiBox}>
                            <p style={xaiSummary}>{spot.xai.summary}</p>
                            {spot.xai.scores.map((s) => (
                              <div key={s.label} style={{ marginBottom: 8 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--prussian)", marginBottom: 3 }}>
                                  <span>{s.label}</span>
                                  <span style={{ fontWeight: 700 }}>{s.value}</span>
                                </div>
                                <div style={{ height: 5, background: "rgba(27,58,92,0.08)", borderRadius: 3, overflow: "hidden" }}>
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${s.value}%` }}
                                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                                    style={{ height: "100%", background: s.color }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </article>
                ))}
              </div>
              <p style={tinyNote}>沒有黑盒子。你可以同意 AI 的推薦,也可以說「我不在乎評分熱度」然後改順序。下一步試試看 →</p>
              <div style={ctaRow}>
                <button onClick={back} style={ctaGhost}>← 上一步</button>
                <button onClick={next} style={ctaPrimary}>試試 What-if 即時重排 →</button>
              </div>
            </motion.section>
          )}

          {step === 4 && (
            <motion.section key="s4" {...slideAnim} style={section}>
              <p style={eyebrow}>STEP 4 / 5 · 拉滑桿試試</p>
              <h2 style={titleMid}>改變偏好,景點即時重排。</h2>
              <p style={subtle}>不打 LLM、純前端算術。0.3 秒內,順序就會變。</p>
              <div style={sliderBox}>
                <div style={{ marginBottom: 14 }}>
                  <div style={sliderLabel}><span>輕鬆 ↔ 探索</span><span style={sliderValue}>{exploreSlider}</span></div>
                  <input type="range" min="0" max="100" value={exploreSlider} onChange={(e) => setExploreSlider(Number(e.target.value))} style={sliderInput} />
                </div>
                <div>
                  <div style={sliderLabel}><span>美食 ↔ 景點</span><span style={sliderValue}>{foodSlider}</span></div>
                  <input type="range" min="0" max="100" value={foodSlider} onChange={(e) => setFoodSlider(Number(e.target.value))} style={sliderInput} />
                </div>
              </div>
              <div style={spotList}>
                {rankedSpots.map((spot, idx) => (
                  <motion.article
                    key={spot.id}
                    layout
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    style={spotCard}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ ...rankBadge, background: idx === 0 ? "var(--vermillion)" : "rgba(27,58,92,0.08)", color: idx === 0 ? "var(--washi)" : "var(--prussian)" }}>#{idx + 1}</span>
                      <h3 style={spotName}>{spot.name}</h3>
                      <span style={{ ...categoryTag, background: spot.category === "美食" ? "rgba(188,70,48,0.12)" : "rgba(27,58,92,0.08)", color: spot.category === "美食" ? "var(--vermillion)" : "var(--prussian)" }}>
                        {spot.category}
                      </span>
                    </div>
                  </motion.article>
                ))}
              </div>
              <p style={tinyNote}>注意:剛剛沒打任何一次 API。這就是 Occupath What-if 設計 — 評分公式透明到可以前端算,所以即時重排,不延遲、不浪費 quota。</p>
              <div style={ctaRow}>
                <button onClick={back} style={ctaGhost}>← 上一步</button>
                <button onClick={next} style={ctaPrimary}>最後一步 →</button>
              </div>
            </motion.section>
          )}

          {step === 5 && (
            <motion.section key="s5" {...slideAnim} style={section}>
              <p style={eyebrow}>STEP 5 / 5 · 對話式調整</p>
              <h2 style={titleMid}>不想拉滑桿?直接跟 AI 說。</h2>
              <p style={subtle}>對話會保留你前面的選擇,不打掉重練。</p>
              <div style={chatBox}>
                <div style={chatHeader}>
                  <span style={{ fontWeight: 600, color: "var(--prussian-deep)" }}>對話式調整</span>
                  <span style={{ fontSize: 11, color: "var(--mist)" }}>Wen Gemini · :8001</span>
                </div>
                <div style={chatList}>
                  <ChatBubble role="assistant" delay={0.1}>已為您生成 3 天行程。想調整哪一段?</ChatBubble>
                  <ChatBubble role="user" delay={1.0}>把 D1 的錦市場換成嵐山竹林</ChatBubble>
                  <ChatBubble role="assistant" delay={2.0}>好的,已將錦市場替換為嵐山竹林,並把附近的星巴克京都嵐山店加入下午茶選項。</ChatBubble>
                  <ChatBubble role="user" delay={3.0}>第二天能不能更多美食,少一點景點?</ChatBubble>
                  <ChatBubble role="assistant" delay={4.0}>了解,D2 已加入錦市場 + 先斗町晚餐,並縮短部分景點時間。</ChatBubble>
                </div>
              </div>
              <p style={tinyNote}>每次修改都會保留你前面確認的部分。AI 是配合你,不是替你決定。</p>

              <div style={{ marginTop: 36, padding: 28, background: "linear-gradient(135deg, var(--prussian) 0%, var(--prussian-deep) 100%)", color: "var(--washi)", borderRadius: 16, textAlign: "center" }}>
                <p style={{ fontSize: 11, letterSpacing: "0.4em", color: "var(--ochre)", marginBottom: 12 }}>—— 你看完整個 Tour 了 ——</p>
                <h3 style={{ fontSize: 22, marginBottom: 8, fontFamily: "'Noto Serif TC', serif" }}>準備好用 Occupath 規劃你自己的日本旅行?</h3>
                <p style={{ opacity: 0.7, fontSize: 13, marginBottom: 24 }}>從 MBTI 引導開始,5 分鐘內你會有一份完整且能解釋的行程。</p>
                <button onClick={() => navigate("/quiz")} style={ctaPrimaryDark}>進入真實產品 →</button>
              </div>

              <button onClick={back} style={{ ...ctaGhost, marginTop: 20 }}>← 上一步</button>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function ChatBubble({ role, children, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      style={{ display: "flex", justifyContent: role === "user" ? "flex-end" : "flex-start" }}
    >
      <div style={{
        maxWidth: "85%", padding: "10px 14px", borderRadius: 14,
        background: role === "user" ? "var(--prussian)" : "var(--washi-warm)",
        color: role === "user" ? "var(--washi)" : "var(--prussian-deep)",
        fontSize: 13, lineHeight: 1.55,
      }}>{children}</div>
    </motion.div>
  );
}

// ====== Animations ======
const slideAnim = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -24 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
};

// ====== Styles ======
const page = {
  minHeight: "100vh", background: "var(--washi)",
  fontFamily: "'Noto Sans TC', sans-serif",
};

const topbar = {
  position: "sticky", top: 0, zIndex: 10,
  background: "rgba(244,238,226,0.92)",
  backdropFilter: "blur(8px)",
  borderBottom: "1px solid rgba(27,58,92,0.08)",
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "14px 24px",
};

const brandLink = {
  fontSize: 13, color: "var(--prussian-deep)", textDecoration: "none",
  fontFamily: "'Noto Serif TC', serif", fontWeight: 600,
};

const progressWrap = {
  display: "flex", gap: 6,
};

const progressDot = {
  width: 24, height: 3, borderRadius: 2, transition: "background 0.3s",
};

const skipBtn = {
  fontSize: 12, color: "var(--mist)", background: "transparent",
  border: "none", cursor: "pointer", letterSpacing: "0.1em",
};

const main = {
  maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px",
};

const section = {
  textAlign: "center",
};

const eyebrow = {
  fontSize: 11, letterSpacing: "0.4em", color: "var(--vermillion)",
  textTransform: "uppercase", marginBottom: 16, fontFamily: "'JetBrains Mono', monospace",
};

const titleLarge = {
  fontFamily: "'Noto Serif TC', serif", fontSize: 36, fontWeight: 700,
  color: "var(--prussian-deep)", marginBottom: 12, lineHeight: 1.3,
};

const titleMid = {
  fontFamily: "'Noto Serif TC', serif", fontSize: 26, fontWeight: 700,
  color: "var(--prussian-deep)", marginBottom: 8, lineHeight: 1.35,
};

const subtle = {
  color: "var(--sumi-warm)", fontSize: 15, marginBottom: 32,
};

const tinyNote = {
  marginTop: 24, fontSize: 12, color: "var(--mist)",
  fontStyle: "italic", lineHeight: 1.6, maxWidth: 560, marginLeft: "auto", marginRight: "auto",
};

const ctaPrimary = {
  background: "var(--vermillion)", color: "var(--washi)",
  border: "none", padding: "14px 36px", borderRadius: 8,
  fontSize: 14, fontWeight: 600, cursor: "pointer", letterSpacing: "0.05em",
  fontFamily: "inherit",
};

const ctaPrimaryDark = {
  background: "var(--vermillion)", color: "var(--washi)",
  border: "none", padding: "14px 40px", borderRadius: 8,
  fontSize: 15, fontWeight: 600, cursor: "pointer", letterSpacing: "0.05em",
  fontFamily: "inherit",
};

const ctaGhost = {
  background: "transparent", color: "var(--prussian)",
  border: "1px solid rgba(27,58,92,0.2)", padding: "10px 22px", borderRadius: 8,
  fontSize: 13, cursor: "pointer", fontFamily: "inherit",
};

const ctaRow = {
  display: "flex", gap: 12, justifyContent: "center", marginTop: 24,
};

const personaGrid = {
  display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16,
  marginTop: 24, marginBottom: 24,
};

const personaCard = {
  background: "#FFFFFF", border: "2px solid", borderRadius: 16,
  padding: "32px 24px", textAlign: "center", cursor: "pointer",
  transition: "transform 0.2s, box-shadow 0.2s",
};

const personaIcon = {
  fontSize: 44, marginBottom: 12,
};

const personaTitle = {
  fontFamily: "'Noto Serif TC', serif", fontSize: 19, fontWeight: 700,
  color: "var(--prussian-deep)", margin: 0, marginBottom: 8,
};

const personaDesc = {
  fontSize: 13, color: "var(--sumi-warm)", lineHeight: 1.5,
  margin: 0, marginBottom: 12,
};

const personaTag = {
  fontSize: 10, letterSpacing: "0.2em", color: "var(--mist)",
  textTransform: "uppercase", margin: 0,
};

const mockPrefsBar = {
  display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16,
  padding: "12px 16px", background: "var(--washi-warm)", borderRadius: 8,
  fontSize: 12, color: "var(--sumi-warm)", marginBottom: 24,
};

const spotList = {
  display: "flex", flexDirection: "column", gap: 12,
  marginTop: 8, marginBottom: 8, textAlign: "left",
};

const spotCard = {
  background: "#FFFFFF", padding: 16, borderRadius: 12,
  border: "1px solid rgba(27,58,92,0.1)",
};

const rankBadge = {
  background: "rgba(27,58,92,0.08)", color: "var(--prussian)",
  padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
  fontFamily: "'JetBrains Mono', monospace",
};

const spotName = {
  margin: 0, fontSize: 16, fontWeight: 600, color: "var(--prussian-deep)",
  fontFamily: "'Noto Serif TC', serif",
};

const categoryTag = {
  marginLeft: "auto", padding: "2px 8px", borderRadius: 4,
  fontSize: 10, fontWeight: 600,
};

const spotDesc = {
  margin: "6px 0", fontSize: 12, color: "var(--sumi-warm)", lineHeight: 1.55,
};

const spotMeta = {
  display: "flex", gap: 12, fontSize: 11, color: "var(--mist)",
};

const xaiButton = {
  marginLeft: "auto", width: 28, height: 28, borderRadius: "50%",
  border: "1px solid var(--prussian)", fontSize: 13, fontWeight: 700,
  cursor: "pointer", transition: "all 0.2s",
};

const xaiBox = {
  marginTop: 12, padding: 14, borderRadius: 8,
  background: "var(--washi)", borderLeft: "3px solid var(--vermillion)",
};

const xaiSummary = {
  margin: "0 0 12px 0", fontSize: 12, color: "var(--sumi-warm)", lineHeight: 1.6,
};

const sliderBox = {
  background: "#FFFFFF", padding: "18px 20px", borderRadius: 12,
  border: "1px solid rgba(27,58,92,0.1)", marginBottom: 16, textAlign: "left",
};

const sliderLabel = {
  display: "flex", justifyContent: "space-between",
  fontSize: 12, color: "var(--sumi-warm)", marginBottom: 6,
};

const sliderValue = {
  fontWeight: 700, color: "var(--vermillion)", fontFamily: "'JetBrains Mono', monospace",
};

const sliderInput = {
  width: "100%", accentColor: "var(--prussian)", cursor: "pointer",
};

const chatBox = {
  background: "#FFFFFF", border: "1px solid rgba(27,58,92,0.12)",
  borderRadius: 12, overflow: "hidden", textAlign: "left",
};

const chatHeader = {
  padding: "10px 16px", background: "var(--washi)",
  borderBottom: "1px solid rgba(27,58,92,0.08)",
  display: "flex", justifyContent: "space-between", alignItems: "center",
  fontSize: 13,
};

const chatList = {
  padding: 14, display: "flex", flexDirection: "column", gap: 8,
  minHeight: 280,
};
