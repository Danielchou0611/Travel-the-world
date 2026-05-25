import type { Trip, Attraction } from '../types';

interface PdfTemplateProps {
  trip: Trip;
}

/* ─── Design tokens ─── */
const prussian   = '#123041';
const ochre      = '#C9843A';
const sumiWarm   = '#3D3A35';
const mist       = '#7E7C73';
const bgWarm     = '#FAF8F4';
const borderCol  = '#E8E4DC';
const white      = '#FFFFFF';

const serif  = '"Cormorant Garamond", "Noto Serif TC", Georgia, serif';
const sans   = '"Noto Sans TC", system-ui, sans-serif';

/* A4 at 96 dpi = 794px wide. Template fills 100% of that. */
export default function PdfTemplate({ trip }: PdfTemplateProps) {
  if (!trip || !trip.days) return null;

  const destinations = trip.preferences?.destination?.join('・') ?? '';
  const generatedDate = trip.generatedAt
    ? new Date(trip.generatedAt).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <div
      id="pdf-itinerary-content"
      style={{
        width: '794px',
        boxSizing: 'border-box',
        background: white,
        color: sumiWarm,
        fontFamily: sans,
        margin: 0,
        padding: 0,
      }}
    >
      {/* ══ COVER HEADER ══ */}
      <div style={{
        background: prussian,
        padding: '44px 48px 36px',
        boxSizing: 'border-box',
        width: '794px',
      }}>
        {/* Brand eyebrow */}
        <div style={{
          fontFamily: serif,
          fontSize: '10px',
          letterSpacing: '2.5px',
          textTransform: 'uppercase' as const,
          color: ochre,
          marginBottom: '16px',
        }}>
          Occupy your path · Own your reason
        </div>

        {/* Logo */}
        <div style={{
          fontFamily: serif,
          fontSize: '44px',
          fontWeight: 300,
          color: white,
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          marginBottom: '6px',
        }}>
          Occupath
        </div>

        {/* Accent rule */}
        <div style={{ width: '56px', height: '2px', background: ochre, marginBottom: '22px' }} />

        {/* Trip title */}
        <div style={{
          fontFamily: serif,
          fontSize: '26px',
          fontWeight: 400,
          color: white,
          lineHeight: 1.2,
          marginBottom: '10px',
        }}>
          {trip.preferences?.days ?? 0} 天{destinations ? `・${destinations}` : ''} 專屬行程
        </div>

        {/* Meta */}
        <div style={{
          fontSize: '12px',
          color: 'rgba(255,255,255,0.55)',
          fontFamily: serif,
          letterSpacing: '0.04em',
        }}>
          {[
            trip.preferences?.budget ? `預算 NT$ ${trip.preferences.budget.toLocaleString()}` : null,
            trip.preferences?.interests?.length ? trip.preferences.interests.join('、') : null,
            generatedDate ? `生成於 ${generatedDate}` : null,
          ].filter(Boolean).join('  ·  ')}
        </div>
      </div>

      {/* ══ STATS BAR (table layout avoids flex-wrap issues) ══ */}
      <table style={{
        width: '794px',
        borderCollapse: 'collapse',
        background: bgWarm,
        borderBottom: `1px solid ${borderCol}`,
        boxSizing: 'border-box',
      }}>
        <tbody>
          <tr>
            {[
              { label: '旅遊天數', value: `${trip.summary.totalDays} 天` },
              { label: '總預算預估', value: trip.summary.totalBudget },
              { label: '景點總數', value: `${trip.summary.totalAttractions} 處` },
              { label: '每日平均', value: `${trip.summary.avgPerDay} 處` },
            ].map((stat, i) => (
              <td key={i} style={{
                width: '25%',
                padding: '18px 0',
                textAlign: 'center' as const,
                borderRight: i < 3 ? `1px solid ${borderCol}` : 'none',
              }}>
                <div style={{
                  fontSize: '10px',
                  color: mist,
                  fontFamily: serif,
                  letterSpacing: '1px',
                  textTransform: 'uppercase' as const,
                  marginBottom: '6px',
                }}>
                  {stat.label}
                </div>
                <div style={{
                  fontSize: '19px',
                  fontWeight: 600,
                  color: prussian,
                  fontFamily: serif,
                }}>
                  {stat.value}
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* ══ DAILY ITINERARY ══ */}
      <div style={{ padding: '36px 48px 20px', boxSizing: 'border-box', width: '794px' }}>
        {trip.days.map((day, dayIndex) => (
          <div key={day.day} style={{ marginBottom: '40px' }}>
            {/* Day separator (except first) */}
            {dayIndex > 0 && (
              <div style={{ height: '1px', background: borderCol, marginBottom: '36px' }} />
            )}

            {/* Day header */}
            <div style={{ marginBottom: '20px', paddingBottom: '12px', borderBottom: `1px solid ${borderCol}` }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <tbody>
                  <tr>
                    <td style={{ width: 1, paddingRight: '12px', verticalAlign: 'middle' }}>
                      <div style={{
                        background: prussian,
                        color: white,
                        fontFamily: serif,
                        fontSize: '10px',
                        fontWeight: 600,
                        letterSpacing: '1.5px',
                        textTransform: 'uppercase' as const,
                        padding: '5px 13px',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap' as const,
                      }}>
                        Day {day.day}
                      </div>
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
                      <div style={{
                        fontFamily: serif,
                        fontSize: '15px',
                        color: mist,
                        letterSpacing: '0.04em',
                      }}>
                        {day.date ?? ''}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' as const, verticalAlign: 'middle' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: ochre, display: 'inline-block' }} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Attraction cards */}
            {day.attractions.map((attraction: Attraction, index: number) => (
              <AttractionRow key={attraction.id} attraction={attraction} index={index} />
            ))}
          </div>
        ))}
      </div>

      {/* ══ FOOTER ══ */}
      <div style={{
        margin: '0 48px',
        paddingTop: '18px',
        paddingBottom: '36px',
        borderTop: `1px solid ${borderCol}`,
        boxSizing: 'border-box',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: 'middle' }}>
                <div style={{
                  fontFamily: serif,
                  fontSize: '11px',
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase' as const,
                  color: ochre,
                }}>
                  Occupath
                </div>
              </td>
              <td style={{ textAlign: 'right' as const, verticalAlign: 'middle' }}>
                <div style={{ fontSize: '11px', color: mist, fontFamily: serif }}>
                  由 Occupath AI 行程規劃自動生成
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Attraction Row (table-based for stable layout) ── */
function AttractionRow({ attraction, index }: { attraction: Attraction; index: number }) {
  return (
    <div style={{
      marginBottom: '12px',
      padding: '16px 18px',
      background: bgWarm,
      border: `1px solid ${borderCol}`,
      borderRadius: '10px',
      boxSizing: 'border-box',
      pageBreakInside: 'avoid',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            {/* Sequence badge */}
            <td style={{ width: '30px', verticalAlign: 'top', paddingTop: '2px', paddingRight: '10px' }}>
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                border: `1.5px solid ${ochre}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: serif,
                fontSize: '12px',
                fontWeight: 700,
                color: ochre,
                textAlign: 'center' as const,
                lineHeight: '26px',
              }}>
                {index + 1}
              </div>
            </td>

            {/* Thumbnail */}
            <td style={{ width: '82px', verticalAlign: 'top', paddingRight: '16px' }}>
              {attraction.image ? (
                <img
                  src={attraction.image}
                  alt={attraction.name}
                  style={{ width: '82px', height: '82px', objectFit: 'cover', borderRadius: '7px', display: 'block' }}
                />
              ) : (
                <div style={{
                  width: '82px', height: '82px',
                  background: '#EAE8E2',
                  borderRadius: '7px',
                  textAlign: 'center' as const,
                  verticalAlign: 'middle',
                  lineHeight: '82px',
                  color: mist,
                  fontSize: '10px',
                  fontFamily: serif,
                }}>
                  無圖片
                </div>
              )}
            </td>

            {/* Content */}
            <td style={{ verticalAlign: 'top' }}>
              {/* Name + category */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '5px' }}>
                <tbody>
                  <tr>
                    <td style={{ verticalAlign: 'top' }}>
                      <div style={{
                        fontFamily: serif,
                        fontSize: '17px',
                        fontWeight: 600,
                        color: prussian,
                        lineHeight: 1.2,
                      }}>
                        {attraction.name}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' as const, verticalAlign: 'top', paddingLeft: '10px', whiteSpace: 'nowrap' as const }}>
                      <span style={{
                        fontSize: '10px',
                        padding: '3px 9px',
                        background: white,
                        border: `1px solid ${borderCol}`,
                        borderRadius: '999px',
                        color: mist,
                        letterSpacing: '0.05em',
                        display: 'inline-block',
                      }}>
                        {attraction.category}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Location */}
              {attraction.location && (
                <div style={{ fontSize: '11px', color: mist, fontFamily: serif, letterSpacing: '0.06em', marginBottom: '5px' }}>
                  📍 {attraction.location}
                </div>
              )}

              {/* Description */}
              <div style={{ fontSize: '12px', color: '#555552', lineHeight: 1.6, marginBottom: '9px' }}>
                {attraction.description}
              </div>

              {/* Meta pills */}
              <div style={{ fontSize: '11px', color: mist, fontFamily: serif }}>
                {[
                  attraction.duration ? `⏱ ${attraction.duration}` : null,
                  attraction.estimatedCost ? `💰 ${attraction.estimatedCost}` : null,
                  attraction.rating ? `★ ${attraction.rating}` : null,
                ].filter(Boolean).join('   ·   ')}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
