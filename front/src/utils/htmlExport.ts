import type { Trip, Attraction } from '../types';

export function generateItineraryHtml(trip: Trip): string {
  if (!trip || !trip.days) return '';

  const destinations = trip.preferences?.destination?.join('・') ?? '';
  const generatedDate = trip.generatedAt
    ? new Date(trip.generatedAt).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const metaStr = [
    trip.preferences?.budget ? `預算 NT$ ${trip.preferences.budget.toLocaleString()}` : '',
    trip.preferences?.interests?.length ? trip.preferences.interests.join('、') : '',
    generatedDate ? `生成於 ${generatedDate}` : '',
  ].filter(Boolean).join(' &nbsp;·&nbsp; ');

  const html = `
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Occupath 專屬行程規劃</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&family=Noto+Serif+TC:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --prussian: #123041;
      --ochre: #C9843A;
      --mist: #7E7C73;
      --bg-warm: #FAF8F4;
      --border-c: #E8E4DC;
      --text-main: #3D3A35;
      --white: #FFFFFF;
      --font-serif: 'Noto Serif TC', serif;
      --font-sans: 'Noto Sans TC', sans-serif;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: var(--font-sans);
      background-color: var(--bg-warm);
      color: var(--text-main);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background-color: var(--white);
      min-height: 100vh;
      box-shadow: 0 4px 20px rgba(0,0,0,0.05);
    }
    
    /* Header */
    .header {
      background-color: var(--prussian);
      padding: 60px 50px 50px;
      color: var(--white);
    }
    .header-eyebrow {
      font-family: var(--font-sans);
      font-size: 11px;
      color: var(--ochre);
      letter-spacing: 2px;
      margin-bottom: 20px;
      text-transform: uppercase;
    }
    .header-logo {
      font-family: var(--font-serif);
      font-size: 40px;
      font-weight: 700;
      margin: 0 0 8px 0;
      letter-spacing: 0.02em;
    }
    .header-rule {
      width: 60px;
      height: 2px;
      background-color: var(--ochre);
      margin: 20px 0 24px;
    }
    .header-title {
      font-family: var(--font-serif);
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 12px 0;
    }
    .header-meta {
      font-family: var(--font-sans);
      font-size: 12px;
      color: rgba(255,255,255,0.7);
    }

    /* Stats Bar */
    .stats-bar {
      display: flex;
      background-color: var(--bg-warm);
      border-bottom: 1px solid var(--border-c);
    }
    .stat-cell {
      flex: 1;
      padding: 24px 20px;
      text-align: center;
      border-right: 1px solid var(--border-c);
    }
    .stat-cell:last-child {
      border-right: none;
    }
    .stat-label {
      font-family: var(--font-sans);
      font-size: 11px;
      color: var(--mist);
      margin-bottom: 6px;
      letter-spacing: 1px;
    }
    .stat-value {
      font-family: var(--font-serif);
      font-size: 20px;
      font-weight: 700;
      color: var(--prussian);
    }

    /* Body */
    .content-body {
      padding: 40px 50px 60px;
    }
    .day-block {
      margin-bottom: 50px;
    }
    .day-separator {
      height: 1px;
      background-color: var(--border-c);
      margin-bottom: 40px;
    }
    .day-header {
      display: flex;
      align-items: center;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-c);
      margin-bottom: 24px;
    }
    .day-badge {
      background-color: var(--prussian);
      color: var(--white);
      font-family: var(--font-sans);
      font-size: 11px;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 4px;
      margin-right: 16px;
      letter-spacing: 1px;
    }
    .day-date {
      font-family: var(--font-serif);
      font-size: 15px;
      color: var(--mist);
    }

    /* Attraction Card */
    .card {
      display: flex;
      margin-bottom: 20px;
      padding: 20px;
      background-color: var(--bg-warm);
      border: 1px solid var(--border-c);
      border-radius: 12px;
      page-break-inside: avoid;
    }
    .badge {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 2px solid var(--ochre);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 16px;
      flex-shrink: 0;
      background: var(--white);
    }
    .badge-text {
      font-family: var(--font-sans);
      font-size: 13px;
      font-weight: 700;
      color: var(--ochre);
      line-height: 1;
    }
    .thumb {
      width: 100px;
      height: 100px;
      border-radius: 8px;
      object-fit: cover;
      margin-right: 20px;
      flex-shrink: 0;
    }
    .no-thumb {
      width: 100px;
      height: 100px;
      border-radius: 8px;
      background-color: #EAE8E2;
      margin-right: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .no-thumb-text {
      font-size: 11px;
      color: var(--mist);
    }
    .card-content {
      flex: 1;
      min-width: 0;
    }
    .name-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 6px;
    }
    .attraction-name {
      font-family: var(--font-serif);
      font-size: 18px;
      font-weight: 700;
      color: var(--prussian);
      margin: 0;
      line-height: 1.3;
      padding-right: 12px;
    }
    .category-pill {
      font-size: 11px;
      color: var(--mist);
      border: 1px solid var(--border-c);
      border-radius: 999px;
      padding: 4px 10px;
      background-color: var(--white);
      white-space: nowrap;
    }
    .location {
      font-size: 12px;
      color: var(--mist);
      margin-bottom: 8px;
    }
    .description {
      font-size: 13px;
      color: #555552;
      line-height: 1.7;
      margin: 0 0 12px 0;
    }
    .meta-row {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .meta-text {
      font-size: 12px;
      color: var(--mist);
      background: var(--white);
      border: 1px solid var(--border-c);
      padding: 4px 10px;
      border-radius: 6px;
    }

    /* Footer */
    .footer {
      border-top: 1px solid var(--border-c);
      padding: 30px 50px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .footer-brand {
      font-family: var(--font-serif);
      font-size: 14px;
      font-weight: 700;
      color: var(--ochre);
      letter-spacing: 1px;
    }
    .footer-note {
      font-size: 12px;
      color: var(--mist);
    }
    
    @media print {
      body {
        background-color: var(--white);
      }
      .container {
        box-shadow: none;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="header-eyebrow">OCCUPATH · Occupy your path, Own your reason</div>
      <h1 class="header-logo">Occupath</h1>
      <div class="header-rule"></div>
      <h2 class="header-title">${trip.preferences?.days ?? 0} 天${destinations ? `・${destinations}` : ''} 專屬旅遊行程</h2>
      ${metaStr ? `<div class="header-meta">${metaStr}</div>` : ''}
    </div>

    <!-- Stats Bar -->
    <div class="stats-bar">
      <div class="stat-cell">
        <div class="stat-label">旅遊天數</div>
        <div class="stat-value">${trip.summary.totalDays} 天</div>
      </div>
      <div class="stat-cell">
        <div class="stat-label">預算預估</div>
        <div class="stat-value">${trip.summary.totalBudget}</div>
      </div>
      <div class="stat-cell">
        <div class="stat-label">景點總數</div>
        <div class="stat-value">${trip.summary.totalAttractions} 處</div>
      </div>
      <div class="stat-cell">
        <div class="stat-label">每日平均</div>
        <div class="stat-value">${trip.summary.avgPerDay} 處</div>
      </div>
    </div>

    <!-- Body -->
    <div class="content-body">
      ${trip.days.map((day, dayIndex) => `
        <div class="day-block">
          ${dayIndex > 0 ? '<div class="day-separator"></div>' : ''}
          <div class="day-header">
            <span class="day-badge">DAY ${day.day}</span>
            ${day.date ? `<span class="day-date">${day.date}</span>` : ''}
          </div>
          
          <div class="attractions">
            ${day.attractions.map((a: Attraction, idx: number) => `
              <div class="card">
                <div class="badge">
                  <span class="badge-text">${idx + 1}</span>
                </div>
                ${a.image ? `<img src="${a.image}" alt="${a.name}" class="thumb" loading="lazy" />` : `
                  <div class="no-thumb"><span class="no-thumb-text">無圖片</span></div>
                `}
                <div class="card-content">
                  <div class="name-row">
                    <h3 class="attraction-name">${a.name}</h3>
                    <span class="category-pill">${a.category}</span>
                  </div>
                  ${a.location ? `<div class="location">📍 ${a.location}</div>` : ''}
                  <p class="description">${a.description}</p>
                  <div class="meta-row">
                    ${a.duration ? `<span class="meta-text">⏱ ${a.duration}</span>` : ''}
                    ${a.estimatedCost ? `<span class="meta-text">💰 ${a.estimatedCost}</span>` : ''}
                    ${a.rating ? `<span class="meta-text">★ ${a.rating}</span>` : ''}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-brand">OCCUPATH</div>
      <div class="footer-note">由 Occupath AI 行程規劃自動生成</div>
    </div>
  </div>
</body>
</html>
  `;

  return html.trim();
}
