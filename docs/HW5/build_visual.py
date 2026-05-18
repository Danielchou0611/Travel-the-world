#!/usr/bin/env python3
"""HW5 → 單檔視覺化 HTML 生成器

用法:python3 build_visual.py
產出:HW5_期末作業5.html(自包含,Chrome 可直接 Cmd+P 另存 PDF)
"""
from pathlib import Path
import re
import datetime

SRC = Path(__file__).parent / "HW5_期末作業5.md"
DST = Path(__file__).parent / "HW5_期末作業5.html"

TEMPLATE = r"""<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Occupath · HW5 期末專題進度報告</title>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;500;700&family=Noto+Sans+TC:wght@300;400;500;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">

<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css" />

<style>
  :root {
    --prussian: #1B3A5C;
    --prussian-deep: #0F2942;
    --prussian-night: #091A2B;
    --vermillion: #BC4630;
    --vermillion-soft: #D96A4F;
    --ochre: #D4A574;
    --ochre-deep: #A87E50;
    --washi: #F4EEE2;
    --washi-warm: #EAE0CC;
    --sumi: #1A1A1A;
    --sumi-warm: #544D4B;
    --mist: #7A7A7A;
    --kohaku: #92BED2;
  }

  * { box-sizing: border-box; }

  html { scroll-behavior: smooth; }

  body {
    margin: 0;
    background: var(--washi);
    color: var(--sumi-warm);
    font-family: "Noto Sans TC", -apple-system, system-ui, sans-serif;
    font-size: 15px;
    line-height: 1.75;
  }

  /* ============ LAYOUT ============ */
  .layout {
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
    gap: 40px;
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 32px;
  }

  /* ============ COVER ============ */
  .cover {
    background: linear-gradient(135deg, var(--prussian-night) 0%, var(--prussian) 60%, var(--prussian-deep) 100%);
    color: var(--washi);
    padding: 96px 40px 80px;
    text-align: center;
    page-break-after: always;
    position: relative;
    overflow: hidden;
  }
  .cover::before {
    content: "";
    position: absolute;
    top: -120px; right: -120px;
    width: 400px; height: 400px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(212,165,116,0.25), transparent 70%);
    pointer-events: none;
  }
  .cover::after {
    content: "";
    position: absolute;
    bottom: -80px; left: -80px;
    width: 300px; height: 300px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(188,70,48,0.2), transparent 70%);
    pointer-events: none;
  }
  .cover-eyebrow {
    font-family: "JetBrains Mono", monospace;
    letter-spacing: 0.4em;
    font-size: 11px;
    text-transform: uppercase;
    opacity: 0.6;
    margin-bottom: 24px;
  }
  .cover-title {
    font-family: "Noto Serif TC", serif;
    font-weight: 700;
    font-size: 56px;
    margin: 0 0 12px;
    letter-spacing: 0.02em;
    line-height: 1.2;
  }
  .cover-subtitle {
    font-family: "Noto Serif TC", serif;
    font-weight: 400;
    font-size: 22px;
    color: var(--ochre);
    margin: 0 0 60px;
    letter-spacing: 0.1em;
  }
  .cover-meta {
    display: inline-block;
    text-align: left;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(244,238,226,0.15);
    border-radius: 8px;
    padding: 24px 36px;
    font-size: 14px;
    line-height: 2;
  }
  .cover-meta dt {
    display: inline-block;
    width: 90px;
    color: var(--ochre);
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.15em;
  }
  .cover-meta dd { display: inline; margin: 0; }
  .cover-meta dl { margin: 0; }
  .cover-tag {
    display: inline-block;
    margin-top: 48px;
    padding: 6px 16px;
    border: 1px solid var(--ochre);
    color: var(--ochre);
    border-radius: 999px;
    font-size: 12px;
    letter-spacing: 0.2em;
    font-family: "JetBrains Mono", monospace;
  }

  /* ============ TOC (sidebar) ============ */
  .toc {
    position: sticky;
    top: 32px;
    align-self: start;
    max-height: calc(100vh - 64px);
    overflow-y: auto;
    padding: 24px 0;
    font-size: 13px;
    border-right: 1px solid rgba(27,58,92,0.12);
    padding-right: 20px;
  }
  .toc-title {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    letter-spacing: 0.3em;
    color: var(--mist);
    text-transform: uppercase;
    margin-bottom: 16px;
  }
  .toc ul { list-style: none; padding: 0; margin: 0; }
  .toc li { margin: 0; }
  .toc a {
    display: block;
    color: var(--sumi-warm);
    text-decoration: none;
    padding: 4px 0 4px 12px;
    border-left: 2px solid transparent;
    transition: all 0.15s;
  }
  .toc a:hover, .toc a.active {
    color: var(--vermillion);
    border-left-color: var(--vermillion);
    background: rgba(188,70,48,0.04);
  }
  .toc a.lv-h1 { font-weight: 700; color: var(--prussian-deep); margin-top: 12px; }
  .toc a.lv-h2 { padding-left: 24px; }
  .toc a.lv-h3 { padding-left: 36px; font-size: 12px; color: var(--mist); }

  /* ============ CONTENT ============ */
  .content {
    max-width: 820px;
    padding: 40px 0 80px;
  }

  h1, h2, h3, h4 {
    font-family: "Noto Serif TC", serif;
    color: var(--prussian-deep);
    font-weight: 700;
    letter-spacing: 0.01em;
    line-height: 1.35;
  }
  h1 {
    font-size: 32px;
    margin: 64px 0 24px;
    padding-bottom: 12px;
    border-bottom: 3px solid var(--vermillion);
    position: relative;
  }
  h1::before {
    content: "";
    position: absolute;
    bottom: -3px;
    left: 0;
    width: 60px;
    height: 3px;
    background: var(--ochre);
  }
  h2 {
    font-size: 24px;
    margin: 48px 0 16px;
    padding-left: 14px;
    border-left: 4px solid var(--prussian);
  }
  h3 {
    font-size: 18px;
    margin: 32px 0 12px;
    color: var(--prussian);
  }
  h3::before {
    content: "§ ";
    color: var(--ochre);
    font-weight: 400;
  }
  h4 {
    font-size: 15px;
    margin: 24px 0 8px;
    color: var(--vermillion);
  }

  p { margin: 0 0 14px; }

  strong { color: var(--prussian-deep); font-weight: 700; }
  em { color: var(--vermillion); font-style: normal; font-weight: 500; }

  a {
    color: var(--vermillion);
    text-decoration: none;
    border-bottom: 1px dashed var(--vermillion-soft);
  }
  a:hover { border-bottom-style: solid; }

  /* lists */
  ul, ol { padding-left: 24px; }
  li { margin: 6px 0; }
  li::marker { color: var(--vermillion); }

  /* blockquote */
  blockquote {
    margin: 20px 0;
    padding: 12px 20px;
    background: rgba(212,165,116,0.12);
    border-left: 4px solid var(--ochre);
    color: var(--sumi-warm);
    font-style: italic;
    border-radius: 0 6px 6px 0;
  }
  blockquote > p:last-child { margin: 0; }

  /* tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 18px 0;
    font-size: 13px;
    background: #FFFFFF;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(15,41,66,0.08);
  }
  thead {
    background: var(--prussian);
    color: var(--washi);
  }
  th, td {
    padding: 10px 14px;
    text-align: left;
    border-bottom: 1px solid rgba(27,58,92,0.08);
    vertical-align: top;
  }
  th {
    font-family: "Noto Sans TC", sans-serif;
    font-weight: 500;
    letter-spacing: 0.05em;
    font-size: 12px;
  }
  tbody tr:nth-child(even) { background: var(--washi); }
  tbody tr:hover { background: rgba(188,70,48,0.04); }

  /* inline code */
  code {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.88em;
    background: rgba(27,58,92,0.08);
    padding: 2px 6px;
    border-radius: 3px;
    color: var(--prussian-deep);
  }

  /* code block (pre > code) — overrides prism */
  pre[class*="language-"] {
    background: var(--prussian-night) !important;
    border-radius: 8px;
    padding: 18px 20px !important;
    font-size: 12.5px !important;
    line-height: 1.6 !important;
    margin: 18px 0 !important;
    overflow-x: auto;
    border: 1px solid rgba(27,58,92,0.12);
  }
  pre[class*="language-"] code {
    background: transparent;
    padding: 0;
    color: inherit;
    font-size: inherit;
  }

  /* ASCII diagram detection (code block 內含框線符號)
     marked.js 不會自動標 ASCII;我們用 .ascii-diagram 類別覆蓋
     字體鏈用 macOS 系統 CJK monospace 確保「全形漢字 = 2 × 半形」,
     不然框線會跑掉(JetBrains Mono 不含 CJK,fallback 不可控) */
  pre.ascii-diagram {
    background: var(--washi-warm) !important;
    border: 1px solid rgba(168,126,80,0.3);
    color: var(--prussian-deep);
    font-family:
      "Menlo",
      "Monaco",
      "SFMono-Regular",
      "Courier New",
      "PingFang TC",
      "Heiti TC",
      "Hiragino Sans GB",
      "Hiragino Mincho ProN",
      "MS Gothic",
      monospace;
    font-size: 11.5px !important;
    line-height: 1.55 !important;
    letter-spacing: 0 !important;
    font-kerning: none;
    font-variant-ligatures: none;
    font-variant-east-asian: full-width;
    font-feature-settings: "calt" 0, "liga" 0;
    text-rendering: geometricPrecision;
    -webkit-font-smoothing: antialiased;
    padding: 16px 20px !important;
    border-radius: 8px;
    margin: 18px 0;
    overflow-x: auto;
    white-space: pre;
    tab-size: 4;
  }
  pre.ascii-diagram code {
    background: transparent;
    color: inherit;
    font-size: inherit;
    letter-spacing: inherit;
    font-family: inherit;
    padding: 0;
    /* 內層也要繼承,Prism 否則會 inject 自己的 font-family */
  }

  hr {
    border: none;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--prussian), transparent);
    margin: 48px 0;
  }

  /* badge for emoji checkboxes */
  .content li:has(input[type="checkbox"]) {
    list-style: none;
    margin-left: -16px;
  }

  /* page footer / pagination feel */
  .footer {
    text-align: center;
    padding: 60px 0 40px;
    color: var(--mist);
    font-size: 12px;
    font-family: "JetBrains Mono", monospace;
    letter-spacing: 0.1em;
  }

  /* ============ PRINT ============ */
  @media print {
    @page {
      size: A4;
      margin: 18mm 16mm;
    }
    body { font-size: 11.5pt; background: #FFFFFF; }
    .layout { display: block; max-width: none; padding: 0; }
    .toc, .toc-toggle { display: none !important; }
    .content { max-width: none; padding: 0; }
    .cover {
      min-height: 90vh;
      padding: 80px 40px;
      page-break-after: always;
    }
    h1, h2 { page-break-after: avoid; }
    pre, table, blockquote { page-break-inside: avoid; }
    pre.ascii-diagram { font-size: 9pt !important; }
    pre[class*="language-"] { font-size: 10pt !important; }
    a { color: var(--prussian-deep); border-bottom: none; }
    a::after {
      /* don't print URL after every link – just keep clean */
      content: "";
    }
    /* Hide cover decorative blobs in print to avoid washed-out blocks */
    .cover::before, .cover::after { display: none; }
  }

  /* mobile fallback */
  @media (max-width: 880px) {
    .layout { grid-template-columns: 1fr; gap: 0; padding: 0 20px; }
    .toc { display: none; }
    .cover-title { font-size: 38px; }
    .cover-subtitle { font-size: 16px; }
  }
</style>
</head>
<body>

<!-- ========= COVER ========= -->
<div class="cover">
  <div class="cover-eyebrow">NTU × NTUST · Web Application · Final Project</div>
  <h1 class="cover-title">Occupath</h1>
  <p class="cover-subtitle">可解釋 AI 日本自由行規劃工具<br/>HW5 · 期末專題進度報告</p>

  <div class="cover-meta">
    <dl>
      <dt>組別</dt><dd>O 組 · Solo Founder 編制</dd><br/>
      <dt>創辦人</dt><dd>周宜學 Ray · R14458007 · 醫材所碩一 · 台大</dd><br/>
      <dt>協作者</dt><dd>Daniel / 李冠霖 / Wen / Austin / Apple(5 人)</dd><br/>
      <dt>繳交日</dt><dd>2026 年 5 月 18 日</dd><br/>
      <dt>字數</dt><dd>約 14,500 字 / 預估 28-32 頁</dd><br/>
      <dt>GitHub</dt><dd>github.com/Danielchou0611/Travel-the-world (branch: ray)</dd>
    </dl>
  </div>

  <div class="cover-tag">Occupy your path · Own your reason</div>
</div>

<!-- ========= BODY ========= -->
<div class="layout">

  <!-- ========= TOC ========= -->
  <nav class="toc" id="toc">
    <div class="toc-title">目次 Contents</div>
    <ul id="toc-list"></ul>
  </nav>

  <!-- ========= CONTENT ========= -->
  <main class="content" id="content"></main>

</div>

<div class="footer">
  Occupath HW5 · 2026-05-18 · Generated as single-file HTML
</div>

<!-- ========= Markdown source(embedded as raw text)========= -->
<script type="text/markdown" id="md-src">
__MARKDOWN_CONTENT__
</script>

<!-- ========= libs ========= -->
<script src="https://cdn.jsdelivr.net/npm/marked@11.2.0/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-core.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-javascript.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-python.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-bash.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-yaml.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-json.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-css.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-markdown.min.js"></script>

<script>
(function () {
  const mdRaw = document.getElementById('md-src').textContent;
  const html = marked.parse(mdRaw, { gfm: true, breaks: false });

  const contentEl = document.getElementById('content');
  contentEl.innerHTML = html;

  // ===== ASCII diagram detection =====
  // Any <pre><code> whose textContent contains ┌ │ └ ─ → mark as .ascii-diagram
  contentEl.querySelectorAll('pre code').forEach((codeEl) => {
    const txt = codeEl.textContent;
    if (/[┌│└─┐┘├┤┬┴┼]/.test(txt) || /^\s*[│\|]\s+.+[│\|]\s*$/m.test(txt)) {
      codeEl.parentElement.classList.add('ascii-diagram');
      // strip language- class so Prism doesn't try to highlight
      codeEl.className = '';
      codeEl.parentElement.className = 'ascii-diagram';
    }
  });

  // ===== Prism highlight (skip ASCII diagrams) =====
  contentEl.querySelectorAll('pre:not(.ascii-diagram) code').forEach((codeEl) => {
    if (!codeEl.className) codeEl.className = 'language-plain';
    if (window.Prism) Prism.highlightElement(codeEl);
  });

  // ===== Build TOC =====
  const tocList = document.getElementById('toc-list');
  const headings = contentEl.querySelectorAll('h1, h2, h3');
  let counter = 0;
  headings.forEach((h) => {
    if (!h.id) {
      h.id = 'h-' + (counter++) + '-' + (h.textContent || '').replace(/\s+/g, '-').slice(0, 30);
    }
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#' + h.id;
    a.textContent = h.textContent.replace(/^[#§]\s*/, '');
    a.className = 'lv-' + h.tagName.toLowerCase();
    li.appendChild(a);
    tocList.appendChild(li);
  });

  // ===== Scroll spy =====
  const tocLinks = tocList.querySelectorAll('a');
  const linkMap = new Map();
  tocLinks.forEach((a) => linkMap.set(a.getAttribute('href').slice(1), a));

  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const link = linkMap.get(entry.target.id);
      if (!link) return;
      if (entry.isIntersecting) {
        tocLinks.forEach((a) => a.classList.remove('active'));
        link.classList.add('active');
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  headings.forEach((h) => obs.observe(h));
})();
</script>
</body>
</html>
"""

def main():
    md = SRC.read_text(encoding="utf-8")

    # 防呆:避免 markdown 內有 </script> 破壞容器(已預檢,但保險)
    if "</script>" in md.lower():
        md = md.replace("</script>", "<\\/script>")

    html = TEMPLATE.replace("__MARKDOWN_CONTENT__", md)
    DST.write_text(html, encoding="utf-8")
    size_kb = DST.stat().st_size / 1024
    print(f"✅ Built: {DST}")
    print(f"   Size: {size_kb:.1f} KB (single file, self-contained)")
    print(f"\n下一步:")
    print(f"   1. open '{DST}'  ← Finder 雙擊或瀏覽器打開")
    print(f"   2. Cmd+P → 目的地選「另存為 PDF」")
    print(f"      → 設定為 A4、邊界=預設、勾選「背景圖形」")
    print(f"   3. 另存到 HW5_期末作業5.pdf 即可繳交")

if __name__ == "__main__":
    main()
