import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TripPreferences, Interest } from '../types';
import { generateTrip } from '../services/api';

// --- Icons ---
const IconFood = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /><path d="M7 2v20" /><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" /></svg>;
const IconCulture = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 10h16" /><path d="M10 21V10" /><path d="M14 21V10" /><path d="M3 21h18" /><path d="m12 3 8 7H4Z" /></svg>;
const IconShopping = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>;
const IconNature = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22c4-4 8-9 8-14a8 8 0 1 0-16 0c0 5 4 10 8 14z" /></svg>;
const IconOnsen = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 22h16a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2Z" /><path d="M7 2v4" /><path d="M12 2v6" /><path d="M17 2v4" /></svg>;
const IconAnime = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M10 8v8l6-4-6-4Z" /></svg>;

const INTERESTS: { key: Interest; label: string; icon: React.ReactNode }[] = [
  { key: '美食', label: '美食', icon: <IconFood /> },
  { key: '文化', label: '文化・寺廟', icon: <IconCulture /> },
  { key: '購物', label: '購物', icon: <IconShopping /> },
  { key: '自然', label: '自然・山岳', icon: <IconNature /> },
  { key: '溫泉', label: '溫泉', icon: <IconOnsen /> },
  { key: '動漫', label: '動漫・潮流', icon: <IconAnime /> },
];



// Reusable icons for features/stats
const IconDatabase = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>;
const IconReviews = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
const IconXAI = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3a9 9 0 0 0-9 9 9 9 0 0 0 9 9 9 9 0 0 0 9-9 9 9 0 0 0-9-9z" /><path d="M12 8v8" /><path d="M8 12h8" /></svg>;
const IconTarget = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>;
const IconRefresh = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></svg>;
const IconBook = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>;
const IconMap = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" /></svg>;

export default function HomePage() {
  const navigate = useNavigate();
  const [days, setDays] = useState(7);
  const [budget, setBudget] = useState<number | ''>(30000);
  const [interests, setInterests] = useState<Interest[]>(['美食', '文化']);
  const [explorationStyle, setExplorationStyle] = useState(50);
  const [foodVsAttractions, setFoodVsAttractions] = useState(50);
  const [mustVisit, setMustVisit] = useState('');
  const [ragContent, setRagContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [jpyRate, setJpyRate] = useState<number>(4.76);

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

  const toggleInterest = (interest: Interest) => {
    setInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleSubmit = async () => {
    if (interests.length === 0) {
      setError('請至少選擇一個興趣偏好');
      return;
    }
    setError('');
    setLoading(true);

    const prefs: TripPreferences = {
      days,
      budget: Number(budget) || 0,
      interests,
      explorationStyle,
      foodVsAttractions,
      mustVisit,
      ragContent,
    };

    try {
      const trip = await generateTrip(prefs);
      navigate(`/itinerary/${trip.id}`, { state: { trip } });
    } catch (err) {
      setError('AI 規劃失敗，請稍後再試');
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* Navbar Minimal */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 48px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, background: 'var(--color-primary)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
            </svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
            JapanAI
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)', cursor: 'pointer' }}>登入 / 註冊</span>
        </div>
      </nav>

      {/* Main Container */}
      <div style={{ display: 'flex', flex: 1, gap: 48, padding: '48px', maxWidth: 1200, margin: '0 auto', width: '100%', alignItems: 'flex-start' }}>

        {/* ─── Left: Form ─── */}
        <div style={{ flex: 1, maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 24 }}>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              AI Travel Planner
            </div>
            <h1 style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.2, color: 'var(--color-text)', margin: 0, letterSpacing: '-0.02em' }}>
              專屬您的日本之旅
            </h1>
            <p style={{ fontSize: 15, color: 'var(--color-text-muted)', marginTop: 12, lineHeight: 1.6 }}>
              設定您的偏好，讓 AI 為您打造理想的行程。所有推薦皆附帶透明的 XAI 分析。
            </p>
          </div>

          <div className="glass-card animate-fade-up" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 28 }}>

            {/* Days & Budget */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <label className="form-label">旅遊天數</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={days}
                    onChange={e => setDays(Math.min(30, Math.max(1, Number(e.target.value))))}
                    className="glass-input"
                    style={{ paddingRight: 36 }}
                  />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#A3A09A' }}>天</span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  {[3, 5, 7, 10, 14].map(d => (
                    <button
                      key={d}
                      onClick={() => setDays(d)}
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        border: `1px solid ${days === d ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        background: days === d ? 'var(--color-accent)' : 'transparent',
                        color: days === d ? '#FFF' : 'var(--color-text-muted)',
                        fontSize: 11,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">總預算 (台幣)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--color-text)', fontWeight: 500 }}>NT$</span>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={budget}
                    onChange={e => setBudget(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                    className="glass-input"
                    style={{ paddingLeft: 48 }}
                  />
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span>日幣約：¥{Math.round((Number(budget) || 0) * jpyRate).toLocaleString('en-US')}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  {[30000, 50000, 80000, 100000].map(b => (
                    <button
                      key={b}
                      onClick={() => setBudget(b)}
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        border: `1px solid ${budget === b ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        background: budget === b ? 'var(--color-accent)' : 'transparent',
                        color: budget === b ? '#FFF' : 'var(--color-text-muted)',
                        fontSize: 11,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {b.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: '1px solid var(--color-border)' }} />

            {/* Interests */}
            <div>
              <label className="form-label mb-3">興趣偏好</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {INTERESTS.map(item => (
                  <div
                    key={item.key}
                    className={`interest-item ${interests.includes(item.key) ? 'selected' : ''}`}
                    onClick={() => toggleInterest(item.key)}
                  >
                    <span style={{ color: interests.includes(item.key) ? 'var(--color-accent)' : 'var(--color-text-muted)', display: 'flex' }}>
                      {item.icon}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: interests.includes(item.key) ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
              {error && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 8 }}>{error}</p>}
            </div>

            {/* Divider */}
            <div style={{ borderTop: '1px solid var(--color-border)' }} />

            {/* Style Sliders */}
            <div>
              <label className="form-label">旅遊風格</label>

              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text)' }}>步調：{explorationStyle <= 30 ? '悠閒' : explorationStyle >= 70 ? '緊湊' : '適中'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>慢活</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={explorationStyle}
                    onChange={e => setExplorationStyle(Number(e.target.value))}
                    className="style-slider"
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>充實</span>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text)' }}>偏重：{foodVsAttractions <= 30 ? '美食' : foodVsAttractions >= 70 ? '景點' : '均衡'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>美食</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={foodVsAttractions}
                    onChange={e => setFoodVsAttractions(Number(e.target.value))}
                    className="style-slider"
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>景點</span>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--color-border)' }} />

            {/* Inputs */}
            <div>
              <label className="form-label">必去地點（選填）</label>
              <input
                type="text"
                placeholder="例如：清水寺、藍瓶咖啡..."
                value={mustVisit}
                onChange={e => setMustVisit(e.target.value)}
                className="glass-input"
              />
            </div>

            <div>
              <label className="form-label">參考攻略（貼入文字）</label>
              <textarea
                placeholder="貼入想納入行程的攻略或筆記..."
                value={ragContent}
                onChange={e => setRagContent(e.target.value)}
                className="glass-input"
                style={{ height: 60, resize: 'none' }}
              />
            </div>

            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              {loading ? '規劃中...' : '開始安排行程'}
            </button>
          </div>
        </div>

        {/* ─── Right: Visual & Info ─── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24, position: 'sticky', top: 120 }}>

          {/* Subtle Image */}
          <div className="animate-fade-up" style={{ borderRadius: 12, overflow: 'hidden', height: 280, backgroundColor: '#E2DFD6' }}>
            <img
              src="https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800&h=400&fit=crop"
              alt="Japan Minimalist"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.9 }}
            />
          </div>

          <div className="animate-fade-up" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {[
              { label: '景點庫', value: '500+', icon: <IconDatabase /> },
              { label: '參考評論', value: '1141', icon: <IconReviews /> },
              { label: '分析維度', value: '8項', icon: <IconXAI /> },
            ].map(stat => (
              <div key={stat.label} className="stat-card" style={{ textAlign: 'center', padding: '16px 12px' }}>
                <div style={{ color: 'var(--color-accent)', display: 'flex', justifyContent: 'center', marginBottom: 8 }}>{stat.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text)' }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="glass-card animate-fade-up" style={{ padding: '24px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 16 }}>
              核心功能特色
            </div>
            {[
              { icon: <IconTarget />, title: 'XAI 透明推薦', desc: '深入說明每個推薦背後的考量因素' },
              { icon: <IconRefresh />, title: '即時偏好微調', desc: '滑桿調整，前端即時反應無需重新讀取' },
              { icon: <IconBook />, title: '文獻資料整合', desc: '自動萃取外部遊記或攻略文章' },
              { icon: <IconMap />, title: '地圖視覺化', desc: '清晰呈現每日行程移動路線' },
            ].map(feat => (
              <div key={feat.title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
                <span style={{ color: 'var(--color-text-muted)', marginTop: 2 }}>{feat.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>{feat.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, lineHeight: 1.4 }}>{feat.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
