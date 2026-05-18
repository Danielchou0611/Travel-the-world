import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";

// 沉浸不破、隨時可逃 — 全域導航
// 左上極淡 Occupath wordmark(opacity 0.35,hover 1.0)→ 點開全螢幕浮世繪 overlay
// ESC 關閉。對齊 Apple / Linear marketing 模式。
export default function MiniNav() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // ESC 關閉
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
      // Cmd/Ctrl + K 開啟(隱藏快捷)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // body scroll lock when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function go(path) {
    setOpen(false);
    // 對應 brand_preview 是靜態 .html,需用 window.location 跳轉
    if (path.startsWith("http") || path.endsWith(".html")) {
      window.location.href = path;
    } else {
      navigate(path);
    }
  }

  const destinations = [
    { label: "品牌首頁", subtitle: "Brand Story", path: "/brand_preview.html", number: "00" },
    { label: "60 秒體驗", subtitle: "Interactive Tour", path: "/tour", number: "01" },
    { label: "MBTI 測驗", subtitle: "Begin the Path", path: "/quiz", number: "02" },
    { label: "我的行程", subtitle: "Your Itinerary", path: "/itinerary", number: "03" },
    { label: "GitHub", subtitle: "Source Code", path: "https://github.com/Danielchou0611/Travel-the-world", number: "04" },
  ];

  return (
    <>
      {/* ────────── Trigger:左上極淡 wordmark ────────── */}
      <button
        onClick={() => setOpen(true)}
        aria-label="開啟導航選單"
        style={triggerBtn}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "1";
          const dot = e.currentTarget.querySelector(".trigger-dot");
          if (dot) dot.style.transform = "scale(1.3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "0.4";
          const dot = e.currentTarget.querySelector(".trigger-dot");
          if (dot) dot.style.transform = "scale(1)";
        }}
      >
        <span className="trigger-dot" style={triggerDot} />
        <span style={triggerText}>Occupath</span>
        <span style={triggerHint}>⌘K</span>
      </button>

      {/* ────────── Overlay:全螢幕和紙質感選單 ────────── */}
      <AnimatePresence>
        {open && (
          <>
            {/* 半透明 backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              onClick={() => setOpen(false)}
              style={backdrop}
            />

            {/* Overlay 內容 */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={overlay}
              role="dialog"
              aria-modal="true"
              aria-label="主導航選單"
            >
              {/* 頂部:logo + close */}
              <div style={topRow}>
                <p style={brand}>OCCUPATH</p>
                <button onClick={() => setOpen(false)} aria-label="關閉選單" style={closeBtn}>
                  <span style={{ fontSize: 11, letterSpacing: "0.3em" }}>CLOSE</span>
                  <span style={{ fontSize: 22, lineHeight: 1 }}>×</span>
                </button>
              </div>

              {/* 大標 */}
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                style={eyebrow}
              >
                — Where would you like to go —
              </motion.p>

              {/* 5 個連結 */}
              <nav style={linkList}>
                {destinations.map((d, i) => {
                  const isActive = location.pathname === d.path || (d.path === "/brand_preview.html" && location.pathname === "/");
                  return (
                    <motion.button
                      key={d.path}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 + i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      onClick={() => go(d.path)}
                      style={{ ...linkRow, opacity: isActive ? 0.4 : 1 }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(188,70,48,0.06)";
                        e.currentTarget.style.paddingLeft = "20px";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.paddingLeft = "0px";
                      }}
                    >
                      <span style={linkNumber}>{d.number}</span>
                      <span style={linkLabel}>{d.label}</span>
                      <span style={linkSubtitle}>{d.subtitle}</span>
                      <span style={linkArrow}>→</span>
                    </motion.button>
                  );
                })}
              </nav>

              {/* footer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                style={footer}
              >
                <span>2026 · NTU AI Builders Challenge · O 組</span>
                <span style={{ marginLeft: "auto", opacity: 0.6 }}>
                  ESC <span style={{ marginLeft: 6, opacity: 0.5 }}>關閉</span>
                </span>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ============ Styles ============
const triggerBtn = {
  position: "fixed", top: 24, left: 24, zIndex: 999,
  display: "inline-flex", alignItems: "center", gap: 10,
  background: "transparent", border: "none", cursor: "pointer",
  padding: "8px 12px",
  opacity: 0.4,
  transition: "opacity 0.3s",
  mixBlendMode: "difference",  // 在深底/淺底都看得到
};

const triggerDot = {
  width: 6, height: 6, borderRadius: "50%",
  background: "var(--vermillion, #BC4630)",
  transition: "transform 0.3s",
};

const triggerText = {
  fontFamily: "'Cormorant Garamond', 'Shippori Mincho', serif",
  fontSize: 14, letterSpacing: "0.3em",
  color: "#F4EEE2",  // washi
  fontWeight: 500,
};

const triggerHint = {
  fontSize: 9, letterSpacing: "0.2em",
  color: "#F4EEE2",
  fontFamily: "'JetBrains Mono', monospace",
  opacity: 0.55,
  marginLeft: 4,
};

const backdrop = {
  position: "fixed", inset: 0, zIndex: 1000,
  background: "rgba(9,26,43,0.85)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
};

const overlay = {
  position: "fixed", inset: 0, zIndex: 1001,
  background: "linear-gradient(135deg, #091A2B 0%, #0F2942 60%, #1B3A5C 100%)",
  display: "flex", flexDirection: "column",
  padding: "32px 48px 28px",
  overflowY: "auto",
};

const topRow = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  marginBottom: 60,
};

const brand = {
  fontFamily: "'Cormorant Garamond', serif",
  fontSize: 13, letterSpacing: "0.4em", color: "#D4A574",
  margin: 0, fontWeight: 600,
};

const closeBtn = {
  display: "inline-flex", alignItems: "center", gap: 10,
  background: "transparent", border: "1px solid rgba(244,238,226,0.2)",
  color: "#F4EEE2", padding: "6px 14px", borderRadius: 999,
  cursor: "pointer", fontFamily: "'Cormorant Garamond', serif",
  transition: "all 0.2s",
};

const eyebrow = {
  textAlign: "center",
  fontSize: 11, letterSpacing: "0.5em", color: "#D4A574",
  textTransform: "uppercase", marginBottom: 60, marginTop: 0,
  fontFamily: "'JetBrains Mono', monospace", opacity: 0.7,
};

const linkList = {
  display: "flex", flexDirection: "column",
  maxWidth: 760, margin: "0 auto", width: "100%",
  flex: 1, justifyContent: "center", gap: 4,
};

const linkRow = {
  display: "grid",
  gridTemplateColumns: "60px 1fr auto 40px",
  alignItems: "center",
  gap: 24,
  background: "transparent",
  border: "none",
  borderBottom: "1px solid rgba(244,238,226,0.08)",
  padding: "20px 0",
  cursor: "pointer",
  textAlign: "left",
  color: "#F4EEE2",
  transition: "all 0.3s ease",
};

const linkNumber = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11, color: "#D4A574", letterSpacing: "0.1em",
  opacity: 0.7,
};

const linkLabel = {
  fontFamily: "'Shippori Mincho', 'Noto Serif TC', serif",
  fontSize: 28, fontWeight: 500,
  color: "#F4EEE2",
};

const linkSubtitle = {
  fontFamily: "'Cormorant Garamond', serif",
  fontSize: 13, letterSpacing: "0.2em",
  color: "rgba(244,238,226,0.45)",
  fontStyle: "italic",
};

const linkArrow = {
  fontSize: 20, color: "#BC4630",
  fontFamily: "'Cormorant Garamond', serif",
};

const footer = {
  display: "flex", alignItems: "center",
  fontSize: 10, letterSpacing: "0.25em",
  color: "rgba(244,238,226,0.4)",
  fontFamily: "'JetBrains Mono', monospace",
  textTransform: "uppercase",
  marginTop: 40,
  paddingTop: 24,
  borderTop: "1px solid rgba(244,238,226,0.08)",
};
