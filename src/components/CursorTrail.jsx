import { useEffect, useState, useMemo } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

/**
 * 全站滑鼠拖尾(nyancat2 風)
 *
 * 使用者滑鼠移動 → 粒子從 cursor 位置噴出,短暫存在後淡出。
 * 整個產品多了一層「魔法感」,不影響點擊互動。
 */
export default function CursorTrail() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setReady(true));
  }, []);

  const options = useMemo(
    () => ({
      fpsLimit: 60,
      fullScreen: { enable: false },
      background: { color: { value: "transparent" } },
      particles: {
        number: { value: 0 }, // 沒有預設粒子,全部靠 trail emit
        color: { value: ["#C8472B", "#D4A574", "#1B3A5C"] },
        shape: { type: "circle" },
        opacity: {
          value: { min: 0.75, max: 1.0 },
          animation: { enable: true, speed: 1.2, startValue: "max", destroy: "min" },
        },
        size: {
          value: { min: 2.5, max: 6 },
          animation: { enable: true, speed: 2, startValue: "max", destroy: "min" },
        },
        move: {
          enable: true,
          speed: { min: 0.3, max: 1.2 },
          direction: "none",
          random: true,
          straight: false,
          outModes: { default: "destroy" },
        },
        life: {
          duration: { value: 1.8, sync: false },
          count: 1,
        },
      },
      interactivity: {
        detectsOn: "window",
        events: {
          onHover: {
            enable: true,
            mode: "trail",
            parallax: { enable: false },
          },
        },
        modes: {
          trail: {
            delay: 0.008,
            pauseOnStop: true,
            quantity: 3,
            particles: {
              color: { value: ["#C8472B", "#D4A574", "#1B3A5C"] },
              size: { value: { min: 2.5, max: 5.5 } },
              opacity: { value: { min: 0.75, max: 1.0 } },
              move: {
                speed: { min: 0.2, max: 0.9 },
                outModes: { default: "destroy" },
              },
              life: {
                duration: { value: 1.8 },
                count: 1,
              },
            },
          },
        },
      },
      detectRetina: true,
    }),
    []
  );

  if (!ready) return null;

  return (
    <div className="cursor-trail">
      <Particles id="cursor-trail" options={options} />
    </div>
  );
}
