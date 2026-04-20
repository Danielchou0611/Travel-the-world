import { useParams, useLocation, useNavigate } from 'react-router-dom';
import type { Trip } from '../types';
import { MOCK_TRIP } from '../services/api';
import Navbar from '../components/Navbar';

const MAP_PINS = [
  { id: 1, name: '伏見稻荷大社', x: 38, y: 62, active: true },
  { id: 2, name: '錦市場', x: 45, y: 48, active: false },
  { id: 3, name: '祇園・花見小路', x: 55, y: 55, active: false },
  { id: 4, name: '金閣寺', x: 32, y: 38, active: false },
  { id: 5, name: '嵐山竹林', x: 22, y: 44, active: false },
];

export default function MapPage() {
  const { tripId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const trip: Trip = (location.state as { trip?: Trip })?.trip ?? MOCK_TRIP;

  return (
    <div style={{ height: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Navbar
        showBack
        backLabel="返回"
        backPath={`/itinerary/${tripId}`}
        rightActions={
          <span style={{ fontSize: 13, color: 'var(--color-primary)', padding: '6px 12px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-surface)', fontWeight: 500 }}>
            地圖檢視
          </span>
        }
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: attraction list */}
        <div style={{ width: 340, borderRight: '1px solid var(--color-border)', overflowY: 'auto', flexShrink: 0, background: 'var(--color-surface)' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', background: '#FAF9F7' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>Day 1 · 京都市區</h2>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>點擊景點查看地圖位置</p>
          </div>

          {MAP_PINS.map(pin => (
            <div
              key={pin.id}
              style={{
                padding: '16px 24px',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                gap: 16,
                alignItems: 'flex-start',
                cursor: 'pointer',
                background: pin.active ? '#F0EEE9' : 'transparent',
                borderLeft: `4px solid ${pin.active ? 'var(--color-accent)' : 'transparent'}`,
                transition: 'all 0.2s',
              }}
            >
              {/* Pin badge */}
              <div style={{
                width: 24, height: 24,
                borderRadius: '50% 50% 50% 0',
                transform: 'rotate(-45deg)',
                background: pin.active ? 'var(--color-primary)' : '#E8E6E1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                marginTop: 2,
              }}>
                <span style={{ transform: 'rotate(45deg)', fontSize: 11, fontWeight: 600, color: pin.active ? 'white' : 'var(--color-text-muted)' }}>
                  {pin.id}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: pin.active ? 600 : 500, color: pin.active ? 'var(--color-text)' : 'var(--color-text-muted)', marginBottom: 4 }}>
                  {pin.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>景點 · 2–3 小時</div>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Map placeholder */}
        <div className="map-stub" style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {MAP_PINS.map(pin => (
            <div
              key={pin.id}
              style={{
                position: 'absolute',
                left: `${pin.x}%`,
                top: `${pin.y}%`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                transform: 'translate(-50%, -100%)',
                zIndex: pin.active ? 10 : 5,
              }}
            >
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50% 50% 50% 0',
                transform: 'rotate(-45deg)',
                background: pin.active ? 'var(--color-accent)' : 'var(--color-surface)',
                border: `2px solid ${pin.active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: pin.active ? '0 4px 12px rgba(190,49,68,0.2)' : '0 2px 8px rgba(0,0,0,0.05)',
                transition: 'all 0.2s',
              }}>
                <span style={{ transform: 'rotate(45deg)', fontSize: 13, fontWeight: 600, color: pin.active ? 'white' : 'var(--color-text-muted)' }}>
                  {pin.id}
                </span>
              </div>
              <div style={{
                marginTop: 8,
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--color-text)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 4,
                padding: '4px 10px',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              }}>
                {pin.name}
              </div>
            </div>
          ))}

          <div style={{ textAlign: 'center', position: 'absolute', bottom: 60, background: 'var(--color-surface)', padding: '24px 48px', borderRadius: 12, border: '1px solid var(--color-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" style={{ margin: '0 auto 16px' }}>
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
            </svg>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text)' }}>互動地圖區塊預留</div>
            <div style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 8 }}>Google Maps 或 Leaflet.js 將接續實作於此處</div>
          </div>
        </div>
      </div>
    </div>
  );
}
