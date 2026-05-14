import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ParticleBackground from "../components/ParticleBackground";

const QUESTIONS = [
  {
    scene: "出發前一週",
    question: "你訂好機票了。出發前一週,你的行程表長什麼樣?",
    options: [
      { label: "每天每小時都標好,連咖啡店候補都備好兩家。", weight: { j: 2, p: 0 } },
      { label: "大概知道哪幾天去哪個城市,細節到當天再說。", weight: { j: 0, p: 2 } },
    ],
  },
  {
    scene: "京都的清晨",
    question: "在京都的清晨,你看到一條沒在計畫裡的小巷,飄著手沖咖啡香。你會?",
    options: [
      { label: "拍照記下,回去查評價,明天可能再來。", weight: { j: 1, p: 0 } },
      { label: "直接走進去,今天的清水寺改下午。", weight: { j: 0, p: 2 } },
    ],
  },
  {
    scene: "旅程的尾聲",
    question: "旅程結束,你最在意的是?",
    options: [
      { label: "該去的都去了、該吃的都吃了、預算掌握得好。", weight: { j: 2, p: 0 } },
      { label: "有沒有遇到驚喜、有沒有故事可以講一輩子。", weight: { j: 0, p: 1 } },
    ],
  },
];

export default function QuizPage() {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(-1); // -1 = 意境引導,0+ = 題目
  const [scores, setScores] = useState({ j: 0, p: 0 });

  const question = QUESTIONS[currentIndex] || QUESTIONS[0];
  const progress = currentIndex < 0 ? 0 : ((currentIndex) / QUESTIONS.length) * 100;

  function handleSelect(option) {
    const newScores = {
      j: scores.j + option.weight.j,
      p: scores.p + option.weight.p,
    };
    setScores(newScores);

    if (currentIndex < QUESTIONS.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      const type = newScores.j >= newScores.p ? "j" : "p";
      navigate(`/result/${type}`);
    }
  }

  return (
    <div className="quiz-container">
      {/* 沉浸式粒子背景(中性、極輕) */}
      <ParticleBackground variant="quiz" />

      {/* Progress bar(只在進入題目後顯示)*/}
      {currentIndex >= 0 && (
        <div className="quiz-progress">
          <div className="quiz-progress-track">
            <motion.div
              className="quiz-progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${progress + (100 / QUESTIONS.length)}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          <div className="quiz-progress-text font-display">
            {currentIndex + 1} / {QUESTIONS.length}
          </div>
        </div>
      )}

      {/* 意境引導頁(currentIndex = -1)*/}
      <AnimatePresence mode="wait">
        {currentIndex === -1 ? (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="quiz-intro"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="quiz-intro-eyebrow font-display"
            >
              — Before You Begin —
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 1.0, duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
              className="quiz-intro-title font-mincho"
            >
              先把自己,<br />
              安頓下來。
            </motion.h1>

            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 80, opacity: 1 }}
              transition={{ delay: 2.0, duration: 1.0 }}
              className="quiz-intro-divider"
            />

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.4, duration: 0.9 }}
              className="quiz-intro-text font-mincho"
            >
              旅程,是從某一刻開始的。
              <br />
              也許是訂機票時、也許是讀到一段文字時 ——
              <br />
              你不一定說得出來,但你知道。
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 3.4, duration: 0.9 }}
              className="quiz-intro-subtext"
            >
              接下來 3 題,沒有對錯。<br />
              只是讓 Occupath 認得出,你是哪一種旅人。
            </motion.p>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 4.2, duration: 0.8 }}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setCurrentIndex(0)}
              className="quiz-intro-cta font-mincho"
            >
              <span>深呼吸,開始</span>
              <span className="quiz-intro-cta-arrow">→</span>
            </motion.button>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 4.8, duration: 0.8 }}
              className="quiz-intro-time font-display"
            >
              — 約 30 秒 —
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key={currentIndex}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="quiz-card"
        >
          <div className="quiz-scene font-display">— {question.scene} —</div>
          <h1 className="quiz-question font-mincho">{question.question}</h1>

          <div className="quiz-options">
            {question.options.map((opt, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelect(opt)}
                className="quiz-option"
              >
                {opt.label}
              </motion.button>
            ))}
          </div>
        </motion.div>
        )}
      </AnimatePresence>

      {/* Brand watermark */}
      <div className="quiz-watermark font-display">Occupath</div>
    </div>
  );
}
