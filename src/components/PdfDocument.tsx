import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer';
import type { Trip, Attraction } from '../types';

/* ── Local fonts ── */
const FONT_BASE = `${window.location.origin}/fonts`;
Font.register({
  family: 'NotoSansTC',
  fonts: [
    { src: `${FONT_BASE}/NotoSansTC-Regular.ttf`, fontWeight: 400 },
    { src: `${FONT_BASE}/NotoSansTC-Bold.ttf`,    fontWeight: 700 },
  ],
});

/* ── Design tokens ── */
const prussian = '#123041';
const ochre    = '#C9843A';
const mist     = '#7E7C73';
const bgWarm   = '#FAF8F4';
const borderC  = '#E8E4DC';
const white    = '#FFFFFF';
const F        = 'NotoSansTC';

/*
 * A4 in @react-pdf/renderer = 595.28 × 841.89 pt
 * Page padding = 40pt left/right, 36pt top, 24pt bottom
 * Content width = 595.28 - 80 = 515.28 ≈ 515 pt
 *
 * Card inner row widths (515 - 12 padding × 2 = 491 content):
 *   badge  = 22 pt
 *   gap    = 8  pt
 *   thumb  = 72 pt
 *   gap    = 10 pt
 *   text   = 491 - 22 - 8 - 72 - 10 = 379 pt
 */
const PAGE_H_PAD = 40;
const CONTENT_W  = 515;
const TEXT_W     = 379;

const styles = StyleSheet.create({
  page: {
    fontFamily: F,
    backgroundColor: white,
    paddingLeft:  PAGE_H_PAD,
    paddingRight: PAGE_H_PAD,
    paddingTop:   0,
    paddingBottom: 24,
    fontSize: 9,
    lineHeight: 1.5,
    color: '#3D3A35',
  },

  /* ── Header (full-bleed = negative horizontal margins) ── */
  header: {
    backgroundColor: prussian,
    marginLeft:  -PAGE_H_PAD,
    marginRight: -PAGE_H_PAD,
    paddingLeft:  PAGE_H_PAD,
    paddingRight: PAGE_H_PAD,
    paddingTop:   36,
    paddingBottom: 28,
  },
  headerEyebrow: {
    fontFamily: F,
    fontSize: 7,
    color: ochre,
    marginBottom: 10,
  },
  headerLogo: {
    fontFamily: F,
    fontWeight: 700,
    fontSize: 28,
    color: white,
    marginBottom: 4,
  },
  headerRule: {
    width: 44,
    height: 1.5,
    backgroundColor: ochre,
    marginBottom: 14,
  },
  headerTitle: {
    fontFamily: F,
    fontWeight: 700,
    fontSize: 16,
    color: white,
    marginBottom: 6,
  },
  headerMeta: {
    fontFamily: F,
    fontSize: 7,
    color: 'rgba(255,255,255,0.55)',
  },

  /* ── Stats bar ── */
  statsBar: {
    flexDirection: 'row',
    marginLeft:  -PAGE_H_PAD,
    marginRight: -PAGE_H_PAD,
    borderBottomWidth: 1,
    borderBottomColor: borderC,
    backgroundColor: bgWarm,
    marginBottom: 24,
  },
  statCell: {
    width: '25%',
    paddingTop:    14,
    paddingBottom: 14,
    alignItems: 'center',
  },
  statBorderRight: {
    borderRightWidth: 1,
    borderRightColor: borderC,
  },
  statLabel: {
    fontFamily: F,
    fontSize: 7,
    color: mist,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: F,
    fontWeight: 700,
    fontSize: 13,
    color: prussian,
  },

  /* ── Day block ── */
  dayBlock: {
    marginBottom: 20,
  },
  daySeparator: {
    height: 1,
    backgroundColor: borderC,
    marginBottom: 20,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: borderC,
    marginBottom: 12,
    width: CONTENT_W,
  },
  dayBadge: {
    backgroundColor: prussian,
    color: white,
    fontFamily: F,
    fontWeight: 700,
    fontSize: 7,
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 9,
    paddingRight: 9,
    borderRadius: 3,
    marginRight: 10,
  },
  dayDate: {
    fontFamily: F,
    fontSize: 9,
    color: mist,
  },

  /* ── Attraction card ── */
  card: {
    flexDirection: 'row',
    marginBottom: 8,
    padding: 12,
    backgroundColor: bgWarm,
    borderWidth: 1,
    borderColor: borderC,
    borderRadius: 6,
    width: CONTENT_W,
  },

  /* Sequence circle */
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: ochre,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 1,
  },
  badgeText: {
    fontFamily: F,
    fontWeight: 700,
    fontSize: 8,
    color: ochre,
    lineHeight: 1,
  },

  /* Thumbnail */
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 5,
    marginRight: 10,
  },
  noThumb: {
    width: 72,
    height: 72,
    borderRadius: 5,
    backgroundColor: '#EAE8E2',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noThumbText: {
    fontFamily: F,
    fontSize: 7,
    color: mist,
  },

  /* Content column – explicit width so text never overflows */
  contentCol: {
    width: TEXT_W,
    flexDirection: 'column',
  },

  /* Name row: name left, category pill right */
  nameRow: {
    flexDirection: 'row',
    width: TEXT_W,
    marginBottom: 3,
  },
  attractionName: {
    fontFamily: F,
    fontWeight: 700,
    fontSize: 11,
    color: prussian,
    lineHeight: 1.2,
    width: TEXT_W - 60, /* reserve 60 for pill */
  },
  categoryPill: {
    fontFamily: F,
    fontSize: 7,
    color: mist,
    borderWidth: 1,
    borderColor: borderC,
    borderRadius: 10,
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 6,
    paddingRight: 6,
    backgroundColor: white,
    width: 58,
    textAlign: 'center',
  },

  location: {
    fontFamily: F,
    fontSize: 7.5,
    color: mist,
    marginBottom: 4,
    width: TEXT_W,
  },
  description: {
    fontFamily: F,
    fontSize: 8,
    color: '#555552',
    lineHeight: 1.55,
    marginBottom: 6,
    width: TEXT_W,
  },

  /* Meta row: simple string, no pill borders to keep it safe */
  metaText: {
    fontFamily: F,
    fontSize: 7.5,
    color: mist,
    width: TEXT_W,
  },

  /* ── Footer ── */
  footerRow: {
    flexDirection: 'row',
    width: CONTENT_W,
    borderTopWidth: 1,
    borderTopColor: borderC,
    paddingTop: 12,
    marginTop: 8,
  },
  footerBrand: {
    fontFamily: F,
    fontWeight: 700,
    fontSize: 8,
    color: ochre,
    width: CONTENT_W / 2,
  },
  footerNote: {
    fontFamily: F,
    fontSize: 8,
    color: mist,
    width: CONTENT_W / 2,
    textAlign: 'right',
  },
});

/* ── Main Component ── */
export default function PdfDocument({ trip }: { trip: Trip }) {
  if (!trip?.days) return null;

  const destinations = trip.preferences?.destination?.join('・') ?? '';
  const generatedDate = trip.generatedAt
    ? new Date(trip.generatedAt).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const metaStr = [
    trip.preferences?.budget ? `預算 NT$ ${trip.preferences.budget.toLocaleString()}` : '',
    trip.preferences?.interests?.length ? trip.preferences.interests.join('、') : '',
    generatedDate ? `生成於 ${generatedDate}` : '',
  ].filter(Boolean).join('   ·   ');

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerEyebrow}>OCCUPATH · Occupy your path, Own your reason</Text>
          <Text style={styles.headerLogo}>Occupath</Text>
          <View style={styles.headerRule} />
          <Text style={styles.headerTitle}>
            {trip.preferences?.days ?? 0} 天{destinations ? `・${destinations}` : ''} 專屬旅遊行程
          </Text>
          {metaStr ? <Text style={styles.headerMeta}>{metaStr}</Text> : null}
        </View>

        {/* STATS BAR */}
        <View style={styles.statsBar}>
          {[
            { label: '旅遊天數', value: `${trip.summary.totalDays} 天` },
            { label: '預算預估', value: String(trip.summary.totalBudget) },
            { label: '景點總數', value: `${trip.summary.totalAttractions} 處` },
            { label: '每日平均', value: `${trip.summary.avgPerDay} 處` },
          ].map((s, i) => (
            <View key={i} style={[styles.statCell, i < 3 ? styles.statBorderRight : {}]}>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
            </View>
          ))}
        </View>

        {/* DAYS */}
        {trip.days.map((day, dayIndex) => (
          <View key={day.day} style={styles.dayBlock}>
            {dayIndex > 0 && <View style={styles.daySeparator} />}

            {/* Day header */}
            <View style={styles.dayHeaderRow}>
              <Text style={styles.dayBadge}>DAY {day.day}</Text>
              {day.date ? <Text style={styles.dayDate}>{day.date}</Text> : null}
            </View>

            {/* Attractions */}
            {day.attractions.map((a: Attraction, idx: number) => {
              const metaParts = [
                a.duration       ? `⏱ ${a.duration}`       : '',
                a.estimatedCost  ? `💰 ${a.estimatedCost}`  : '',
                a.rating         ? `★ ${a.rating}`          : '',
              ].filter(Boolean).join('    ');

              return (
                <View key={a.id} style={styles.card} wrap={false}>
                  {/* Sequence badge */}
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{idx + 1}</Text>
                  </View>

                  {/* Thumbnail */}
                  {a.image ? (
                    <Image src={a.image} style={styles.thumb} />
                  ) : (
                    <View style={styles.noThumb}>
                      <Text style={styles.noThumbText}>無圖片</Text>
                    </View>
                  )}

                  {/* Text content – all widths are explicit */}
                  <View style={styles.contentCol}>
                    <View style={styles.nameRow}>
                      <Text style={styles.attractionName}>{a.name}</Text>
                      <Text style={styles.categoryPill}>{a.category}</Text>
                    </View>

                    {a.location ? (
                      <Text style={styles.location}>📍 {a.location}</Text>
                    ) : null}

                    <Text style={styles.description}>{a.description}</Text>

                    {metaParts ? (
                      <Text style={styles.metaText}>{metaParts}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        ))}

        {/* FOOTER */}
        <View style={styles.footerRow}>
          <Text style={styles.footerBrand}>OCCUPATH</Text>
          <Text style={styles.footerNote}>由 Occupath AI 行程規劃自動生成</Text>
        </View>

      </Page>
    </Document>
  );
}
