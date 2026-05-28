import { useState } from 'react';

interface WhatIfSlidersProps {
  explorationStyle: number;
  foodVsAttractions: number;
  onExplorationChange: (value: number) => void;
  onFoodChange: (value: number) => void;
}

export default function WhatIfSliders({
  explorationStyle,
  foodVsAttractions,
  onExplorationChange,
  onFoodChange,
}: WhatIfSlidersProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="whatif-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isCollapsed ? 0 : 20, maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 30, height: 30,
            background: '#F0EEE9',
            border: '1px solid var(--color-border)',
            borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5">
              <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
            </svg>
          </div>
          <div>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>行程偏好微調</span>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 12 }}>前端即時重排</span>
          </div>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-muted)',
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'var(--font-serif)',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          {isCollapsed ? (
            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15" /></svg> 展開面板</>
          ) : (
            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg> 隱藏面板</>
          )}
        </button>
      </div>

      {!isCollapsed && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, maxWidth: 1200, margin: '0 auto', width: '100%', paddingBottom: 8 }}>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: 'var(--color-text)', fontWeight: 500 }}>設定步調</label>
              <span style={{
                fontSize: 12,
                padding: '2px 8px',
                borderRadius: 4,
                background: '#F0EEE9',
                color: 'var(--color-text)',
              }}>
                {explorationStyle <= 30 ? '悠閒型' : explorationStyle >= 70 ? '緊湊型' : '適中'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)', width: 32, textAlign: 'right', flexShrink: 0 }}>慢活</span>
              <input
                type="range"
                min={0}
                max={100}
                value={explorationStyle}
                onChange={e => onExplorationChange(Number(e.target.value))}
                className="style-slider"
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)', width: 32, flexShrink: 0 }}>充實</span>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: 'var(--color-text)', fontWeight: 500 }}>主體偏重</label>
              <span style={{
                fontSize: 12,
                padding: '2px 8px',
                borderRadius: 4,
                background: '#F0EEE9',
                color: 'var(--color-text)',
              }}>
                {foodVsAttractions <= 30 ? '美食導向' : foodVsAttractions >= 70 ? '景點導向' : '均衡'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)', width: 32, textAlign: 'right', flexShrink: 0 }}>美食</span>
              <input
                type="range"
                min={0}
                max={100}
                value={foodVsAttractions}
                onChange={e => onFoodChange(Number(e.target.value))}
                className="style-slider"
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)', width: 32, flexShrink: 0 }}>景點</span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
