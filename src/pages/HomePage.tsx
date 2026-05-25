import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { TripPreferences, Interest } from '../types';
import { generateTrip } from '../services/api';
import occupathLogo from '../assets/occupath_logo_v2.png';
import occupathIcon from '../assets/occupath_o.png';

// ─── P人流程資料 ─────────────────────────────────────────
const MOODS = [
  { emoji: '⛩', label: '神社' },
  { emoji: '☕', label: '巷弄咖啡' },
  { emoji: '🍜', label: '拉麵' },
  { emoji: '🌊', label: '看海' },
  { emoji: '🚶', label: '隨便走' },
  { emoji: '🎨', label: '美術館' },
  { emoji: '🌸', label: '賞花' },
  { emoji: '🍶', label: '居酒屋' },
];

interface Spot {
  id: string; name: string; area: string; tag: string; whisper: string;
}

const MOCK_SPOTS: Spot[] = [
  { id: 's1', name: '下鴨神社', area: '京都', tag: '神社', whisper: '晨光穿過糺之森,森林與神社合而為一。' },
  { id: 's2', name: '伏見稻荷大社', area: '京都', tag: '神社', whisper: '千本鳥居要走到山頂,夜晚最靜謐。' },
  { id: 's3', name: '明治神宮', area: '東京', tag: '神社', whisper: '市中心的森林,離開原宿車站就是另一個時空。' },
  { id: 's4', name: '嚴島神社', area: '廣島', tag: '神社', whisper: '漲潮時鳥居漂浮海上,退潮時可以走過去。' },
  { id: 's5', name: '% Arabica 京都嵐山', area: '京都', tag: '巷弄咖啡', whisper: '白色簡約,渡月橋畔的網紅店。' },
  { id: 's6', name: '蔦屋書店代官山', area: '東京', tag: '巷弄咖啡', whisper: '三棟相連的書店,書蟲的天堂。' },
  { id: 's7', name: 'Blue Bottle 清澄白河', area: '東京', tag: '巷弄咖啡', whisper: '美國藍瓶日本一號店,工業風老倉庫。' },
  { id: 's8', name: '松本咖啡', area: '金澤', tag: '巷弄咖啡', whisper: '60 年老店,虹吸壺手沖。' },
  { id: 's9', name: '麵屋一燈', area: '東京', tag: '拉麵', whisper: '魚介湯頭排隊兩小時的店,值得。' },
  { id: 's10', name: '二郎本店', area: '東京', tag: '拉麵', whisper: '二郎系本宗,要先學暗號才能點餐。' },
  { id: 's11', name: '一蘭拉麵總本店', area: '福岡', tag: '拉麵', whisper: '個室專注吃麵,只看到一雙手的服務。' },
  { id: 's12', name: '麵屋武藏', area: '東京', tag: '拉麵', whisper: '宮本武藏命名的店,豚骨湯黑得有戲劇感。' },
  { id: 's13', name: '鎌倉海濱', area: '鎌倉', tag: '看海', whisper: '電影《海街日記》取景地,風很大。' },
  { id: 's14', name: '江之島', area: '鎌倉', tag: '看海', whisper: '鎌倉旁的小島,可走可纜車。' },
  { id: 's15', name: '由比之濱', area: '鎌倉', tag: '看海', whisper: '夏天衝浪,冬天散步,湘南的標誌。' },
  { id: 's16', name: '稚內最北端', area: '北海道', tag: '看海', whisper: '日本最北的海岸,看得到俄羅斯。' },
  { id: 's17', name: '町家小巷先斗町', area: '京都', tag: '隨便走', whisper: '兩人並肩會擦肩的窄巷,夜晚最美。' },
  { id: 's18', name: '谷中銀座', area: '東京', tag: '隨便走', whisper: '老東京下町,可以遇到很多貓。' },
  { id: 's19', name: '麻布十番', area: '東京', tag: '隨便走', whisper: '外國人聚集的精緻街區,適合迷路。' },
  { id: 's20', name: 'ひがし茶屋街', area: '金澤', tag: '隨便走', whisper: '藝妓還會出現的茶屋街道。' },
  { id: 's21', name: '金澤 21 世紀美術館', area: '金澤', tag: '美術館', whisper: '玻璃圓盤建築,游泳池作品必看。' },
  { id: 's22', name: '東京 teamLab Borderless', area: '東京', tag: '美術館', whisper: '沉浸式數位藝術,光線在牆上跑。' },
  { id: 's23', name: '直島地中美術館', area: '瀨戶內', tag: '美術館', whisper: '安藤忠雄設計的地下美術館,只有 4 件作品。' },
  { id: 's24', name: '大原美術館', area: '倉敷', tag: '美術館', whisper: '日本第一間西洋美術館,藏有莫內、塞尚。' },
  { id: 's25', name: '新宿御苑', area: '東京', tag: '賞花', whisper: '市中心的櫻花海,3 月底 4 月初最盛。' },
  { id: 's26', name: '上野公園', area: '東京', tag: '賞花', whisper: '1100 棵櫻花樹,夜櫻打燈。' },
  { id: 's27', name: '嵐山竹林', area: '京都', tag: '賞花', whisper: '竹林沙沙作響,清晨人最少。' },
  { id: 's28', name: '弘前公園', area: '青森', tag: '賞花', whisper: '東北最美的櫻花地,城堡 + 護城河。' },
  { id: 's29', name: '黃金街', area: '東京', tag: '居酒屋', whisper: '二戰後遺留的小巷,200 家小店各有性格。' },
  { id: 's30', name: '思い出橫丁', area: '東京', tag: '居酒屋', whisper: '煙霧裊裊的烤雞肉串巷子。' },
  { id: 's31', name: '天滿宮裏的居酒屋街', area: '大阪', tag: '居酒屋', whisper: '在地人居多,沒有觀光客的味道。' },
  { id: 's32', name: '京都先斗町河岸', area: '京都', tag: '居酒屋', whisper: '鴨川河畔的露天平台,夏天必訪。' },
];

function shuffleSpots(arr: Spot[], seed: number): Spot[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(((Math.sin(seed * (i + 1)) + 1) / 2) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- Icons ---
const IconFood = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /><path d="M7 2v20" /><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" /></svg>;
const IconCulture = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 10h16" /><path d="M10 21V10" /><path d="M14 21V10" /><path d="M3 21h18" /><path d="m12 3 8 7H4Z" /></svg>;
const IconShopping = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>;
const IconNature = () => <svg width="20" height="20" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22c4-4 8-9 8-14a8 8 0 1 0-16 0c0 5 4 10 8 14z" /></svg>;

const INTERESTS: { key: Interest; label: string; icon: React.ReactNode }[] = [
  { key: '美食', label: '美食', icon: <IconFood /> },
  { key: '文化', label: '文化', icon: <IconCulture /> },
  { key: '購物', label: '購物', icon: <IconShopping /> },
  { key: '自然', label: '自然', icon: <IconNature /> },
];

const DESTINATION_OPTIONS = [
  '東京',
  '大阪',
  '京都',
  '北海道',
  '札幌',
  '福岡',
  '沖繩',
  '名古屋',
  '橫濱',
  '神戶',
  '奈良',
  '廣島',
  '仙台',
  '金澤',
  '箱根',
];



export default function HomePage() {
  const navigate = useNavigate();

  const bubbleParticles = useMemo(() => {
    return [...Array(16)].map((_, i) => {
      let startX, startY;
      const edge = Math.floor(Math.random() * 4);
      if (edge === 0) {
        startX = Math.random() * 100;
        startY = Math.random() * 25;
      } else if (edge === 1) {
        startX = 75 + Math.random() * 25;
        startY = Math.random() * 100;
      } else if (edge === 2) {
        startX = Math.random() * 100;
        startY = 75 + Math.random() * 25;
      } else {
        startX = Math.random() * 25;
        startY = Math.random() * 100;
      }

      // Floating direction (mostly outward)
      const angle = Math.random() * Math.PI * 2;
      const distance = 8 + Math.random() * 15;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      const size = 2 + Math.random() * 3.5;
      const delay = Math.random() * 3.5;
      const duration = 1.8 + Math.random() * 2.0;
      return { id: i, startX, startY, tx, ty, size, color: 'var(--ochre)', delay, duration };
    });
  }, []);

  const cardParticles = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => {
      const startX = Math.random() * 100;
      const startY = Math.random() * 100;
      const angle = Math.random() * Math.PI * 2;
      const distance = 15 + Math.random() * 30;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      const size = 1.5 + Math.random() * 3.5;
      const delay = Math.random() * 4.0;
      const duration = 2.5 + Math.random() * 3.0;
      const br = `${30 + Math.random() * 40}% ${30 + Math.random() * 40}% ${30 + Math.random() * 40}% ${30 + Math.random() * 40}% / ${30 + Math.random() * 40}% ${30 + Math.random() * 40}% ${30 + Math.random() * 40}% ${30 + Math.random() * 40}%`;
      return { id: i, startX, startY, tx, ty, size, delay, duration, br };
    });
  }, []);

  const [viewState, setViewState] = useState<'initial' | 'personality' | 'form' | 'explore'>('initial');
  const [layoutViewState, setLayoutViewState] = useState<'initial' | 'personality' | 'form' | 'explore'>('initial');
  // ─── P人流程 state ───────────────────────────────────────
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [shuffleSeed, setShuffleSeed] = useState(1);
  const [collected, setCollected] = useState<Spot[]>([]);

  const pSuggestions = useMemo(() => {
    if (!selectedMood) return [];
    const pool = MOCK_SPOTS.filter((s) => s.tag === selectedMood);
    return shuffleSpots(pool, shuffleSeed).slice(0, 3);
  }, [selectedMood, shuffleSeed]);

  const isCollected = (id: string) => collected.find((s) => s.id === id);

  function toggleCollect(spot: Spot) {
    if (isCollected(spot.id)) {
      setCollected(collected.filter((s) => s.id !== spot.id));
    } else {
      setCollected([...collected, spot]);
    }
  }
  const [days, setDays] = useState(7);
  const [budget, setBudget] = useState<number | ''>(30000);
  const [interests, setInterests] = useState<Interest[]>(['美食', '文化']);
  const [destinationInput, setDestinationInput] = useState('');
  const [destinations, setDestinations] = useState<string[]>([]);
  const [explorationStyle, setExplorationStyle] = useState(50);
  const [foodVsAttractions, setFoodVsAttractions] = useState(50);
  const [mustVisit, setMustVisit] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [ragContent, setRagContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingDots, setLoadingDots] = useState('');
  const [jpyRate, setJpyRate] = useState<number>(4.76);
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const normalizedDestinationInput = destinationInput.trim();
  const destinationSuggestions = normalizedDestinationInput
    ? DESTINATION_OPTIONS.filter(option => option.includes(normalizedDestinationInput) && !destinations.includes(option))
    : DESTINATION_OPTIONS.filter(option => !destinations.includes(option)).slice(0, 6);

  useEffect(() => {
    fetch('https://api.exchangerate-api.com/v4/latest/TWD')
      .then(res => res.json())
      .then(data => {
        if (data?.rates?.JPY) {
          setJpyRate(data.rates.JPY);
        }
      })
      .catch(err => console.error('Failed to fetch exchange rate', err));
  }, []);

  // Animate loading dots while `loading` is true.
  useEffect(() => {
    if (!loading) {
      setLoadingDots('');
      return;
    }

    const frames = ['.', '..', '...', '..'];
    let idx = 0;
    // show first frame immediately
    setLoadingDots(frames[0]);
    const id = setInterval(() => {
      idx = (idx + 1) % frames.length;
      setLoadingDots(frames[idx]);
    }, 400);

    return () => clearInterval(id);
  }, [loading]);

  const toggleInterest = (interest: Interest) => {
    setInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const addDestination = (value: string) => {
    const nextDestination = value.trim();
    if (!nextDestination) return;

    setDestinations(prev => (prev.includes(nextDestination) ? prev : [...prev, nextDestination]));
    setDestinationInput('');
    requestAnimationFrame(() => {
      if (destinationInputRef.current) {
        destinationInputRef.current.value = '';
      }
    });
  };

  const removeDestination = (value: string) => {
    setDestinations(prev => prev.filter(destination => destination !== value));
  };

  const handleDestinationKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !destinationInput && destinations.length > 0) {
      setDestinations(prev => prev.slice(0, -1));
    }
    if (e.key === 'Enter') {
      const trimmed = destinationInput.trim();
      if (trimmed) {
        e.preventDefault();
        addDestination(destinationSuggestions[0] ?? destinationInput);
      }
    }
  };

  const handleSubmit = async () => {
    if (interests.length === 0) {
      setError('請至少選擇一個興趣偏好');
      return;
    }
    if (destinations.length === 0) {
      setError('請至少選擇一個想去的城市');
      return;
    }
    setError('');
    setLoading(true);

    const prefs: TripPreferences = {
      days,
      budget: Number(budget) || 0,
      interests,
      destination: destinations,
      explorationStyle,
      foodVsAttractions,
      mustVisit,
      ragContent,
      specialRequirements,
      type: 'J',
    };

    try {
      const trip = await generateTrip(prefs);

      // Validate trip object
      if (!trip || !trip.id) {
        console.error('Invalid trip data:', trip);
        setError('後端返回的行程數據無效，請檢查 API 回應格式');
        setLoading(false);
        return;
      }

      navigate(`/itinerary/${trip.id}`, { state: { trip } });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'AI 規劃失敗，請稍後再試';
      console.error('❌ generateTrip error:', err);
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="bg-hero" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* ── Navbar ── */}
      <nav className="homepage-nav" style={{ background: 'transparent', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 10 }} onClick={() => setViewState('initial')}>
          <img src={occupathLogo} alt="Occupath Logo" style={{ height: 44, width: 'auto', objectFit: 'contain' }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{
            background: 'transparent',
            color: 'rgba(255, 255, 255, 0.95)',
            border: 'none',
            boxShadow: 'inset 0 0 0 2px rgba(255, 255, 255, 0.7)',
            borderRadius: 8,
            padding: '8px 20px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            minHeight: 44,
            letterSpacing: '0.04em',
            fontFamily: 'var(--font-serif)',
            transition: 'all 200ms ease',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = 'inset 0 0 0 3px #fff';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = 'inset 0 0 0 2px rgba(255, 255, 255, 0.7)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.95)';
            }}
          >Sign In</button>
        </div>
      </nav>

      {/* ── Main Container ── */}
      <div className={`homepage-main ${layoutViewState === 'form' ? 'form-view centered-view' : layoutViewState === 'explore' || layoutViewState === 'personality' ? 'centered-view' : ''}`}>

        {/* ── Left ── */}
        <div className={`homepage-left ${layoutViewState === 'form' ? 'form-view centered-view' : layoutViewState === 'explore' || layoutViewState === 'personality' ? 'centered-view' : ''}`}>

          <AnimatePresence mode="wait" onExitComplete={() => setLayoutViewState(viewState)}>
            {/* ===== initial view ===== */}
            {viewState === 'initial' && (
              <motion.div
                key="initial-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.3, delay: 0.6 } }}
                className="hero-content"
              >
                {/* Icon */}
                <motion.img
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.5, ease: 'easeOut', delay: 0.1 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.4 } }}
                  src={occupathIcon} alt="Occupath Icon" style={{ width: 180, height: 180, objectFit: 'contain', flexShrink: 0 }} />

                {/* Text column */}
                <div className="hero-text-container" style={{ width: '100%' }}>
                  <div className="hero-logo">
                    {/* Eyebrow */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 1.0 }}
                      exit={{ opacity: 0, y: -15, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.3 } }}
                      style={{ fontFamily: 'var(--font-serif)', fontSize: 14, fontWeight: 500, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'var(--ochre)', marginBottom: 10 }}>
                      Occupy your path · Own your reason
                    </motion.div>
                    {/* Main title */}
                    <motion.h1
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                      exit={{ opacity: 0, y: -15, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.3 } }}
                      style={{ fontFamily: '"Cormorant Garamond", "Shippori Mincho", serif', fontSize: 100, fontWeight: 300, color: 'var(--prussian)', margin: 0, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
                      Occupath
                    </motion.h1>
                    {/* Accent rule */}
                    <motion.div
                      initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 1.0 }}
                      exit={{ opacity: 0, scaleX: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.3 } }}
                      style={{ width: 100, height: 2, background: 'var(--ochre)', marginTop: 16, transformOrigin: 'left' }} />
                  </div>

                  <motion.h2
                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 1.6 }}
                    exit={{ opacity: 0, y: -15, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 } }}
                    style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 400, lineHeight: 1.3, color: 'var(--sumi-warm)', margin: 0, marginTop: 20, letterSpacing: '-0.01em' }}>
                    讓你的路, 由你自己佔據
                  </motion.h2>

                  <motion.p
                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 2.2 }}
                    exit={{ opacity: 0, y: -15, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 } }}
                    style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 300, color: 'var(--mist)', marginTop: 16, lineHeight: 1.65, maxWidth: 460 }}>
                    日本自由行 · AI 規劃
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 2.4 }}
                    exit={{ opacity: 0, y: -15, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.0 } }}
                    style={{ marginTop: 40, alignSelf: 'flex-start' }}
                  >
                    <button
                      className="quiz-intro-cta"
                      onClick={() => setViewState('personality')}
                    >
                      <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        開始旅程
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                      </span>

                      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
                        {bubbleParticles.map((p) => (
                          <div
                            key={p.id}
                            className="bubble-particle"
                            style={{
                              position: 'absolute',
                              top: `${p.startY}%`,
                              left: `${p.startX}%`,
                              width: p.size,
                              height: p.size,
                              background: p.color,
                              borderRadius: '50%',
                              marginLeft: -(p.size / 2),
                              marginTop: -(p.size / 2),
                              '--tx': `${p.tx}px`,
                              '--ty': `${p.ty}px`,
                              animationDelay: `${p.delay}s`,
                              animationDuration: `${p.duration}s`,
                            } as React.CSSProperties}
                          />
                        ))}
                      </div>
                    </button>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* ===== personality view ===== */}
            {viewState === 'personality' && (
              <motion.div
                key="personality-view"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 20 }}
              >
                <motion.h2
                  exit={{ opacity: 0, y: -15, transition: { duration: 0.6, delay: 0.2 } }}
                  style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400, color: 'var(--prussian)', marginBottom: 24, letterSpacing: '-0.01em' }}
                >
                  選擇你的旅行風格
                </motion.h2>

                <div className="personality-btns" style={{ justifyContent: 'center', gap: 24 }}>
                  {/* J Card */}
                  <motion.div exit={{ opacity: 0, y: -15, transition: { duration: 0.6, delay: 0.1 } }}>
                    <button
                      className="quiz-personality-card j-card"
                      onClick={() => setViewState('form')}
                      aria-label="行程指揮官"
                      style={{ width: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '36px 24px', minHeight: 280, gap: 16, position: 'relative', overflow: 'hidden' }}
                    >
                      {/* Wave decoration */}
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, height: 50,
                        background: 'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1200 120%22 preserveAspectRatio=%22none%22%3E%3Cpath d=%22M0,30 Q300,10 600,30 T1200,30 L1200,120 L0,120 Z%22 fill=%22%234a7ba7%22 opacity=%220.5%22/%3E%3C/svg%3E")',
                        backgroundSize: '100% 100%'
                      }} />

                      {/* Particles */}
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0, WebkitMaskImage: 'linear-gradient(to bottom, black calc(100% - 70px), transparent calc(100% - 30px))', maskImage: 'linear-gradient(to bottom, black calc(100% - 70px), transparent calc(100% - 30px))' }}>
                        {cardParticles.map((p) => (
                          <div
                            key={p.id}
                            className="bubble-particle"
                            style={{
                              position: 'absolute',
                              top: `${p.startY}%`,
                              left: `${p.startX}%`,
                              width: p.size,
                              height: p.size,
                              background: 'rgba(255, 255, 255, 0.4)',
                              borderRadius: p.br,
                              marginLeft: -(p.size / 2),
                              marginTop: -(p.size / 2),
                              '--tx': `${p.tx}px`,
                              '--ty': `${p.ty}px`,
                              animationDelay: `${p.delay}s`,
                              animationDuration: `${p.duration}s`,
                            } as React.CSSProperties}
                          />
                        ))}
                      </div>
                      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-serif)', letterSpacing: '0.02em' }}>行程指揮官</div>
                        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-serif)', lineHeight: 1.6, padding: '0 8px' }}>「天數、預算、想去什麼都先說清楚,讓 AI 一次排好」</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.15em', fontWeight: 500, marginTop: 8 }}>THE CONDUCTOR · J 人</div>
                      </div>
                    </button>
                  </motion.div>

                  {/* P Card */}
                  <motion.div exit={{ opacity: 0, y: -15, transition: { duration: 0.6, delay: 0.0 } }}>
                    <button
                      className="quiz-personality-card p-card"
                      onClick={() => setViewState('explore')}
                      aria-label="隨興探險家"
                      style={{ width: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '36px 24px', minHeight: 280, gap: 16, position: 'relative', overflow: 'hidden' }}
                    >
                      {/* Cherry blossom */}
                      <div style={{
                        position: 'absolute', right: -8, top: -16, width: 110, height: 110, opacity: 0.35,
                        background: 'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22%3E%3Cpath d=%22M95 120 Q90 150 95 200 Q100 150 105 120%22 fill=%22%238b6f47%22/%3E%3Ccircle cx=%22100%22 cy=%2260%22 r=%2250%22 fill=%22%23f0a6c3%22/%3E%3Ccircle cx=%2270%22 cy=%2280%22 r=%2235%22 fill=%22%23f0a6c3%22/%3E%3Ccircle cx=%22130%22 cy=%2280%22 r=%2235%22 fill=%22%23f0a6c3%22/%3E%3C/svg%3E")',
                        backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat'
                      }} />

                      {/* Particles */}
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0, WebkitMaskImage: 'radial-gradient(circle at calc(100% - 30px) 30px, transparent 80px, black 140px)', maskImage: 'radial-gradient(circle at calc(100% - 30px) 30px, transparent 80px, black 140px)' }}>
                        {cardParticles.map((p) => (
                          <div
                            key={p.id}
                            className="bubble-particle"
                            style={{
                              position: 'absolute',
                              top: `${p.startY}%`,
                              left: `${p.startX}%`,
                              width: p.size,
                              height: p.size,
                              background: 'rgba(255, 255, 255, 0.4)',
                              borderRadius: p.br,
                              marginLeft: -(p.size / 2),
                              marginTop: -(p.size / 2),
                              '--tx': `${p.tx}px`,
                              '--ty': `${p.ty}px`,
                              animationDelay: `${p.delay}s`,
                              animationDuration: `${p.duration}s`,
                            } as React.CSSProperties}
                          />
                        ))}
                      </div>
                      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-serif)', letterSpacing: '0.02em' }}>隨興探險家</div>
                        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-serif)', lineHeight: 1.6, padding: '0 8px' }}>「看心情慢慢挑,不要時間表,只要一個方向」</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.15em', fontWeight: 500, marginTop: 8 }}>THE WANDERER · P 人</div>
                      </div>
                    </button>
                  </motion.div>
                </div>

                <motion.div
                  exit={{ opacity: 0, transition: { duration: 0.4, delay: 0 } }}
                  style={{ marginTop: 30, textAlign: 'center' }}
                >
                  <span
                    onClick={() => navigate('/quiz')}
                    style={{ cursor: 'pointer', fontSize: 14, color: 'var(--ochre)', fontFamily: 'var(--font-serif)', textDecoration: 'none' }}
                  >
                    不知道自己的旅行風格？點我做測驗
                  </span>
                </motion.div>
              </motion.div>
            )}

            {/* ===== J form view ===== */}
            {viewState === 'form' && (
              <motion.div key="form-view" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, filter: 'blur(10px)', transition: { duration: 0.6 } }}>
                <button
                  onClick={() => setViewState('personality')}
                  style={{
                    background: 'transparent', border: 'none', color: 'var(--mist)',
                    display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                    marginBottom: 16, fontSize: 14, fontWeight: 500,
                    fontFamily: 'var(--font-serif)', padding: '4px 8px 4px 0',
                    transition: 'color 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    minHeight: 44,
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--prussian)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--mist)'}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                  Back
                </button>

                {/* Section eyebrow */}
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 11, fontWeight: 500, letterSpacing: '1.6px', textTransform: 'uppercase', color: 'var(--mist)', marginBottom: 6 }}>J 人 精準規劃</div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 400, color: 'var(--prussian)', marginBottom: 20, lineHeight: 1.2 }}>告訴我你的旅遊偏好</h3>

                <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Destination */}
                  <div>
                    <label className="form-label" style={{ color: 'var(--sumi-warm)' }}>想去的城市 <span style={{ color: 'var(--vermillion)' }}>*</span></label>
                    <div style={{ position: 'relative' }}>
                      <div className="glass-input" style={{ minHeight: 46, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: '8px 12px' }}>
                        {destinations.map(destination => (
                          <span key={destination} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999, background: 'rgba(18,48,65,0.08)', color: 'var(--prussian)', fontSize: 12, fontWeight: 500 }}>
                            {destination}
                            <button type="button" onClick={() => removeDestination(destination)} style={{ width: 16, height: 16, border: 'none', background: 'transparent', color: 'var(--mist)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }} aria-label={`刪除 ${destination}`}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                          </span>
                        ))}
                        <input ref={destinationInputRef} type="text" value={destinationInput} onChange={e => setDestinationInput(e.target.value)} onKeyDown={handleDestinationKeyDown} onFocus={() => setError('')} placeholder={destinations.length === 0 ? '輸入城市名稱，例如：東京' : '輸入更多城市'} className="destination-input" style={{ border: 'none', outline: 'none', flex: 1, minWidth: 120, fontSize: 14, fontFamily: 'inherit', background: 'transparent', color: 'var(--sumi-warm)' }} />
                      </div>
                      {destinationSuggestions.length > 0 && normalizedDestinationInput && (
                        <div className="glass-card" style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 20, overflow: 'hidden' }}>
                          {destinationSuggestions.map(option => (
                            <button key={option} type="button" onClick={() => addDestination(option)} style={{ width: '100%', textAlign: 'left', border: 'none', background: '#FFF', padding: '12px 14px', cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font-serif)', color: 'var(--sumi-warm)', borderBottom: '1px solid var(--color-border)' }}>
                              {option}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Days & Budget */}
                  <div className="form-grid">
                    <div>
                      <label className="form-label" style={{ color: 'var(--sumi-warm)' }}>旅遊天數 <span style={{ color: 'var(--vermillion)' }}>*</span></label>
                      <div style={{ position: 'relative' }}>
                        <input type="number" min={1} max={30} value={days} onChange={e => setDays(Math.min(30, Math.max(1, Number(e.target.value))))} className="glass-input" style={{ paddingRight: 36 }} />
                        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--mist)' }}>天</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        {[3, 5, 7, 10, 14].map(d => (
                          <button key={d} type="button" className="slow-hover-float" onClick={() => setDays(d)} style={{ padding: '3px 9px', borderRadius: 6, border: `1px solid ${days === d ? 'var(--prussian)' : 'var(--color-border)'}`, background: days === d ? 'var(--prussian)' : 'transparent', color: days === d ? '#FFF' : 'var(--mist)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-serif)' }}>{d}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="form-label" style={{ color: 'var(--sumi-warm)' }}>總預算 (台幣) <span style={{ color: 'var(--vermillion)' }}>*</span></label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--sumi-warm)', fontWeight: 500 }}>NT$</span>
                        <input type="number" min={1000} step={1000} value={budget} onChange={e => setBudget(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))} className="glass-input" style={{ paddingLeft: 48 }} />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--mist)', marginTop: 8 }}>日幣約：¥{Math.round((Number(budget) || 0) * jpyRate).toLocaleString('en-US')}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        {[30000, 50000, 80000, 100000].map(b => (
                          <button key={b} type="button" className="slow-hover-float" onClick={() => setBudget(b)} style={{ padding: '3px 9px', borderRadius: 6, border: `1px solid ${budget === b ? 'var(--prussian)' : 'var(--color-border)'}`, background: budget === b ? 'var(--prussian)' : 'transparent', color: budget === b ? '#FFF' : 'var(--mist)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-serif)' }}>{b.toLocaleString()}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Interests */}
                  <div>
                    <label className="form-label mb-3" style={{ color: 'var(--sumi-warm)' }}>興趣偏好 <span style={{ color: 'var(--vermillion)' }}>*</span></label>
                    <div className="interest-grid">
                      {INTERESTS.map(item => (
                        <div key={item.key} className={`interest-item ${interests.includes(item.key) ? 'selected' : ''}`} onClick={() => toggleInterest(item.key)} style={{ borderColor: interests.includes(item.key) ? 'var(--prussian)' : 'var(--color-border)', background: interests.includes(item.key) ? 'rgba(18,48,65,0.06)' : '#FFF' }}>
                          <span style={{ color: interests.includes(item.key) ? 'var(--prussian)' : 'var(--mist)', display: 'flex' }}>{item.icon}</span>
                          <span style={{ fontSize: 13, fontWeight: 500, color: interests.includes(item.key) ? 'var(--prussian)' : 'var(--mist)' }}>{item.label}</span>
                        </div>
                      ))}
                    </div>
                    {error && <p style={{ fontSize: 12, color: 'var(--vermillion)', marginTop: 8 }}>{error}</p>}
                  </div>

                  {/* Style Sliders */}
                  <div style={{ marginTop: 4 }}>
                    <label className="form-label" style={{ color: 'var(--sumi-warm)' }}>旅遊風格</label>
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--mist)' }}>步調：{explorationStyle <= 30 ? '悠閒' : explorationStyle >= 70 ? '緊湊' : '適中'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 11, color: 'var(--mist)' }}>慢活</span>
                        <input type="range" min={0} max={100} value={explorationStyle} onChange={e => setExplorationStyle(Number(e.target.value))} className="style-slider" style={{ flex: 1 }} />
                        <span style={{ fontSize: 11, color: 'var(--mist)' }}>充實</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--mist)' }}>偏重：{foodVsAttractions <= 30 ? '美食' : foodVsAttractions >= 70 ? '景點' : '均衡'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 11, color: 'var(--mist)' }}>美食</span>
                        <input type="range" min={0} max={100} value={foodVsAttractions} onChange={e => setFoodVsAttractions(Number(e.target.value))} className="style-slider" style={{ flex: 1 }} />
                        <span style={{ fontSize: 11, color: 'var(--mist)' }}>景點</span>
                      </div>
                    </div>
                  </div>

                  {/* Text inputs */}
                  <div>
                    <label className="form-label" style={{ color: 'var(--sumi-warm)' }}>必去景點</label>
                    <input type="text" placeholder="例如：清水寺、藍瓶咖啡..." value={mustVisit} onChange={e => setMustVisit(e.target.value)} className="glass-input" />
                  </div>
                  <div>
                    <label className="form-label" style={{ color: 'var(--sumi-warm)' }}>參考攻略</label>
                    <textarea placeholder="貼入想納入行程的攻略或筆記..." value={ragContent} onChange={e => setRagContent(e.target.value)} className="glass-input" style={{ height: 60, resize: 'none' }} />
                  </div>
                  <div>
                    <label className="form-label" style={{ color: 'var(--sumi-warm)' }}>行程期望</label>
                    <textarea id="special-requirements" placeholder="例如：希望放鬆心情、深入體驗地方文化、希望行程緊湊充實..." value={specialRequirements} onChange={e => setSpecialRequirements(e.target.value)} className="glass-input" style={{ height: 72, resize: 'none' }} />
                  </div>

                  <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {loading ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span>行程規劃中</span>
                        <span className="loading-dots" aria-hidden><span>.</span><span>.</span><span>.</span></span>
                      </span>
                    ) : '開始安排行程'}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ===== P explore view ===== */}
            {viewState === 'explore' && (
              <motion.div key="explore-view" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, filter: 'blur(10px)', transition: { duration: 0.6 } }} style={{ width: '100%' }}>
                {/* Back button */}
                <button
                  onClick={() => { setViewState('personality'); setSelectedMood(null); setShuffleSeed(1); }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--mist)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 16, fontSize: 14, fontWeight: 500, fontFamily: 'var(--font-serif)', padding: '4px 8px 4px 0', transition: 'color 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94)', minHeight: 44 }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--prussian)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--mist)'}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                  Back
                </button>

                {/* Eyebrow */}
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 11, fontWeight: 500, letterSpacing: '1.6px', textTransform: 'uppercase', color: 'var(--vermillion)', marginBottom: 6 }}>P 人 隨性探索</div>

                <AnimatePresence mode="wait">
                  {/* ── Step 1: Mood Picker ── */}
                  {!selectedMood ? (
                    <motion.div
                      key="mood-picker"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 400, color: 'var(--sumi-warm)', marginBottom: 6, lineHeight: 1.2 }}>今天，你想做什麼？</h3>
                      <p style={{ fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--mist)', marginBottom: 24, lineHeight: 1.6 }}>不用想得太久。一個閃過腦海的詞就好。</p>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                        {MOODS.map((m, i) => (
                          <motion.button
                            key={m.label}
                            className="slow-hover-float-lg"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedMood(m.label)}
                            style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                              padding: '18px 10px', background: '#fff',
                              border: '1px solid var(--color-border)', borderRadius: 12,
                              cursor: 'pointer', fontFamily: 'var(--font-serif)',
                            }}
                          >
                            <span style={{ fontSize: 26, lineHeight: 1 }}>{m.emoji}</span>
                            <span style={{ fontSize: 12, color: 'var(--sumi-warm)', fontWeight: 500 }}>{m.label}</span>
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    /* ── Step 2: Spot Suggestions ── */
                    <motion.div
                      key="spot-suggestions"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, color: 'var(--sumi-warm)', marginBottom: 4, lineHeight: 1.2 }}>
                        {MOODS.find((m) => m.label === selectedMood)?.emoji} {selectedMood}
                      </h3>
                      <p style={{ fontFamily: 'var(--font-serif)', fontSize: 12, color: 'var(--mist)', marginBottom: 20, letterSpacing: '0.1em' }}>— 為你抽出 3 個地方 —</p>

                      {/* Spot Cards */}
                      <div className="explore-spots-container">
                        <AnimatePresence mode="popLayout">
                          {pSuggestions.map((spot, i) => (
                            <motion.div
                              key={`${spot.id}-${shuffleSeed}`}
                              className="slow-hover-float-lg"
                              initial={{ opacity: 0, y: 30, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -30, scale: 0.96 }}
                              transition={{ delay: i * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                              style={{
                                background: isCollected(spot.id) ? '#fdf5f5' : '#fff',
                                border: `1px solid ${isCollected(spot.id) ? 'var(--vermillion)' : 'var(--color-border)'}`,
                                borderRadius: 12, padding: '20px 22px',
                                transition: 'border-color 0.2s, background 0.2s',
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'flex-start',
                              }}
                            >
                              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 600, color: 'var(--prussian)', marginBottom: 3 }}>{spot.name}</div>
                              <div style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--mist)', marginBottom: 8, textTransform: 'uppercase', fontFamily: 'var(--font-serif)' }}>— {spot.area} —</div>
                              <p style={{ fontSize: 13, color: 'var(--mist)', lineHeight: 1.6, marginBottom: 14, fontStyle: 'italic', flexGrow: 1 }}>「{spot.whisper}」</p>
                              <button
                                className="slow-hover-float"
                                onClick={() => toggleCollect(spot)}
                                style={{
                                  fontSize: 11, letterSpacing: '0.1em', padding: '5px 14px',
                                  border: `1px solid ${isCollected(spot.id) ? 'var(--vermillion)' : 'var(--color-border)'}`,
                                  borderRadius: 6, background: isCollected(spot.id) ? '#fef0f1' : 'transparent',
                                  color: isCollected(spot.id) ? 'var(--vermillion)' : 'var(--mist)',
                                  cursor: 'pointer', fontFamily: 'var(--font-serif)',
                                }}
                              >
                                {isCollected(spot.id) ? '❤ 已收藏' : '♡ 收藏'}
                              </button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
                        <motion.button
                          className="slow-hover-float-lg"
                          whileTap={{ scale: 0.96 }}
                          onClick={() => setShuffleSeed(shuffleSeed + 1)}
                          style={{ padding: '10px 18px', border: '1px solid var(--color-border)', borderRadius: 8, background: '#fff', color: 'var(--sumi-warm)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-serif)' }}
                        >
                          🎲 再抽 3 個
                        </motion.button>
                        <motion.button
                          className="slow-hover-float-lg"
                          whileTap={{ scale: 0.96 }}
                          onClick={() => { setSelectedMood(null); setShuffleSeed(1); }}
                          style={{ padding: '10px 18px', border: '1px solid var(--color-border)', borderRadius: 8, background: '#fff', color: 'var(--sumi-warm)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-serif)' }}
                        >
                          ↺ 換一種氛圍
                        </motion.button>
                        {collected.length > 0 && (
                          <motion.button
                            className="slow-hover-float-lg"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileTap={{ scale: 0.96 }}
                            disabled={loading}
                            onClick={async () => {
                              setError('');
                              setLoading(true);
                              const mustVisitStr = collected.map(s => s.name).join('、');
                              const uniqueDestinations = Array.from(new Set(collected.map(s => s.area)));
                              const prefs: TripPreferences = {
                                days: 3,
                                budget: 0,
                                interests: [],
                                destination: uniqueDestinations,
                                explorationStyle: 50,
                                foodVsAttractions: 50,
                                mustVisit: mustVisitStr,
                                ragContent: '',
                                specialRequirements: '',
                                type: 'P',
                              };
                              try {
                                const trip = await generateTrip(prefs);
                                if (!trip || !trip.id) {
                                  setError('後端返回的行程數據無效，請稍後再試');
                                  setLoading(false);
                                  return;
                                }
                                navigate(`/itinerary/${trip.id}`, { state: { trip } });
                              } catch (err) {
                                const msg = err instanceof Error ? err.message : 'AI 規劃失敗，請稍後再試';
                                console.error('❌ P人 generateTrip error:', err);
                                setError(msg);
                                setLoading(false);
                              }
                            }}
                            style={{ padding: '10px 18px', border: '1px solid var(--vermillion)', borderRadius: 8, background: loading ? 'transparent' : 'var(--vermillion)', color: loading ? 'var(--vermillion)' : '#fff', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-serif)', opacity: loading ? 0.7 : 1 }}
                          >
                            {loading ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                行程規劃中<span className="loading-dots"><span>.</span><span>.</span><span>.</span></span>
                              </span>
                            ) : `❤ 把這些拼成一條路 (${collected.length}) →`}
                          </motion.button>
                        )}
                        {error && <p style={{ width: '100%', fontSize: 12, color: 'var(--vermillion)', marginTop: 4 }}>{error}</p>}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 右下角收藏提示（回到 mood picker 時顯示） */}
                {collected.length > 0 && !selectedMood && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ marginTop: 16, fontSize: 12, color: 'var(--mist)', letterSpacing: '0.06em' }}
                  >
                    已收藏 {collected.length} 個地方
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Right: Spacer (hidden in form/explore/personality views) ── */}
        {layoutViewState === 'initial' && (
          <div className="homepage-right" style={{ flex: 1 }} />
        )}
      </div>
    </div>
  );
}

