import { useEffect, useRef, useState } from 'react';
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
  const [viewState, setViewState] = useState<'initial' | 'personality' | 'form'>('initial');
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
  };

  const handleDestinationKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addDestination(destinationSuggestions[0] ?? destinationInput);
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
      <nav className="homepage-nav">
        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => setViewState('initial')}>
          <img src={occupathLogo} alt="Occupath Logo" style={{ height: 50, width: 'auto', objectFit: 'contain', margin: '-4px 0' }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ background: '#FFFFFF', color: '#1A1F24', border: '1px solid var(--color-border)', borderRadius: 24, padding: '8px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Sign In</button>
        </div>
      </nav>

      {/* Main Container */}
      <div className={`homepage-main ${viewState === 'form' ? 'form-view' : ''}`}>

        {/* ─── Left: Form ─── */}
        <div className={`homepage-left ${viewState === 'form' ? 'form-view' : ''}`}>

          {viewState !== 'form' && (
            <div className="animate-fade-up hero-content">

              {/* Left Column: Icon */}
              <img src={occupathIcon} alt="Occupath Icon" style={{ width: 180, height: 180, objectFit: 'contain', flexShrink: 0 }} />

              {/* Right Column: Text and Actions */}
              <div className="hero-text-container">

                {/* Logo alignment block: exactly matches the height of the icon (180px) */}
                <div className="hero-logo">
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
                  <div className="animate-fade-up personality-btns">
                    <button
                      onClick={() => setViewState('form')}
                      className="glass-card"
                      style={{ 
                        flex: 1,
                        padding: '24px 24px', 
                        textAlign: 'center', 
                        cursor: 'pointer', 
                        transition: 'all 0.2s', 
                        border: 'none', 
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        background: 'linear-gradient(180deg, #2c4563 0%, #1a3a52 100%)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Wave pattern */}
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '50px',
                        background: 'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1200 120%22 preserveAspectRatio=%22none%22%3E%3Cpath d=%22M0,30 Q300,10 600,30 T1200,30 L1200,120 L0,120 Z%22 fill=%22%234a7ba7%22 opacity=%220.8%22/%3E%3Cpath d=%22M0,50 Q300,30 600,50 T1200,50 L1200,120 L0,120 Z%22 fill=%22%232c5282%22 opacity=%220.6%22/%3E%3C/svg%3E")',
                        backgroundSize: '100% 100%',
                        backgroundRepeat: 'repeat-x'
                      }} />
                      <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ fontSize: 28, fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-serif)' }}>J 人</div>
                        <div style={{ fontSize: 14, color: '#b0c5d8', marginTop: 12, whiteSpace: 'nowrap' }}>精打細算，完美計畫</div>
                      </div>
                    </button>
                    <button
                      onClick={() => setViewState('form')}
                      className="glass-card"
                      style={{ 
                        flex: 1, 
                        padding: '24px 24px', 
                        textAlign: 'center', 
                        cursor: 'pointer', 
                        transition: 'all 0.2s', 
                        border: 'none', 
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        background: 'linear-gradient(180deg, #d4603c 0%, #c85a3a 100%)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Cherry blossom tree on right */}
                      <div style={{
                        position: 'absolute',
                        right: -10,
                        top: -20,
                        width: '120px',
                        height: '120px',
                        opacity: 0.4,
                        background: 'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22%3E%3C!-- tree trunk --%3E%3Cpath d=%22M95 120 Q90 150 95 200 Q100 150 105 120%22 fill=%22%238b6f47%22/%3E%3C!-- cherry blossoms --%3E%3Ccircle cx=%22100%22 cy=%2260%22 r=%2250%22 fill=%22%23e8b4c8%22/%3E%3Ccircle cx=%2270%22 cy=%2280%22 r=%2235%22 fill=%22%23f0a6c3%22/%3E%3Ccircle cx=%22130%22 cy=%2280%22 r=%2235%22 fill=%22%23f0a6c3%22/%3E%3Ccircle cx=%2280%22 cy=%22110%22 r=%2225%22 fill=%22%23e89bc3%22/%3E%3Ccircle cx=%22120%22 cy=%22110%22 r=%2225%22 fill=%22%23e89bc3%22/%3E%3C/svg%3E")',
                        backgroundSize: '100% 100%',
                        backgroundRepeat: 'no-repeat'
                      }} />
                      <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ fontSize: 28, fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-serif)' }}>P 人</div>
                        <div style={{ fontSize: 14, color: '#f5d5c0', marginTop: 12, whiteSpace: 'nowrap' }}>隨心所欲，說走就走</div>
                      </div>
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
              <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Destination */}
                <div>
                  <label className="form-label">想去的城市 <span style={{ color: 'var(--color-accent)' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <div
                      className="glass-input"
                      style={{ minHeight: 46, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: '8px 12px' }}
                    >
                      {destinations.map(destination => (
                        <span
                          key={destination}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 10px',
                            borderRadius: 999,
                            background: '#F6F1EC',
                            color: 'var(--color-text)',
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          {destination}
                          <button
                            type="button"
                            onClick={() => removeDestination(destination)}
                            style={{
                              width: 16,
                              height: 16,
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--color-text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                            aria-label={`刪除 ${destination}`}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 6 6 18" />
                              <path d="m6 6 12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                      <input
                        ref={destinationInputRef}
                        type="text"
                        value={destinationInput}
                        onChange={e => setDestinationInput(e.target.value)}
                        onKeyDown={handleDestinationKeyDown}
                        onKeyUp={handleDestinationKeyUp}
                        onFocus={() => setError('')}
                        placeholder={destinations.length === 0 ? '輸入城市名稱，例如：東京' : '輸入更多城市'}
                        className="destination-input"
                        style={{
                          border: 'none',
                          outline: 'none',
                          flex: 1,
                          minWidth: 120,
                          fontSize: 14,
                          fontFamily: 'inherit',
                          background: 'transparent',
                          color: 'var(--color-text)',
                        }}
                      />
                    </div>

                    {destinationSuggestions.length > 0 && normalizedDestinationInput && (
                      <div className="glass-card" style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 20, overflow: 'hidden' }}>
                        {destinationSuggestions.map(option => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => addDestination(option)}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              border: 'none',
                              background: '#FFF',
                              padding: '12px 14px',
                              cursor: 'pointer',
                              fontSize: 14,
                              fontFamily: 'inherit',
                              color: 'var(--color-text)',
                              borderBottom: '1px solid var(--color-border)',
                            }}
                          >
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
                    <label className="form-label">旅遊天數 <span style={{ color: 'var(--color-accent)' }}>*</span></label>
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
                    <label className="form-label">總預算 (台幣) <span style={{ color: 'var(--color-accent)' }}>*</span></label>
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

                {/* Interests */}
                <div>
                  <label className="form-label mb-3">興趣偏好 <span style={{ color: 'var(--color-accent)' }}>*</span></label>
                  <div className="interest-grid">
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

                {/* Style Sliders */}
                <div style={{ marginTop: 12, marginBottom: 12 }}>
                  <label className="form-label">旅遊風格 <span style={{ color: 'var(--color-accent)' }}>*</span></label>

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

                {/* Inputs */}
                <div>
                  <label className="form-label">必去景點</label>
                  <input
                    type="text"
                    placeholder="例如：清水寺、藍瓶咖啡..."
                    value={mustVisit}
                    onChange={e => setMustVisit(e.target.value)}
                    className="glass-input"
                  />
                </div>

                <div style={{ marginTop: 0 }}>
                  <label className="form-label">參考攻略</label>
                  <textarea
                    placeholder="貼入想納入行程的攻略或筆記..."
                    value={ragContent}
                    onChange={e => setRagContent(e.target.value)}
                    className="glass-input"
                    style={{ height: 60, resize: 'none' }}
                  />
                </div>

                <div style={{ marginTop: 0 }}>
                  <label className="form-label">行程期望</label>
                  <textarea
                    id="special-requirements"
                    placeholder="例如：希望這趣旅行能放鬆心情、希望深入體驗地方文化、希望行程緊湊充實、希望有浪漫氛圍..."
                    value={specialRequirements}
                    onChange={e => setSpecialRequirements(e.target.value)}
                    className="glass-input"
                    style={{ height: 72, resize: 'none' }}
                  />

                </div>

                <button
                  className="btn-primary"
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {loading ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#ffffff' }}>
                      <span style={{ textAlign: 'center' }}>行程規劃中</span>
                      <span className="loading-dots" aria-hidden>
                        <span>.</span>
                        <span>.</span>
                        <span>.</span>
                      </span>
                      <span style={{ color: '#ffffff', fontSize: 12 }}>（可能需要1-2分鐘）</span>
                    </span>
                  ) : '開始安排行程'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── Right: Spacer ─── */}
        <div className="homepage-right" style={{ flex: 1 }} />
      </div>
    </div>
  );
}
