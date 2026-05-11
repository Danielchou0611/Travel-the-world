import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TripPreferences, Interest } from '../types';
import { generateTrip } from '../services/api';
import occupathLogo from '../assets/occupath_logo_v2.png';
import occupathIcon from '../assets/occupath_o.png';

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
  const [viewState, setViewState] = useState<'initial' | 'personality' | 'form'>('initial');
  const [days, setDays] = useState(7);
  const [budget, setBudget] = useState<number | ''>(30000);
  const [interests, setInterests] = useState<Interest[]>(['美食', '文化']);
  const [explorationStyle, setExplorationStyle] = useState(50);
  const [foodVsAttractions, setFoodVsAttractions] = useState(50);
  const [mustVisit, setMustVisit] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');
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
      specialRequirements,
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

      {/* Navbar Minimal */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 48px', borderBottom: '1px solid rgba(0,0,0,0.05)', background: 'transparent' }}>
        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => setViewState('initial')}>
          <img src={occupathLogo} alt="Occupath Logo" style={{ height: 50, width: 'auto', objectFit: 'contain', margin: '-4px 0' }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ background: '#FFFFFF', color: '#1A1F24', border: '1px solid var(--color-border)', borderRadius: 24, padding: '8px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Sign In</button>
        </div>
      </nav>

      {/* Main Container */}
      <div style={{ display: 'flex', flex: 1, gap: 48, padding: viewState === 'form' ? '24px 48px 48px' : '48px', maxWidth: 1200, margin: '0 auto', width: '100%', alignItems: 'flex-start' }}>

        {/* ─── Left: Form ─── */}
        <div style={{ flex: 1, maxWidth: viewState === 'form' ? 560 : 760, display: 'flex', flexDirection: 'column', gap: 24, marginTop: viewState === 'form' ? 0 : 60, transition: 'max-width 0.3s' }}>

          {viewState !== 'form' && (
            <div className="animate-fade-up" style={{ display: 'flex', gap: 32, alignItems: 'flex-start', marginLeft: -80 }}>

              {/* Left Column: Icon */}
              <img src={occupathIcon} alt="Occupath Icon" style={{ width: 180, height: 180, objectFit: 'contain', flexShrink: 0 }} />

              {/* Right Column: Text and Actions */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>

                {/* Logo alignment block: exactly matches the height of the icon (180px) */}
                <div style={{ height: 180, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 8 }}>
                  <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 72, fontWeight: 400, color: 'var(--color-primary-dark)', margin: 0, lineHeight: 1, letterSpacing: '-0.02em', paddingTop: 32 }}>
                    Occupath
                  </h1>

                  <div>
                    <div style={{ color: 'var(--color-accent)', fontSize: 13, fontWeight: 500, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 12 }}>
                      Journeys with purpose
                    </div>
                    <div style={{ width: 40, height: 2, background: 'var(--color-accent)' }} />
                  </div>
                </div>

                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 400, lineHeight: 1.3, color: 'var(--color-primary-dark)', margin: 0, marginTop: 20, letterSpacing: '-0.01em' }}>
                  Occupy the moment.<br />
                  Discover Japan.
                </h2>

                <p style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 300, color: 'var(--color-text-muted)', marginTop: 16, lineHeight: 1.6, maxWidth: 460 }}>
                  專屬您的日本之旅。
                </p>

                {viewState === 'initial' && (
                  <button
                    onClick={() => setViewState('personality')}
                    className="animate-fade-up"
                    style={{
                      marginTop: 40,
                      background: 'var(--color-accent)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      padding: '14px 28px',
                      fontSize: 16,
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      fontFamily: 'inherit',
                      width: 'fit-content',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#A9482F'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--color-accent)'}
                  >
                    Start Your Journey
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </button>
                )}

                {viewState === 'personality' && (
                  <div className="animate-fade-up" style={{ marginTop: 40, display: 'flex', gap: 16 }}>
                    <button
                      onClick={() => setViewState('form')}
                      className="glass-card"
                      style={{ flex: 1, padding: '32px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}
                    >
                      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-primary-dark)', fontFamily: 'var(--font-serif)' }}>J 人</div>
                      <div style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 12, whiteSpace: 'nowrap' }}>精打細算，完美計畫</div>
                    </button>
                    <button
                      onClick={() => setViewState('form')}
                      className="glass-card"
                      style={{ flex: 1, padding: '32px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}
                    >
                      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-primary-dark)', fontFamily: 'var(--font-serif)' }}>P 人</div>
                      <div style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 12, whiteSpace: 'nowrap' }}>隨心所欲，說走就走</div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {viewState === 'form' && (
            <div className="animate-fade-up">
              <button
                onClick={() => setViewState('personality')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  marginBottom: 16,
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: 'var(--font-serif)',
                  padding: '4px 8px 4px 0',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                Back
              </button>
              <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 28 }}>

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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
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

                <div>
                  <label className="form-label">行程期望（選填）</label>
                  <textarea
                    id="special-requirements"
                    placeholder="例如：希望這趣旅行能放鬆心情、希望深入體驗地方文化、希望行程緊湊充實、希望有浪漫氛圍..."
                    value={specialRequirements}
                    onChange={e => setSpecialRequirements(e.target.value)}
                    className="glass-input"
                    style={{ height: 72, resize: 'none' }}
                  />
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6, lineHeight: 1.5 }}>
                    描述您對這趣行程的期望與感受，AI 將根據此將內容更貼近您的理想
                  </div>
                </div>

                <button
                  className="btn-primary"
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{ marginTop: 8 }}
                >
                  {loading ? 'AI 行程規劃中...（可能需要1-3分鐘）' : '開始安排行程'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── Right: Spacer ─── */}
        <div style={{ flex: 1 }} />
      </div>
    </div>
  );
}
