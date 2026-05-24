import type { Trip, Attraction } from '../types';

interface PdfTemplateProps {
  trip: Trip;
}

export default function PdfTemplate({ trip }: PdfTemplateProps) {
  if (!trip || !trip.days) return null;

  return (
    <div id="pdf-itinerary-content" style={{
      padding: '30px 40px',
      background: '#FFFFFF',
      color: '#2C2C2A',
      fontFamily: '"Noto Sans TC", sans-serif',
      width: '720px', // Reduced width to prevent right-side cutoff
    }}>
      {/* ── Cover / Header ── */}
      <div style={{ borderBottom: '2px solid #C45A3F', paddingBottom: '20px', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, margin: '0 0 10px 0', fontFamily: '"Noto Serif TC", serif', color: '#1A1F24' }}>
          {trip.preferences?.days ?? 0} 天專屬旅遊行程
        </h1>
        <div style={{ fontSize: '14px', color: '#7E7C73', display: 'flex', gap: '16px' }}>
          <span>預算: NT$ {trip.preferences?.budget?.toLocaleString() ?? 0}</span>
          <span>•</span>
          <span>風格: {trip.preferences?.interests?.join('、') ?? '綜合'}</span>
          <span>•</span>
          <span>生成於: {trip.generatedAt ? new Date(trip.generatedAt).toLocaleDateString('zh-TW') : '未知'}</span>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
        <div style={{ flex: 1, background: '#FAF7F2', padding: '16px', borderRadius: '8px', border: '1px solid #E8E6E1' }}>
          <div style={{ fontSize: '12px', color: '#7E7C73', marginBottom: '4px', lineHeight: 1 }}>總天數</div>
          <div style={{ fontSize: '20px', fontWeight: 600, lineHeight: 1 }}>{trip.summary.totalDays} 天</div>
        </div>
        <div style={{ flex: 1, background: '#FAF7F2', padding: '16px', borderRadius: '8px', border: '1px solid #E8E6E1' }}>
          <div style={{ fontSize: '12px', color: '#7E7C73', marginBottom: '4px', lineHeight: 1 }}>總預算預估</div>
          <div style={{ fontSize: '20px', fontWeight: 600, lineHeight: 1 }}>{trip.summary.totalBudget}</div>
        </div>
        <div style={{ flex: 1, background: '#FAF7F2', padding: '16px', borderRadius: '8px', border: '1px solid #E8E6E1' }}>
          <div style={{ fontSize: '12px', color: '#7E7C73', marginBottom: '4px', lineHeight: 1 }}>總景點數</div>
          <div style={{ fontSize: '20px', fontWeight: 600, lineHeight: 1 }}>{trip.summary.totalAttractions} 處</div>
        </div>
      </div>

      {/* ── Daily Itinerary ── */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {trip.days.map((day, dayIndex) => (
          <div key={day.day}>
            {dayIndex > 0 && (
              <div style={{ height: '1px', background: '#E8E6E1', margin: '30px 0' }} />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {day.attractions.map((attraction: Attraction, index: number) => {
                const isFirst = index === 0;
                
                const attractionCard = (
                  <div key={attraction.id} style={{
                    display: 'flex',
                    gap: '20px',
                    padding: '16px',
                    border: '1px solid #E8E6E1',
                    borderRadius: '12px',
                    background: '#FAFAFA',
                    pageBreakInside: isFirst ? 'auto' : 'avoid'
                  }}>
                  {/* Image Thumbnail */}
                  {attraction.image ? (
                    <img
                      src={attraction.image}
                      alt={attraction.name}
                      style={{
                        width: '100px',
                        height: '100px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        flexShrink: 0
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '100px',
                      height: '100px',
                      background: '#E8E6E1',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#B3B1AC',
                      fontSize: '12px',
                      flexShrink: 0,
                      gap: '4px'
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                      目前無圖片
                    </div>
                  )}

                  {/* Attraction Details */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: '#1A1F24', lineHeight: 1.2 }}>
                        {index + 1}. {attraction.name}
                      </h3>
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        background: '#FFFFFF',
                        border: '1px solid #E8E6E1',
                        borderRadius: '4px',
                        color: '#7E7C73',
                        display: 'inline-flex',
                        alignItems: 'center',
                        lineHeight: 1,
                        height: '20px'
                      }}>
                        {attraction.category}
                      </span>
                    </div>
                    
                    <p style={{ fontSize: '13px', color: '#555', lineHeight: 1.5, margin: '0 0 12px 0' }}>
                      {attraction.description}
                    </p>

                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#7E7C73', alignItems: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>⏱ {attraction.duration}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>💰 {attraction.estimatedCost}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>📍 {attraction.location}</span>
                    </div>
                  </div>
                </div>
                );
                
                if (isFirst) {
                  return (
                    <div key={`day-start-${day.day}`} style={{ pageBreakInside: 'avoid' }}>
                      <h2 style={{
                        fontSize: '22px',
                        fontWeight: 700,
                        color: '#C45A3F',
                        paddingBottom: '8px',
                        marginBottom: '16px',
                        fontFamily: '"Noto Serif TC", serif',
                        lineHeight: 1
                      }}>
                        Day {day.day}
                      </h2>
                      {attractionCard}
                    </div>
                  );
                }
                
                return attractionCard;
              })}
            </div>
          </div>
        ))}
      </div>
      
      {/* Footer */}
      <div style={{
        marginTop: '60px',
        paddingTop: '20px',
        borderTop: '1px solid #E8E6E1',
        textAlign: 'center',
        fontSize: '12px',
        color: '#B3B1AC'
      }}>
        由 Occupath AI 行程規劃自動生成
      </div>
    </div>
  );
}
