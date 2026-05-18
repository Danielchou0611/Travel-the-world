import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import QuizPage from "./pages/QuizPage";
import ResultPage from "./pages/ResultPage";
import MapPlanningPage from "./pages/MapPlanningPage";
import ExplorePage from "./pages/ExplorePage";
import PlanJPage from "./pages/PlanJPage";
import PlanPPage from "./pages/PlanPPage";
import ItineraryPage from "./pages/ItineraryPage";
import TourPage from "./pages/TourPage";
import CursorTrail from "./components/CursorTrail";
import MiniNav from "./components/MiniNav";

export default function App() {
  return (
    <BrowserRouter>
      {/* 全站滑鼠拖尾(nyancat2 風,不擋互動) */}
      <CursorTrail />
      {/* 全站迷你導航:左上極淡 wordmark → 點/⌘K 開全螢幕 overlay */}
      <MiniNav />
      <Routes>
        {/* 預設進來先測 quiz */}
        <Route path="/" element={<Navigate to="/quiz" replace />} />

        {/* MBTI 3 題快測 */}
        <Route path="/quiz" element={<QuizPage />} />

        {/* 結果頁 (J 人 / P 人) */}
        <Route path="/result/:type" element={<ResultPage />} />

        {/* J 人 flow · 入口:結構化偏好滑桿 */}
        <Route path="/plan-j" element={<PlanJPage />} />

        {/* J 人 flow · 結果:Austin MapPlanningPage(timeline + 攻略對話)*/}
        <Route path="/plan" element={<MapPlanningPage />} />

        {/* P 人 flow · 入口:隨性探索 mood chips */}
        <Route path="/explore" element={<ExplorePage />} />

        {/* P 人 flow · 結果:4 個 day theme + 卡片刷新(無時間表)*/}
        <Route path="/plan-p" element={<PlanPPage />} />

        {/* 主產品層:Wen Gemini 生成的行程 + Day tab + ChatBox + What-if(Apple port) */}
        <Route path="/itinerary" element={<ItineraryPage />} />
        <Route path="/itinerary/:tripId" element={<ItineraryPage />} />

        {/* 60 秒體驗頁:訪客從 brand_preview「60 秒體驗」進來,不需後端 */}
        <Route path="/tour" element={<TourPage />} />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/quiz" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
