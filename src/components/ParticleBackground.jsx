import { useEffect, useState, useMemo } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { loadPolygonMaskPlugin } from "@tsparticles/plugin-polygon-mask";

/**
 * Occupath 沉浸式粒子背景
 *
 * variant="j"  → 規律、低速、深藍(行程指揮官 — 秩序感)
 * variant="p"  → 散亂、跟滑鼠、朱紅 + 琥珀(隨興探險家 — 自由感)
 */
export default function ParticleBackground({ variant = "j" }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
      await loadPolygonMaskPlugin(engine);
    }).then(() => setReady(true));
  }, []);

  const options = useMemo(() => {
    if (variant === "fuji") {
      // 富士山形狀粒子聚集(J 人結果頁強化版)
      return {
        fpsLimit: 60,
        fullScreen: { enable: false },
        background: { color: { value: "transparent" } },
        particles: {
          number: { value: 280, density: { enable: false } },
          color: { value: ["#1B3A5C", "#D4A574", "#F5EFE3"] },
          shape: { type: "circle" },
          opacity: {
            value: { min: 0.3, max: 0.7 },
            animation: { enable: true, speed: 0.5, sync: false },
          },
          size: { value: { min: 0.6, max: 1.6 } },
          links: {
            enable: true,
            distance: 28,
            color: "#1B3A5C",
            opacity: 0.25,
            width: 1,
          },
          move: {
            enable: true,
            speed: 0.4,
            direction: "none",
            random: false,
            straight: false,
            outModes: { default: "bounce" },
          },
        },
        polygon: {
          enable: true,
          type: "inside",
          draw: {
            enable: true,
            stroke: { color: "rgba(27, 58, 92, 0.2)", width: 1, opacity: 0.35 },
          },
          move: { radius: 10, type: "path" },
          scale: 0.85,
          url: "/fuji.svg",
          position: { x: 50, y: 60 },
        },
        interactivity: {
          events: {
            onHover: { enable: true, mode: "attract" },
          },
          modes: {
            attract: { distance: 180, duration: 0.4, factor: 3 },
          },
        },
        detectRetina: true,
      };
    }

    if (variant === "quiz") {
      // Quiz 中性版:極輕、緩慢、不搶戲、不互動
      return {
        fpsLimit: 60,
        fullScreen: { enable: false },
        background: { color: { value: "transparent" } },
        particles: {
          number: { value: 30, density: { enable: true, area: 1200 } },
          color: { value: ["#D4A574", "#1B3A5C"] },
          shape: { type: "circle" },
          opacity: {
            value: { min: 0.05, max: 0.25 },
            animation: { enable: true, speed: 0.25, sync: false },
          },
          size: { value: { min: 0.8, max: 1.8 } },
          move: {
            enable: true,
            speed: 0.2,
            direction: "none",
            random: true,
            straight: false,
            outModes: { default: "out" },
          },
        },
        interactivity: {
          events: {
            onHover: { enable: false },
            onClick: { enable: false },
          },
        },
        detectRetina: true,
      };
    }

    if (variant === "p") {
      // P 人:隨興探險家 — 跟滑鼠、散亂、朱紅 + 琥珀
      return {
        fpsLimit: 60,
        fullScreen: { enable: false },
        background: { color: { value: "transparent" } },
        particles: {
          number: { value: 80, density: { enable: true, area: 900 } },
          color: { value: ["#C8472B", "#D4A574", "#1B3A5C"] },
          shape: { type: "circle" },
          opacity: {
            value: { min: 0.15, max: 0.6 },
            animation: { enable: true, speed: 0.6, sync: false },
          },
          size: { value: { min: 1, max: 3 } },
          move: {
            enable: true,
            speed: 0.7,
            direction: "none",
            random: true,
            straight: false,
            outModes: { default: "out" },
          },
        },
        interactivity: {
          events: {
            onHover: { enable: true, mode: "attract" },
            onClick: { enable: true, mode: "push" },
          },
          modes: {
            attract: { distance: 180, duration: 0.4, factor: 2 },
            push: { quantity: 3 },
          },
        },
        detectRetina: true,
      };
    }

    // J 人:行程指揮官 — 規律、低速、深藍
    return {
      fpsLimit: 60,
      fullScreen: { enable: false },
      background: { color: { value: "transparent" } },
      particles: {
        number: { value: 60, density: { enable: true, area: 1000 } },
        color: { value: ["#1B3A5C", "#0F2942", "#D4A574"] },
        shape: { type: "circle" },
        opacity: {
          value: { min: 0.1, max: 0.4 },
          animation: { enable: true, speed: 0.3, sync: false },
        },
        size: { value: { min: 0.8, max: 2 } },
        links: {
          enable: true,
          distance: 140,
          color: "#1B3A5C",
          opacity: 0.15,
          width: 1,
        },
        move: {
          enable: true,
          speed: 0.3,
          direction: "none",
          random: false,
          straight: false,
          outModes: { default: "bounce" },
        },
      },
      interactivity: {
        events: {
          onHover: { enable: true, mode: "grab" },
        },
        modes: {
          grab: { distance: 160, links: { opacity: 0.4 } },
        },
      },
      detectRetina: true,
    };
  }, [variant]);

  if (!ready) return null;

  return (
    <div className="particle-bg">
      <Particles id={`tsparticles-${variant}`} options={options} />
    </div>
  );
}
