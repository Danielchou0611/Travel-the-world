import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import ParticleBackground from "../components/ParticleBackground";

const MOODS = [
  { emoji: "⛩", label: "神社" },
  { emoji: "☕", label: "巷弄咖啡" },
  { emoji: "🍜", label: "拉麵" },
  { emoji: "🌊", label: "看海" },
  { emoji: "🚶", label: "隨便走" },
  { emoji: "🎨", label: "美術館" },
  { emoji: "🌸", label: "賞花" },
  { emoji: "🍶", label: "居酒屋" },
];

// MVP mock spots(之後接李冠霖的 japan_with_rating_interest.json)
const MOCK_SPOTS = [
  { id: "s1", name: "下鴨神社", area: "京都", tag: "神社", whisper: "晨光穿過糺之森,森林與神社合而為一。" },
  { id: "s2", name: "伏見稻荷大社", area: "京都", tag: "神社", whisper: "千本鳥居要走到山頂,夜晚最靜謐。" },
  { id: "s3", name: "明治神宮", area: "東京", tag: "神社", whisper: "市中心的森林,離開原宿車站就是另一個時空。" },
  { id: "s4", name: "嚴島神社", area: "廣島", tag: "神社", whisper: "漲潮時鳥居漂浮海上,退潮時可以走過去。" },
  { id: "s5", name: "% Arabica 京都嵐山", area: "京都", tag: "巷弄咖啡", whisper: "白色簡約,渡月橋畔的網紅店。" },
  { id: "s6", name: "蔦屋書店代官山", area: "東京", tag: "巷弄咖啡", whisper: "三棟相連的書店,書蟲的天堂。" },
  { id: "s7", name: "Blue Bottle 清澄白河", area: "東京", tag: "巷弄咖啡", whisper: "美國藍瓶日本一號店,工業風老倉庫。" },
  { id: "s8", name: "松本咖啡", area: "金澤", tag: "巷弄咖啡", whisper: "60 年老店,虹吸壺手沖。" },
  { id: "s9", name: "麵屋一燈", area: "東京新小岩", tag: "拉麵", whisper: "魚介湯頭排隊兩小時的店,值得。" },
  { id: "s10", name: "二郎本店", area: "東京三田", tag: "拉麵", whisper: "二郎系本宗,要先學暗號才能點餐。" },
  { id: "s11", name: "一蘭拉麵總本店", area: "福岡天神", tag: "拉麵", whisper: "個室專注吃麵,只看到一雙手的服務。" },
  { id: "s12", name: "麵屋武藏", area: "東京新宿", tag: "拉麵", whisper: "宮本武藏命名的店,豚骨湯黑得有戲劇感。" },
  { id: "s13", name: "鎌倉海濱", area: "鎌倉", tag: "看海", whisper: "電影《海街日記》取景地,風很大。" },
  { id: "s14", name: "江之島", area: "藤澤", tag: "看海", whisper: "鎌倉旁的小島,可走可纜車。" },
  { id: "s15", name: "由比之濱", area: "鎌倉", tag: "看海", whisper: "夏天衝浪,冬天散步,湘南的標誌。" },
  { id: "s16", name: "稚內最北端", area: "北海道", tag: "看海", whisper: "日本最北的海岸,看得到俄羅斯。" },
  { id: "s17", name: "町家小巷先斗町", area: "京都", tag: "隨便走", whisper: "兩人並肩會擦肩的窄巷,夜晚最美。" },
  { id: "s18", name: "谷中銀座", area: "東京", tag: "隨便走", whisper: "老東京下町,可以遇到很多貓。" },
  { id: "s19", name: "麻布十番", area: "東京", tag: "隨便走", whisper: "外國人聚集的精緻街區,適合迷路。" },
  { id: "s20", name: "ひがし茶屋街", area: "金澤", tag: "隨便走", whisper: "藝妓還會出現的茶屋街道。" },
  { id: "s21", name: "金澤 21 世紀美術館", area: "金澤", tag: "美術館", whisper: "玻璃圓盤建築,游泳池作品必看。" },
  { id: "s22", name: "東京 teamLab Borderless", area: "東京", tag: "美術館", whisper: "沉浸式數位藝術,光線在牆上跑。" },
  { id: "s23", name: "直島地中美術館", area: "瀨戶內", tag: "美術館", whisper: "安藤忠雄設計的地下美術館,只有 4 件作品。" },
  { id: "s24", name: "大原美術館", area: "倉敷", tag: "美術館", whisper: "日本第一間西洋美術館,藏有莫內、塞尚。" },
  { id: "s25", name: "新宿御苑", area: "東京", tag: "賞花", whisper: "市中心的櫻花海,3 月底 4 月初最盛。" },
  { id: "s26", name: "上野公園", area: "東京", tag: "賞花", whisper: "1100 棵櫻花樹,夜櫻打燈。" },
  { id: "s27", name: "嵐山竹林", area: "京都", tag: "賞花", whisper: "竹林沙沙作響,清晨人最少。" },
  { id: "s28", name: "弘前公園", area: "青森", tag: "賞花", whisper: "東北最美的櫻花地,城堡 + 護城河。" },
  { id: "s29", name: "黃金街", area: "東京新宿", tag: "居酒屋", whisper: "二戰後遺留的小巷,200 家小店各有性格。" },
  { id: "s30", name: "思い出橫丁", area: "東京新宿", tag: "居酒屋", whisper: "煙霧裊裊的烤雞肉串巷子。" },
  { id: "s31", name: "天滿宮裏的居酒屋街", area: "大阪", tag: "居酒屋", whisper: "在地人居多,沒有觀光客的味道。" },
  { id: "s32", name: "京都先斗町河岸", area: "京都", tag: "居酒屋", whisper: "鴨川河畔的露天平台,夏天必訪。" },
];

// 依 seed 偽隨機(seed 改變就重新洗牌)
function shuffle(arr, seed) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(((Math.sin(seed * (i + 1)) + 1) / 2) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ExplorePage() {
  const navigate = useNavigate();
  const [selectedMood, setSelectedMood] = useState(null);
  const [shuffleSeed, setShuffleSeed] = useState(1);
  const [collected, setCollected] = useState([]);

  const suggestions = useMemo(() => {
    if (!selectedMood) return [];
    const pool = MOCK_SPOTS.filter((s) => s.tag === selectedMood);
    return shuffle(pool, shuffleSeed).slice(0, 3);
  }, [selectedMood, shuffleSeed]);

  const isCollected = (id) => collected.find((s) => s.id === id);

  function toggleCollect(spot) {
    if (isCollected(spot.id)) {
      setCollected(collected.filter((s) => s.id !== spot.id));
    } else {
      setCollected([...collected, spot]);
    }
  }

  return (
    <div className="explore-container">
      <ParticleBackground variant="p" />

      <div className="explore-content">
        <AnimatePresence mode="wait">
          {!selectedMood ? (
            <motion.div
              key="picker"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="explore-picker"
            >
              <div className="explore-eyebrow font-display">— Tell me one thing —</div>
              <h1 className="explore-question font-mincho">今天,你想做什麼?</h1>
              <p className="explore-subtle">不用想得太久。一個閃過腦海的詞就好。</p>

              <div className="mood-grid">
                {MOODS.map((m, i) => (
                  <motion.button
                    key={m.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + i * 0.06, duration: 0.5 }}
                    whileHover={{ scale: 1.06, y: -4 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedMood(m.label)}
                    className="mood-chip"
                  >
                    <span className="mood-emoji">{m.emoji}</span>
                    <span className="mood-label font-mincho">{m.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="suggestions"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="explore-suggestions"
            >
              <div className="explore-eyebrow font-display">— 為你抽出 3 個地方 —</div>
              <h2 className="explore-mood-active font-mincho">
                {MOODS.find((m) => m.label === selectedMood)?.emoji} {selectedMood}
              </h2>

              <div className="spot-cards-p">
                <AnimatePresence mode="popLayout">
                  {suggestions.map((spot, i) => (
                    <motion.div
                      key={`${spot.id}-${shuffleSeed}`}
                      initial={{ opacity: 0, y: 40, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -40, scale: 0.95 }}
                      transition={{
                        delay: i * 0.12,
                        duration: 0.65,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      whileHover={{ y: -6 }}
                      className={`spot-card-p ${isCollected(spot.id) ? "is-collected" : ""}`}
                    >
                      <div className="spot-name-p font-mincho">{spot.name}</div>
                      <div className="spot-area-p font-display">— {spot.area} —</div>
                      <p className="spot-whisper">「{spot.whisper}」</p>
                      <button
                        onClick={() => toggleCollect(spot)}
                        className="spot-collect-btn font-display"
                      >
                        {isCollected(spot.id) ? "❤ 已收藏" : "♡ 收藏"}
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div className="explore-actions">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setShuffleSeed(shuffleSeed + 1)}
                  className="explore-action-btn font-mincho"
                >
                  🎲 再抽 3 個
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    setSelectedMood(null);
                    setShuffleSeed(1);
                  }}
                  className="explore-action-btn font-mincho"
                >
                  ↺ 換一種氛圍
                </motion.button>
                {collected.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      // P 人 flow 維持 P 風格,不甩進 J 滑桿頁
                      sessionStorage.setItem(
                        "occupath_explore_collected",
                        JSON.stringify(collected)
                      );
                      navigate("/plan-p");
                    }}
                    className="explore-action-btn primary font-mincho"
                  >
                    ❤ 把這些拼成一條路 ({collected.length}) →
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 持續收藏小提示(右下浮動) */}
      {collected.length > 0 && !selectedMood && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="explore-collected-hint font-display"
        >
          已收藏 {collected.length} 個地方
        </motion.div>
      )}
    </div>
  );
}
