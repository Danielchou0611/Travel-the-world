import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import ParticleBackground from "../components/ParticleBackground";

const RESULTS = {
  j: {
    title: "行程指揮官",
    en: "The Conductor",
    description: "你相信好的旅程從計畫開始。每一個小時都是你掌握的節奏,意外只是你預備好的選項之一。Occupath 會給你完整的時間軸、預算分解、與每個推薦的 4 因子分析。",
    cta: "開始你的精準規劃",
    color: "var(--prussian)",
    accent: "#1B3A5C",
  },
  p: {
    title: "隨興探險家",
    en: "The Wanderer",
    description: "你相信最好的旅程藏在計畫之外。地圖只是參考,真正的故事在轉角的咖啡香裡。Occupath 會給你靈感卡片、隨機驚喜,與一句句不解釋的「這個值得繞路」。",
    cta: "開始你的偶然之旅",
    color: "var(--vermillion)",
    accent: "#C8472B",
  },
};

export default function ResultPage() {
  const { type } = useParams();
  const navigate = useNavigate();
  const result = RESULTS[type] || RESULTS.j;

  return (
    <div className="result-container">
      {/* 沉浸式粒子背景(底層) */}
      <ParticleBackground variant={type === "p" ? "p" : "fuji"} />

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="result-content"
      >
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="result-en font-display"
          style={{ color: result.accent }}
        >
          You are
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.9 }}
          className="result-title font-mincho"
          style={{ color: result.accent }}
        >
          {result.title}
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.6 }}
          className="result-en-name font-display"
        >
          {result.en}
        </motion.div>

        <motion.div
          initial={{ width: 0 }}
          animate={{ width: 60 }}
          transition={{ delay: 1.4, duration: 0.7 }}
          className="result-divider"
          style={{ background: result.accent }}
        />

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.7 }}
          className="result-description"
        >
          {result.description}
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.0, duration: 0.6 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate(type === "p" ? "/explore" : "/plan-j")}
          className="result-cta font-mincho"
          style={{ borderColor: result.accent, color: result.accent }}
        >
          <span>{result.cta}</span>
          <span className="result-cta-arrow">→</span>
        </motion.button>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 2.4, duration: 0.6 }}
          whileHover={{ opacity: 1 }}
          onClick={() => navigate("/quiz")}
          className="result-retake font-display"
        >
          ↺ 重測
        </motion.button>
      </motion.div>
    </div>
  );
}
