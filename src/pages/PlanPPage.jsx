import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import ParticleBackground from "../components/ParticleBackground";

// 4 個 day theme(P 人不講「第幾天」,講「狀態」)
const DAY_THEMES = [
  { id: "wake", label: "醒過來的那個早晨", emoji: "🌅", color: "var(--ochre)" },
  { id: "wander", label: "沒有目的地的下午", emoji: "🚶", color: "var(--vermillion)" },
  { id: "still", label: "想安靜的時候", emoji: "🍃", color: "var(--prussian)" },
  { id: "alive", label: "今晚不想回旅館", emoji: "🌃", color: "var(--prussian-deep)" },
];

// 補充景點池(收藏不足 4 個 theme 時 AI 隨機補)
const FALLBACK_POOL = [
  { id: "f1", name: "鴨川河岸", area: "京都", whisper: "下班的人席地而坐,河水把日子帶走。" },
  { id: "f2", name: "新宿御苑深處", area: "東京", whisper: "離車站 10 分鐘,聽不到車聲。" },
  { id: "f3", name: "嵐山小火車", area: "京都", whisper: "1 小時的窗外風景,不需要努力。" },
  { id: "f4", name: "高雄夜市旁的居酒屋", area: "大阪", whisper: "店長不會說中文,但會幫你倒酒。" },
  { id: "f5", name: "深川的小書店", area: "東京", whisper: "二樓的二手書多到要側著走。" },
  { id: "f6", name: "金澤兼六園清晨", area: "金澤", whisper: "9 點前進場,日本三名園還沒醒。" },
  { id: "f7", name: "下北澤散步", area: "東京", whisper: "二手衣店一家比一家奇怪。" },
  { id: "f8", name: "京都本能寺燒亡之地", area: "京都", whisper: "歷史故事在地上,沒有立牌。" },
];

// 偽隨機洗牌(seed-based)
function shuffle(arr, seed) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(((Math.sin(seed * (i + 1) + 1) + 1) / 2) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 把收藏景點 + fallback 分配到 4 個 theme
// 收藏 always 出現(優先放前面 theme),fallback 隨 shuffleSeed 重洗
function groupSpotsByTheme(collected, seed) {
  const lockedPool = [...collected];                         // 收藏永遠不洗(忠於使用者選擇)
  const dynamicPool = shuffle(FALLBACK_POOL, seed);          // fallback 隨 seed 重洗
  const all = [...lockedPool, ...dynamicPool].slice(0, 12);
  return DAY_THEMES.map((theme, i) => ({
    ...theme,
    spots: all.slice(i * 3, (i + 1) * 3),
  }));
}

export default function PlanPPage() {
  const navigate = useNavigate();
  const [collected, setCollected] = useState([]);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [lockedSpotIds, setLockedSpotIds] = useState(new Set());

  useEffect(() => {
    const stored = sessionStorage.getItem("occupath_explore_collected");
    if (stored) {
      try {
        setCollected(JSON.parse(stored));
      } catch (e) {
        console.warn("Failed to parse collected:", e);
      }
    }
  }, []);

  const themes = useMemo(
    () => groupSpotsByTheme(collected, shuffleSeed),
    [collected, shuffleSeed]
  );

  function toggleLock(spotId) {
    setLockedSpotIds((prev) => {
      const next = new Set(prev);
      if (next.has(spotId)) next.delete(spotId);
      else next.add(spotId);
      return next;
    });
  }

  function reshuffle() {
    setShuffleSeed(shuffleSeed + 1);
  }

  return (
    <div className="plan-p-container">
      <ParticleBackground variant="p" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="plan-p-content"
      >
        <div className="plan-p-eyebrow font-display">— Your Wandering Route —</div>
        <h1 className="plan-p-title font-mincho">為你拼起來的,一條路</h1>
        <p className="plan-p-subtle">
          沒有時間表、沒有預算控管。
          <br />
          只有 4 個狀態,跟你會經過的那些地方。
        </p>

        {/* 4 個 day theme(P 人不講「第幾天」)*/}
        <div className="plan-p-themes">
          {themes.map((theme, themeIdx) => (
            <motion.section
              key={`${theme.id}-${shuffleSeed}`}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + themeIdx * 0.2, duration: 0.7 }}
              className="plan-p-theme"
            >
              <div className="plan-p-theme-header">
                <span className="plan-p-theme-emoji">{theme.emoji}</span>
                <h2
                  className="plan-p-theme-label font-mincho"
                  style={{ color: theme.color }}
                >
                  {theme.label}
                </h2>
              </div>

              <div className="plan-p-spot-row">
                <AnimatePresence mode="popLayout">
                  {theme.spots.map((spot, i) => (
                    <motion.div
                      key={`${spot.id}-${shuffleSeed}`}
                      initial={{ opacity: 0, y: 30, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -30, scale: 0.95 }}
                      transition={{
                        delay: i * 0.1,
                        duration: 0.55,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      whileHover={{ y: -5 }}
                      className={`plan-p-spot ${
                        lockedSpotIds.has(spot.id) ? "is-locked" : ""
                      }`}
                    >
                      <div className="plan-p-spot-name font-mincho">{spot.name}</div>
                      <div className="plan-p-spot-area font-display">
                        — {spot.area} —
                      </div>
                      <p className="plan-p-spot-whisper">
                        「{spot.whisper}」
                      </p>
                      <button
                        onClick={() => toggleLock(spot.id)}
                        className="plan-p-lock-btn font-display"
                      >
                        {lockedSpotIds.has(spot.id) ? "✓ 鎖定" : "○ 鎖定這個"}
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.section>
          ))}
        </div>

        {/* 底部 actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.6 }}
          className="plan-p-actions"
        >
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={reshuffle}
            className="plan-p-action-btn font-mincho"
          >
            🎲 換一輪
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate("/explore")}
            className="plan-p-action-btn font-mincho"
          >
            ↺ 回去再選
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.06, y: -2 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => alert("ChatBox 對話功能 Wen 5/13-5/14 整合")}
            className="plan-p-action-btn primary font-mincho"
          >
            💬 打開對話
          </motion.button>
        </motion.div>

        {/* 永遠的提示 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 2.2, duration: 0.8 }}
          className="plan-p-footnote font-display"
        >
          this is not a plan. this is a feeling.
        </motion.p>
      </motion.div>
    </div>
  );
}
