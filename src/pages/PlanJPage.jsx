import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import ParticleBackground from "../components/ParticleBackground";

const INTERESTS = [
  { emoji: "⛩", label: "文化" },
  { emoji: "🍜", label: "美食" },
  { emoji: "🌿", label: "自然" },
  { emoji: "🛍", label: "購物" },
  { emoji: "🌃", label: "夜景" },
  { emoji: "♨", label: "溫泉" },
  { emoji: "🎨", label: "藝術" },
  { emoji: "🎌", label: "動漫" },
];

export default function PlanJPage() {
  const navigate = useNavigate();
  const [days, setDays] = useState(5);
  const [budget, setBudget] = useState(50000);
  const [explorationStyle, setExplorationStyle] = useState(40); // 0=經典必訪 100=深度探索
  const [foodVsAttractions, setFoodVsAttractions] = useState(50); // 0=美食 100=景點
  const [natureVsCity, setNatureVsCity] = useState(50); // 0=都會 100=自然
  const [crowdTolerance, setCrowdTolerance] = useState(30); // 0=怕人多 100=愛熱鬧
  const [interests, setInterests] = useState(["文化", "美食"]);
  const [mustVisit, setMustVisit] = useState("");
  const [specialRequirements, setSpecialRequirements] = useState("");
  const [loading, setLoading] = useState(false);
  // 註:P 人 flow 走 /plan-p,不會進這頁,所以不再讀 explore collected

  function toggleInterest(label) {
    setInterests(
      interests.includes(label)
        ? interests.filter((i) => i !== label)
        : [...interests, label]
    );
  }

  function handleGenerate() {
    setLoading(true);
    const prefs = {
      mbtiType: "j",
      days,
      budget,
      explorationStyle,
      foodVsAttractions,
      natureVsCity,
      crowdTolerance,
      interests,
      mustVisit,
      specialRequirements,
    };
    // 暫存到 sessionStorage,讓 /plan (MapPlanningPage) 之後可取用
    sessionStorage.setItem("occupath_prefs", JSON.stringify(prefs));
    setTimeout(() => navigate("/plan"), 600);
  }

  return (
    <div className="plan-j-container">
      <ParticleBackground variant="fuji" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="plan-j-content"
      >
        <div className="plan-j-eyebrow font-display">— For The Conductor —</div>
        <h1 className="plan-j-title font-mincho">為你的精準規劃,設定條件</h1>
        <p className="plan-j-subtle">每一格都會直接進入 AI 的演算,你掌握全程。</p>

        {/* 天數 + 預算(數字直觀) */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="plan-j-section"
        >
          <div className="plan-j-grid-2">
            <div className="plan-j-field">
              <label className="plan-j-label font-display">DAYS</label>
              <div className="plan-j-number-row">
                <button onClick={() => setDays(Math.max(1, days - 1))} className="plan-j-step-btn">−</button>
                <span className="plan-j-number font-mincho">{days}</span>
                <button onClick={() => setDays(Math.min(14, days + 1))} className="plan-j-step-btn">+</button>
              </div>
              <div className="plan-j-hint">天</div>
            </div>

            <div className="plan-j-field">
              <label className="plan-j-label font-display">BUDGET</label>
              <input
                type="number"
                step="5000"
                min="10000"
                max="500000"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="plan-j-budget-input font-mincho"
              />
              <div className="plan-j-hint">NT$ / 人</div>
            </div>
          </div>
        </motion.section>

        {/* 4 維偏好滑桿 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="plan-j-section"
        >
          <h2 className="plan-j-section-title font-mincho">旅行偏好</h2>

          <SliderField label="探索風格" leftLabel="經典必訪" rightLabel="深度探索"
            value={explorationStyle} onChange={setExplorationStyle} />
          <SliderField label="飲食 vs 景點" leftLabel="美食至上" rightLabel="景點至上"
            value={foodVsAttractions} onChange={setFoodVsAttractions} />
          <SliderField label="自然 vs 都會" leftLabel="都會繁華" rightLabel="自然清幽"
            value={natureVsCity} onChange={setNatureVsCity} />
          <SliderField label="人潮容忍度" leftLabel="怕人多" rightLabel="愛熱鬧"
            value={crowdTolerance} onChange={setCrowdTolerance} />
        </motion.section>

        {/* 興趣 chips */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="plan-j-section"
        >
          <h2 className="plan-j-section-title font-mincho">興趣標籤</h2>
          <p className="plan-j-subtle-inline">複選,至少 1 個。會用在景點推薦時的「興趣匹配」因子</p>
          <div className="interest-grid">
            {INTERESTS.map((it) => (
              <motion.button
                key={it.label}
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => toggleInterest(it.label)}
                className={`interest-chip ${interests.includes(it.label) ? "is-active" : ""}`}
              >
                <span className="interest-emoji">{it.emoji}</span>
                <span className="interest-label font-mincho">{it.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* 必去景點 + 行程期望 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="plan-j-section"
        >
          <div className="plan-j-field-wide">
            <label className="plan-j-label font-display">指定必去</label>
            <input
              type="text"
              placeholder="例:清水寺、合掌村、富士山(以逗號分隔,選填)"
              value={mustVisit}
              onChange={(e) => setMustVisit(e.target.value)}
              className="plan-j-text-input"
            />
          </div>

          <div className="plan-j-field-wide">
            <label className="plan-j-label font-display">行程期望(選填)</label>
            <textarea
              placeholder="例:希望這趟旅行能放鬆心情、希望深入體驗地方文化、希望有浪漫氛圍..."
              value={specialRequirements}
              onChange={(e) => setSpecialRequirements(e.target.value)}
              className="plan-j-textarea"
              rows="3"
            />
            <div className="plan-j-hint-small">AI 會根據此將內容更貼近你的理想</div>
          </div>
        </motion.section>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.6 }}
          className="plan-j-cta-row"
        >
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleGenerate}
            disabled={interests.length === 0 || loading}
            className="plan-j-generate-btn font-mincho"
          >
            {loading ? (
              <span>正在為你規劃...</span>
            ) : (
              <>
                <span>生成精準行程</span>
                <span className="plan-j-arrow">→</span>
              </>
            )}
          </motion.button>

          <button onClick={() => navigate("/result/j")} className="plan-j-back-btn font-display">
            ← 回結果頁
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}

function SliderField({ label, leftLabel, rightLabel, value, onChange }) {
  return (
    <div className="plan-j-slider-field">
      <div className="plan-j-slider-header">
        <span className="plan-j-slider-label font-mincho">{label}</span>
        <span className="plan-j-slider-value font-display">{value}</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="plan-j-slider"
      />
      <div className="plan-j-slider-bounds">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}
