// ══════════════════════════════════════════════════════════════
// lib/generateReportHtml.js — v3 (2026-07-16) — build: hero-logo-fix + charts-batch
// Si ves esta línea en el archivo desplegado, tenés la versión correcta.
// Convierte el JSON que entrega N16/N18 en el HTML completo del reporte.
// Todo íconos y gráficos son SVG inline (nada de fuentes de símbolos,
// nada de librerías JS) para que Puppeteer lo renderice siempre igual.
// ══════════════════════════════════════════════════════════════

function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

const MODULOS_DEF = [
  { key: 'seoLocal', label: 'SEO Local', corto: 'SEO Local', peso: 0.20, color: 'var(--guru-teal)' },
  { key: 'posicionamiento', label: 'Posicionamiento', corto: 'Posicion.', peso: 0.15, color: '#4FBEB0' },
  { key: 'construccion', label: 'Construcción', corto: 'Construc.', peso: 0.20, color: 'var(--guru-gold)' },
  { key: 'publicidad', label: 'Publicidad', corto: 'Publicidad', peso: 0.10, color: 'var(--guru-accent)' },
  { key: 'aiso', label: 'AISO', corto: 'AISO', peso: 0.15, color: 'var(--guru-purple)' },
  { key: 'conversion', label: 'Conversión', corto: 'Conversión', peso: 0.10, color: '#9B8CFF' },
  { key: 'redes', label: 'Redes', corto: 'Redes', peso: 0.10, color: '#FF9B8C' },
];

function tierInfo(score) {
  if (score === null || score === undefined) return { cls: 'atencion', label: 'Sin datos', hex: '#E08A3C' };
  if (score >= 80) return { cls: 'excelente', label: 'Excelente', hex: '#0F9B8E' };
  if (score >= 60) return { cls: 'bueno', label: 'Bueno', hex: '#F5A623' };
  if (score >= 40) return { cls: 'atencion', label: 'Necesita atención', hex: '#E08A3C' };
  return { cls: 'critico', label: 'Crítico', hex: '#E94560' };
}

function globalTierLabel(score) {
  if (score >= 80) return 'Excelente presencia digital';
  if (score >= 60) return 'Bueno, con oportunidades';
  if (score >= 40) return 'Necesita atención';
  return 'Requiere acción urgente';
}

// ══════════════════════════════════════════════════════════════
// ÍCONOS SVG (reemplazan símbolos de texto que no renderizan bien
// en el Chromium minimal de Vercel)
// ══════════════════════════════════════════════════════════════
function iconCheck(hex) {
  return `<svg width="15" height="15" viewBox="0 0 20 20" style="flex-shrink:0"><circle cx="10" cy="10" r="10" fill="${hex}22"/><path d="M5.5 10.3l2.8 2.8 6-6" stroke="${hex}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function iconWarn(hex) {
  return `<svg width="15" height="15" viewBox="0 0 20 20" style="flex-shrink:0"><circle cx="10" cy="10" r="10" fill="${hex}22"/><path d="M10 6v5" stroke="${hex}" stroke-width="2" stroke-linecap="round"/><circle cx="10" cy="14" r="1.1" fill="${hex}"/></svg>`;
}
function iconCross(hex) {
  return `<svg width="15" height="15" viewBox="0 0 20 20" style="flex-shrink:0"><circle cx="10" cy="10" r="10" fill="${hex}22"/><path d="M7 7l6 6M13 7l-6 6" stroke="${hex}" stroke-width="2" stroke-linecap="round"/></svg>`;
}
function iconFor(tipo) {
  if (tipo === 'ok') return iconCheck('#0F9B8E');
  if (tipo === 'warn') return iconWarn('#E08A3C');
  return iconCross('#E94560');
}
function iconSparkle() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2l1.8 5.6L19.4 9.4 13.8 11.2 12 17l-1.8-5.8L4.6 9.4l5.6-1.8L12 2z"/></svg>`;
}
function iconPin() { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C7.6 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8zm0 11a3 3 0 110-6 3 3 0 010 6z"/></svg>`; }
function iconQuote() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0;margin-top:2px"><path d="M9.5 6C6.5 7.5 5 10 5 13c0 2.5 1.5 4 3.5 4S12 15.5 12 13c0-2-1.2-3.3-3-3.5.3-1 1.3-2.2 3-3l-2.5-.5zm9 0c-3 1.5-4.5 4-4.5 7 0 2.5 1.5 4 3.5 4s3.5-1.5 3.5-4c0-2-1.2-3.3-3-3.5.3-1 1.3-2.2 3-3L18.5 6z"/></svg>`;
}
function starsHtml(rating) {
  if (rating === null || rating === undefined) return '';
  const stars = [1, 2, 3, 4, 5].map((i) => {
    const fillPct = Math.max(0, Math.min(1, rating - (i - 1))) * 100;
    return `<svg width="15" height="15" viewBox="0 0 24 24" style="vertical-align:-3px">
      <defs><clipPath id="starclip${i}"><rect x="0" y="0" width="${(fillPct / 100) * 24}" height="24"/></clipPath></defs>
      <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5-4.7-4.6 6.5-.9z" fill="#E2E8F0"/>
      <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5-4.7-4.6 6.5-.9z" fill="#F5A623" clip-path="url(#starclip${i})"/>
    </svg>`;
  }).join('');
  return `<span class="stars">${stars}</span>`;
}

// ══════════════════════════════════════════════════════════════
// GRÁFICOS SVG
// ══════════════════════════════════════════════════════════════
function barChartSvg(scores) {
  const w = 620, h = 190, padBottom = 34, padTop = 20, gap = 12;
  const barW = (w - gap * (MODULOS_DEF.length - 1)) / MODULOS_DEF.length;
  const bars = MODULOS_DEF.map((it, i) => {
    const v = Math.max(0, Math.min(100, scores?.[it.key] ?? 0));
    const barH = (v / 100) * (h - padBottom - padTop);
    const x = i * (barW + gap);
    const y = h - padBottom - barH;
    const t = tierInfo(v);
    return `
      <rect x="${x}" y="${y}" width="${barW}" height="${Math.max(barH, 2)}" rx="6" fill="${t.hex}"/>
      <text x="${x + barW / 2}" y="${y - 7}" text-anchor="middle" font-size="12" font-weight="700" fill="#1A1A2E" font-family="Plus Jakarta Sans,sans-serif">${v}</text>
      <text x="${x + barW / 2}" y="${h - padBottom + 16}" text-anchor="middle" font-size="9" fill="#64748B" font-family="DM Sans,sans-serif">${esc(it.label)}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" style="max-width:620px;display:block">
    <line x1="0" y1="${h - padBottom}" x2="${w}" y2="${h - padBottom}" stroke="#E2E8F0"/>
    ${bars}
  </svg>`;
}

function radarChartSvg(scores) {
  const n = MODULOS_DEF.length;
  const cx = 170, cy = 165, R = 96;
  const angleStep = (2 * Math.PI) / n;
  const start = -Math.PI / 2;
  const pt = (i, pct) => {
    const a = start + i * angleStep;
    const r = R * pct;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const rings = [0.25, 0.5, 0.75, 1].map((pct) =>
    `<polygon points="${MODULOS_DEF.map((_, i) => pt(i, pct).join(',')).join(' ')}" fill="none" stroke="#E7E6F5" stroke-width="1"/>`
  ).join('');
  const axes = MODULOS_DEF.map((it, i) => {
    const [x, y] = pt(i, 1);
    const [lx, ly] = pt(i, 1.26);
    return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#E7E6F5" stroke-width="1"/>
      <text x="${lx}" y="${ly}" text-anchor="middle" font-size="8.5" fill="#64748B" font-family="DM Sans,sans-serif">${esc(it.corto)}</text>`;
  }).join('');
  const dataPts = MODULOS_DEF.map((it, i) => pt(i, Math.max(0, Math.min(100, scores?.[it.key] ?? 0)) / 100).join(',')).join(' ');
  const dots = MODULOS_DEF.map((it, i) => {
    const [x, y] = pt(i, Math.max(0, Math.min(100, scores?.[it.key] ?? 0)) / 100);
    return `<circle cx="${x}" cy="${y}" r="3" fill="var(--guru-purple)"/>`;
  }).join('');
  return `<svg viewBox="0 0 340 340" width="100%" style="max-width:340px;display:block">
    ${rings}${axes}
    <polygon points="${dataPts}" fill="var(--guru-purple)" fill-opacity="0.22" stroke="var(--guru-purple)" stroke-width="2"/>
    ${dots}
  </svg>`;
}

function donutChartSvg(scores) {
  const contributions = MODULOS_DEF.map((m) => ({ ...m, contrib: Math.max(0, scores?.[m.key] ?? 0) * m.peso }));
  const total = contributions.reduce((s, c) => s + c.contrib, 0) || 1;
  const R = 85, r = 52, cx = 100, cy = 100;
  const toRad = (a) => (a * Math.PI) / 180;
  let angleStart = -90;
  const paths = contributions.map((c) => {
    const pct = c.contrib / total;
    let angleSpan = pct * 360;
    if (angleSpan < 0.5 && angleSpan > 0) angleSpan = 0.5;
    const angleEnd = angleStart + angleSpan;
    const largeArc = angleSpan > 180 ? 1 : 0;
    const x1 = cx + R * Math.cos(toRad(angleStart)), y1 = cy + R * Math.sin(toRad(angleStart));
    const x2 = cx + R * Math.cos(toRad(angleEnd)), y2 = cy + R * Math.sin(toRad(angleEnd));
    const x1i = cx + r * Math.cos(toRad(angleStart)), y1i = cy + r * Math.sin(toRad(angleStart));
    const x2i = cx + r * Math.cos(toRad(angleEnd)), y2i = cy + r * Math.sin(toRad(angleEnd));
    const d = `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} L ${x2i} ${y2i} A ${r} ${r} 0 ${largeArc} 0 ${x1i} ${y1i} Z`;
    angleStart = angleEnd;
    return `<path d="${d}" fill="${c.color}"/>`;
  }).join('');
  const legend = contributions.map((c) =>
    `<div class="legend-item"><span class="legend-dot" style="background:${c.color}"></span>${esc(c.label)}</div>`
  ).join('');
  return `<div class="donut-wrap">
    <svg viewBox="0 0 200 200" width="170" height="170">${paths}</svg>
    <div class="legend-grid">${legend}</div>
  </div>`;
}

function gaugeSemiSvg(pct, hex, valueLabel, subLabel) {
  const clamped = Math.max(0, Math.min(100, pct));
  return `<div style="display:flex;flex-direction:column;align-items:center;width:110px;">
    <svg viewBox="0 0 120 68" width="104" height="59">
      <path d="M10,62 A50,50 0 0 1 110,62" fill="none" stroke="#E2E8F0" stroke-width="11" stroke-linecap="round"/>
      <path d="M10,62 A50,50 0 0 1 110,62" fill="none" stroke="${hex}" stroke-width="11" stroke-linecap="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="${100 - clamped}"/>
    </svg>
    <div style="margin-top:-8px;font:800 17px var(--font-display);color:${hex}">${esc(valueLabel)}</div>
    <div style="font-size:9.5px;color:var(--guru-text-secondary);text-align:center;max-width:104px;line-height:1.3;margin-top:2px;">${esc(subLabel)}</div>
  </div>`;
}
function cwvHealthPct(value, good, poor) {
  if (value <= good) return 100 - (value / good) * 34;
  if (value <= poor) return 66 - ((value - good) / (poor - good)) * 33;
  const over = Math.min(1, (value - poor) / poor);
  return Math.max(5, 33 - over * 28);
}

function domainTimelineSvg(dominio) {
  if (!dominio || !dominio.fechaRegistro || !dominio.fechaVencimiento) return '';
  let start, end;
  try { start = new Date(dominio.fechaRegistro).getTime(); end = new Date(dominio.fechaVencimiento).getTime(); } catch (e) { return ''; }
  if (!start || !end || end <= start) return '';
  const now = Date.now();
  const pctNow = Math.max(0.03, Math.min(0.97, (now - start) / (end - start)));
  const riskColors = { critico: '#E94560', alto: '#E08A3C', bajo: '#0F9B8E', vencido: '#E94560' };
  const color = riskColors[dominio.riesgoVencimiento] || '#94A3B8';
  const w = 600, y = 34, x1 = 14, x2 = w - 14;
  const xNow = x1 + (x2 - x1) * pctNow;
  const fmt = (ts) => { try { return new Date(ts).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' }); } catch (e) { return ''; } };
  return `<svg viewBox="0 0 ${w} 78" width="100%" style="max-width:${w}px;display:block">
    <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#E2E8F0" stroke-width="5" stroke-linecap="round"/>
    <line x1="${x1}" y1="${y}" x2="${xNow}" y2="${y}" stroke="#6C63FF" stroke-width="5" stroke-linecap="round"/>
    <circle cx="${x1}" cy="${y}" r="6.5" fill="#6C63FF"/>
    <circle cx="${xNow}" cy="${y}" r="7.5" fill="#1A1A2E"/>
    <circle cx="${x2}" cy="${y}" r="6.5" fill="${color}"/>
    <text x="${x1}" y="${y + 24}" font-size="11" font-weight="700" fill="#1A1A2E" font-family="Plus Jakarta Sans,sans-serif" text-anchor="start">Registrado</text>
    <text x="${x1}" y="${y + 38}" font-size="10.5" fill="#64748B" font-family="DM Sans,sans-serif" text-anchor="start">${esc(fmt(start))}</text>
    <text x="${xNow}" y="${y - 16}" font-size="11" font-weight="700" fill="#1A1A2E" font-family="Plus Jakarta Sans,sans-serif" text-anchor="middle">Hoy</text>
    <text x="${x2}" y="${y + 24}" font-size="11" font-weight="700" fill="${color}" font-family="Plus Jakarta Sans,sans-serif" text-anchor="end">Vence</text>
    <text x="${x2}" y="${y + 38}" font-size="10.5" fill="${color}" font-family="DM Sans,sans-serif" text-anchor="end">${esc(fmt(end))}</text>
  </svg>`;
}

function reputationBarSvg(rating) {
  if (rating == null) return '';
  const benchmark = 4.3;
  const w = 600, trackW = w - 150, barH = 22;
  const scale = (v) => Math.max(0, Math.min(1, v / 5)) * trackW;
  const you = scale(rating);
  const bench = scale(benchmark);
  const colorYou = rating >= benchmark ? '#0F9B8E' : rating >= benchmark - 0.5 ? '#E08A3C' : '#E94560';
  return `<svg viewBox="0 0 ${w} 92" width="100%" style="max-width:${w}px;display:block">
    <text x="0" y="14" font-size="11.5" font-weight="700" fill="#1A1A2E" font-family="Plus Jakarta Sans,sans-serif">Tu negocio</text>
    <rect x="0" y="20" width="${trackW}" height="${barH}" rx="6" fill="#EEF1F6"/>
    <rect x="0" y="20" width="${Math.max(you, 4)}" height="${barH}" rx="6" fill="${colorYou}"/>
    <text x="${you + 10}" y="${20 + barH / 2 + 4}" font-size="13" font-weight="800" fill="${colorYou}" font-family="Plus Jakarta Sans,sans-serif">${rating.toFixed(1)}</text>
    <text x="0" y="62" font-size="11.5" font-weight="700" fill="#64748B" font-family="Plus Jakarta Sans,sans-serif">Referencia de negocios bien posicionados</text>
    <rect x="0" y="68" width="${trackW}" height="${barH * 0.72}" rx="5" fill="#EEF1F6"/>
    <rect x="0" y="68" width="${Math.max(bench, 4)}" height="${barH * 0.72}" rx="5" fill="#CBD5E1"/>
    <text x="${bench + 10}" y="${68 + (barH * 0.72) / 2 + 4}" font-size="11" font-weight="700" fill="#94A3B8" font-family="DM Sans,sans-serif">${benchmark.toFixed(1)}+</text>
  </svg>`;
}

function remarketingDonutSvg(pt) {
  const segs = [
    { label: 'Google Tag Manager', active: !!pt.googleTagManager, color: '#0F9B8E' },
    { label: 'Meta Pixel', active: !!pt.metaPixelDirecto, color: '#6C63FF' },
    { label: 'Verificación de dominio Meta', active: !!pt.facebookDomainVerification, color: '#F5A623' },
  ];
  const n = segs.length;
  const R = 85, r = 52, cx = 100, cy = 100, gapDeg = 4;
  const toRad = (a) => (a * Math.PI) / 180;
  const span = 360 / n;
  let angleStart = -90;
  const paths = segs.map((s) => {
    const angleEnd = angleStart + span - gapDeg;
    const largeArc = (span - gapDeg) > 180 ? 1 : 0;
    const x1 = cx + R * Math.cos(toRad(angleStart)), y1 = cy + R * Math.sin(toRad(angleStart));
    const x2 = cx + R * Math.cos(toRad(angleEnd)), y2 = cy + R * Math.sin(toRad(angleEnd));
    const x1i = cx + r * Math.cos(toRad(angleStart)), y1i = cy + r * Math.sin(toRad(angleStart));
    const x2i = cx + r * Math.cos(toRad(angleEnd)), y2i = cy + r * Math.sin(toRad(angleEnd));
    const d = `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} L ${x2i} ${y2i} A ${r} ${r} 0 ${largeArc} 0 ${x1i} ${y1i} Z`;
    angleStart += span;
    return `<path d="${d}" fill="${s.active ? s.color : '#E2E8F0'}"/>`;
  }).join('');
  const activos = segs.filter((s) => s.active).length;
  const legend = segs.map((s) => `<div class="legend-item">${iconFor(s.active ? 'ok' : 'bad')}${esc(s.label)}</div>`).join('');
  return `<div class="donut-wrap">
    <div style="position:relative;width:170px;height:170px;flex-shrink:0;">
      <svg viewBox="0 0 200 200" width="170" height="170">${paths}</svg>
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <div style="font:800 24px var(--font-display);color:var(--guru-primary)">${activos}/3</div>
        <div style="font-size:9px;color:var(--guru-text-muted);text-transform:uppercase;letter-spacing:.04em;">activos</div>
      </div>
    </div>
    <div class="legend-grid" style="grid-template-columns:1fr;">${legend}</div>
  </div>`;
}

function cwvStatus(metric, value) {
  const th = { lcp: [2500, 4000], cls: [0.1, 0.25], tbt: [200, 600] }[metric];
  if (value <= th[0]) return { label: 'Bueno', hex: '#0F9B8E' };
  if (value <= th[1]) return { label: 'Mejorable', hex: '#E08A3C' };
  return { label: 'Lento', hex: '#E94560' };
}

function coreWebVitalsHtml(pagespeed) {
  if (!pagespeed || !pagespeed.disponible || pagespeed.lcp_ms == null) return '';
  const lcp = pagespeed.lcp_ms, cls = pagespeed.cls, tbt = pagespeed.tbt_ms;
  const gauges = [];
  const stLcp = cwvStatus('lcp', lcp);
  gauges.push(gaugeSemiSvg(cwvHealthPct(lcp, 2500, 4000), stLcp.hex, `${(lcp / 1000).toFixed(1)}s`, `Carga visual (LCP) — ${stLcp.label}`));
  if (cls != null) {
    const stCls = cwvStatus('cls', cls);
    gauges.push(gaugeSemiSvg(cwvHealthPct(cls, 0.1, 0.25), stCls.hex, cls.toFixed(2), `Estabilidad visual (CLS) — ${stCls.label}`));
  }
  if (tbt != null) {
    const stTbt = cwvStatus('tbt', tbt);
    gauges.push(gaugeSemiSvg(cwvHealthPct(tbt, 200, 600), stTbt.hex, `${Math.round(tbt)}ms`, `Interactividad (TBT) — ${stTbt.label}`));
  }
  return `<div class="detail-card detail-card-wide">
    <div class="detail-card-label">Core Web Vitals — cómo lo mide Google en tu celular</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:space-around;margin-top:6px;">${gauges.join('')}</div>
    <div class="detail-card-note" style="margin-top:4px;">Estas son las 3 métricas que Google usa para decidir tu posición en resultados de búsqueda en celular — no son opiniones, son datos que Google mide en tiempo real sobre tu sitio.</div>
  </div>`;
}

function domainTimelineCardHtml(dominio) {
  const svg = domainTimelineSvg(dominio);
  if (!svg) return '';
  return `<div class="detail-card detail-card-wide">
    <div class="detail-card-label">Línea de tiempo del dominio</div>
    ${svg}
  </div>`;
}

// ══════════════════════════════════════════════════════════════
// HELPERS DE CONTENIDO
// ══════════════════════════════════════════════════════════════
function buildSummary(scores) {
  const withScores = MODULOS_DEF.map((m) => ({ ...m, score: scores?.[m.key] ?? 0 }));
  const sorted = [...withScores].sort((a, b) => b.score - a.score);
  const best = sorted[0], worst = sorted[sorted.length - 1];
  const global = scores?.global ?? 0;
  let opening;
  if (global >= 80) opening = 'Tu presencia digital está entre las mejores de tu categoría.';
  else if (global >= 60) opening = 'Tu presencia digital está por encima del promedio, pero se te están escapando oportunidades concretas.';
  else if (global >= 40) opening = 'Tu presencia digital tiene una base, pero hay varios frentes que están frenando tu crecimiento.';
  else opening = 'Tu presencia digital necesita atención urgente en varios frentes a la vez.';
  if (best.score === worst.score) {
    return `${opening} Tus resultados están parejos en todos los frentes.`;
  }
  return `${opening} <strong>${esc(best.label)}</strong> es tu punto más fuerte (${best.score}/100). El foco más claro para mejorar es <strong>${esc(worst.label)}</strong> (${worst.score}/100).`;
}

function findOportunidad(oportunidades, area) {
  return Array.isArray(oportunidades) ? (oportunidades.find((o) => o.area === area) || null) : null;
}

function checklistHtml(items) {
  return `<ul class="check-list">${items.map((it) => `
    <li class="check-item">${iconFor(it.tipo)}<span>${it.texto}</span></li>
  `).join('')}</ul>`;
}

function chipsHtml(items) {
  if (!items.length) return '';
  return `<div class="dir-chips">${items.map((t) => `<span class="dir-chip">${iconCheck('#0F9B8E')} ${esc(t)}</span>`).join('')}</div>`;
}

// ══ MÓDULOS ══
function moduloSeoLocal(d) {
  const gbp = d.gbp || {};
  const directorios = d.directorios?.lista || [];
  const items = [];
  items.push(gbp.encontrado
    ? { tipo: 'ok', texto: 'Perfil de Google Business reclamado y verificado' }
    : { tipo: 'bad', texto: 'No encontramos un Perfil de Google Business activo' });
  if (gbp.resenas) items.push({ tipo: 'ok', texto: `${gbp.resenas} reseñas con ${gbp.rating ?? '—'}/5 de promedio` });
  if (gbp.categorias?.length) items.push({ tipo: 'ok', texto: `Categoría en Google: ${esc(gbp.categorias[0])}` });
  const opp = findOportunidad(d.oportunidades, 'SEO Local');
  const next = opp ? opp.desc : 'Ya estás fuerte acá — mantenelo respondiendo todas las reseñas nuevas.';
  const porque = 'Tu ficha de Google es lo primero que ven tanto las personas como las IA cuando buscan un negocio como el tuyo cerca. Cuantos más directorios te tengan bien listado, más confían Google y las IA en recomendarte.';
  const tarjetas = [];
  if (gbp.fotosCount) {
    tarjetas.push(`<div class="detail-card"><div class="detail-card-label">Fotos en tu ficha de Google</div><div class="detail-card-value">${gbp.fotosCount}</div><div class="detail-card-note">Más fotos reales generan más confianza para quien te encuentra por primera vez.</div></div>`);
  }
  if (gbp.ultimaPublicacion) {
    tarjetas.push(`<div class="detail-card"><div class="detail-card-label">Última publicación en Google</div><div class="detail-card-value" style="font-size:16px;">${esc(gbp.ultimaPublicacion)}</div></div>`);
  }
  return { titulo: 'SEO Local', score: d.scores?.seoLocal, chips: chipsHtml(directorios), extra: ratingBlock(gbp) + (gbp.rating != null ? `<div style="background:var(--guru-bg);border:1px solid var(--guru-border);border-radius:var(--radius-lg);padding:16px 18px;margin-bottom:14px;"><div class="detail-card-label" style="margin-bottom:10px;">Tu reputación vs. el estándar del rubro</div>${reputationBarSvg(gbp.rating)}</div>` : ''), tarjetas: tarjetas.join(''), items, next, porque };
}

function ratingBlock(gbp) {
  if (!gbp.rating) return '';
  return `<div class="rating-block">${starsHtml(gbp.rating)} <strong>${gbp.rating}</strong> <span class="rating-sub">(${gbp.resenas || 0} reseñas en Google)</span></div>`;
}

function moduloPosicionamiento(d) {
  const ha = d.htmlAnalysis || {};
  const items = [];
  const herramientas = ha.herramientasAnalytics || [];
  items.push(herramientas.length
    ? { tipo: 'ok', texto: `${herramientas.join(' y ')} instalado y midiendo` }
    : { tipo: 'bad', texto: 'No detectamos herramientas de analítica web instaladas' });
  items.push(ha.anioReciente
    ? { tipo: 'ok', texto: 'Sitio actualizado este mismo año' }
    : { tipo: 'warn', texto: 'El sitio no muestra actualizaciones recientes' });
  if (ha.palabras !== undefined) {
    items.push(ha.palabras >= 400
      ? { tipo: 'ok', texto: `Tu página de inicio tiene ${ha.palabras} palabras — buen volumen de contenido` }
      : { tipo: 'warn', texto: `Tu página de inicio tiene solo ${ha.palabras} palabras (lo recomendable es 400+)` });
  }
  if (ha.titlesDup) items.push({ tipo: 'warn', texto: 'Varias páginas de tu sitio comparten el mismo título — Google los ignora cuando eso pasa' });
  const tituloReal = (ha.titles && ha.titles[0]) || d.empresa;
  const descReal = (ha.descs && ha.descs[0]) || null;
  const serp = d.website
    ? `<div class="serp-preview">
        <div class="serp-label">Así te ve Google hoy</div>
        <div class="serp-url">${esc((d.website || '').replace(/^https?:\/\//, ''))}</div>
        <div class="serp-title">${esc(tituloReal)}</div>
        <div class="serp-desc">${descReal ? esc(descReal) : 'No encontramos una meta descripción configurada — Google arma una automáticamente con el texto de tu página, sin que vos controles cómo se ve.'}</div>
      </div>`
    : '';
  const opp = findOportunidad(d.oportunidades, 'Contenido Web');
  const next = opp ? opp.desc : 'Vas bien en este frente — seguí publicando contenido actualizado.';
  const porque = 'Google (y cada vez más las IA) leen el texto de tu sitio para entender qué vendés y a quién. Poco contenido o desactualizado es como tener el local cerrado con el cartel apagado.';
  return { titulo: 'Posicionamiento Orgánico', score: d.scores?.posicionamiento, extra: serp, items, next, porque };
}

function moduloConstruccion(d) {
  const c = d.construccion || {};
  const stack = d.stackTecnologico || {};
  const dominio = d.dominio || {};
  const pagespeed = d.pagespeed || {};
  const items = [];
  items.push(c.ssl
    ? { tipo: 'ok', texto: 'HTTPS activo — tu sitio es seguro para tus clientes' }
    : { tipo: 'bad', texto: 'Tu sitio no tiene HTTPS activo (SSL) — esto genera desconfianza y penaliza tu posición en Google' });
  items.push(c.faviconDetectado
    ? { tipo: 'ok', texto: 'Favicon (ícono de pestaña) configurado' }
    : { tipo: 'warn', texto: 'Sin favicon — un detalle chico que suma profesionalismo' });
  items.push(c.blogDetectado
    ? { tipo: 'ok', texto: 'Tiene sección de blog/noticias' }
    : { tipo: 'warn', texto: 'Sin blog — es una fuente gratis de tráfico que no estás aprovechando' });

  // Tarjetas de detalle: dominio + stack + pagespeed completo
  const tarjetas = [];
  if (stack.cms) {
    tarjetas.push(`<div class="detail-card"><div class="detail-card-label">Plataforma</div><div class="detail-card-value">${esc(stack.cms)}</div></div>`);
  }
  if (dominio.disponible && dominio.antiguedadAnios != null) {
    tarjetas.push(`<div class="detail-card"><div class="detail-card-label">Dominio registrado hace</div><div class="detail-card-value">${dominio.antiguedadAnios} años</div><div class="detail-card-note">${dominio.registrador ? 'via ' + esc(dominio.registrador) : ''} — la antigüedad transmite confianza real, tanto a Google como a un cliente que investiga antes de comprar.</div></div>`);
  }
  if (dominio.fechaVencimiento) {
    const riesgo = dominio.riesgoVencimiento;
    const riskColors = { critico: '#E94560', alto: '#E08A3C', bajo: '#0F9B8E', vencido: '#E94560' };
    const riskLabels = { critico: 'Renovación urgente', alto: 'Conviene renovar pronto', bajo: 'Sin urgencia', vencido: 'Dominio vencido' };
    const color = riskColors[riesgo] || '#94A3B8';
    const showAlert = riesgo === 'critico' || riesgo === 'alto' || riesgo === 'vencido';
    let fechaFmt = dominio.fechaVencimiento;
    try { fechaFmt = new Date(dominio.fechaVencimiento).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) {}
    tarjetas.push(`<div class="detail-card"${showAlert ? ` style="border-left:3px solid ${color}"` : ''}>
      <div class="detail-card-label">Vencimiento del dominio</div>
      <div class="detail-card-value" style="${showAlert ? `color:${color};` : ''}font-size:16px;">${esc(fechaFmt)}</div>
      <div class="detail-card-note" style="${showAlert ? `color:${color};font-weight:600;` : ''}">${riesgo === 'vencido'
        ? `${riskLabels[riesgo]} hace ${Math.abs(dominio.diasParaVencer)} días. El sitio y el correo del negocio pueden dejar de funcionar en cualquier momento.`
        : showAlert
          ? `${riskLabels[riesgo]} — quedan ${dominio.diasParaVencer} días. Si no se renueva a tiempo, el sitio y el correo del negocio pueden dejar de funcionar.`
          : `Quedan ${dominio.diasParaVencer} días — sin urgencia por ahora.`}</div>
    </div>`);
    if (showAlert) items.push({ tipo: riesgo === 'critico' || riesgo === 'vencido' ? 'bad' : 'warn', texto: `Tu dominio ${riesgo === 'vencido' ? 'ya venció' : `vence en ${dominio.diasParaVencer} días`} — conviene renovarlo cuanto antes.` });
    const timeline = domainTimelineCardHtml(dominio);
    if (timeline) tarjetas.push(timeline);
  }
  if (pagespeed.disponible) {
    const cats = [
      { l: 'Velocidad', v: pagespeed.scorePerformance },
      { l: 'SEO técnico', v: pagespeed.scoreSEO },
      { l: 'Accesibilidad', v: pagespeed.scoreAccesibilidad },
      { l: 'Buenas prácticas', v: pagespeed.scoreBuenasPracticas },
    ].filter((c) => c.v != null);
    if (cats.length) {
      tarjetas.push(`<div class="detail-card detail-card-wide"><div class="detail-card-label">Auditoría técnica de Google (PageSpeed)</div>
        <div class="mini-scores">${cats.map((c) => `<div class="mini-score"><div class="mini-score-val" style="color:${tierInfo(c.v).hex}">${c.v}</div><div class="mini-score-lbl">${esc(c.l)}</div></div>`).join('')}</div>
      </div>`);
    }
    const cwv = coreWebVitalsHtml(pagespeed);
    if (cwv) tarjetas.push(cwv);
    if (pagespeed.lcp_ms && pagespeed.scorePerformance < 80) {
      items.push({ tipo: 'warn', texto: `El contenido principal tarda ~${(pagespeed.lcp_ms / 1000).toFixed(1)} segundos en cargar en celular (ideal: menos de 2.5s)` });
    }
  }

  const next = pagespeed.disponible && pagespeed.scorePerformance < 80
    ? 'Comprimir las imágenes del sitio para acelerar la carga — un sitio que carga rápido en celular retiene más visitas y Google lo premia con mejor posición.'
    : (!c.ssl ? 'Activar HTTPS es el ajuste más urgente de todo este diagnóstico.' : 'Base técnica sólida — no hay ajustes urgentes acá.');
  const porque = 'Esto es la "casa" digital de tu negocio: si tarda en abrir, no es segura, o no tiene lo básico bien puesto, perdés visitas antes de que lleguen a conocerte, sin importar cuánto inviertas en atraerlas.';
  return { titulo: 'Construcción del Sitio', score: d.scores?.construccion, tarjetas: tarjetas.join(''), items, next, porque };
}

function moduloPublicidad(d) {
  const p = d.publicidad || {};
  const pt = d.publicidadTecnica || {};
  const items = [
    { tipo: p.googleAdsDetectado ? 'ok' : 'bad', texto: p.googleAdsDetectado ? 'Google Ads activo' : 'Sin Google Ads activo' },
    { tipo: p.displayDetectado ? 'ok' : 'bad', texto: p.displayDetectado ? 'Display (banners) activo' : 'Sin Display (banners) activo' },
    { tipo: p.metaAdsDetectado ? 'ok' : 'bad', texto: p.metaAdsDetectado ? 'Meta Ads (Facebook/Instagram) activo' : 'Sin Meta Ads activo' },
  ];
  if (pt.facebookDomainVerification && !pt.metaPixelDirecto) {
    items.push({ tipo: 'warn', texto: 'Verificaste tu dominio en Meta, pero no detectamos el Pixel de Meta instalado — sin él no podés hacer remarketing a quienes visitaron tu web en Instagram o Facebook.' });
  } else if (pt.metaPixelDirecto) {
    items.push({ tipo: 'ok', texto: 'Pixel de Meta instalado — podés hacer remarketing en Instagram y Facebook' });
  }
  const opp = findOportunidad(d.oportunidades, 'Publicidad');
  const next = opp
    ? `${opp.desc} — es el único canal donde le hablás a alguien que ya está buscando tu producto en ese momento.`
    : (pt.facebookDomainVerification && !pt.metaPixelDirecto)
      ? 'Instalar el Pixel de Meta es un ajuste de minutos que desbloquea el remarketing en Instagram y Facebook.'
      : 'Ya tenés publicidad activa en los canales principales — buen trabajo.';
  const porque = 'El SEO y las redes construyen presencia a largo plazo; la publicidad paga es lo único que te pone adelante de un cliente que está buscando comprar hoy, no en tres meses.';
  const hasTechData = pt.googleTagManager || pt.metaPixelDirecto || pt.facebookDomainVerification;
  const extra = hasTechData
    ? `<div class="chart-box" style="background:var(--guru-bg);border:1px solid var(--guru-border);border-radius:var(--radius-lg);padding:18px;margin-bottom:14px;">
        <div class="chart-title">Madurez de remarketing</div>
        ${remarketingDonutSvg(pt)}
      </div>`
    : '';
  return { titulo: 'Publicidad', score: d.scores?.publicidad, extra, items, next, porque };
}

function moduloConversion(d) {
  const c = d.conversion || {};
  const wa = d.whatsappAnalisis || {};
  const chatLabel = wa.botDetectado ? `Bot conversacional (${esc(wa.proveedorBot)})` : (c.chatTipo || 'Chat');
  const items = [
    { tipo: c.chatDetectado ? 'ok' : 'bad', texto: c.chatDetectado ? `${chatLabel} visible y funcional en el sitio` : 'No detectamos WhatsApp ni chat visible en el sitio' },
    { tipo: c.ecommerceDetectado ? 'ok' : 'warn', texto: c.ecommerceDetectado ? 'Tienda online activa y operando' : 'No detectamos tienda online / e-commerce' },
  ];
  if (wa.visibleEnGoogleBusiness && !wa.linkDirectoEnSitio) {
    items.push({ tipo: 'warn', texto: 'Tu ficha de Google Maps muestra WhatsApp, pero tu sitio web no tiene un botón de WhatsApp directo — quien llega por la web pierde ese camino rápido de contacto.' });
  }
  const opp = findOportunidad(d.oportunidades, 'Conversión');
  const next = opp ? opp.desc : 'Esto es justo lo que hace que toda la inversión en visibilidad realmente se traduzca en ventas.';
  const porque = 'De nada sirve traer visitas si después no pueden contactarte fácil o comprar directo. Esta es la puerta de entrada real del negocio.';
  return { titulo: 'Conversión', score: d.scores?.conversion, items, next, porque };
}

function moduloRedes(d) {
  const r = d.redes || {};
  const plataformas = [
    { key: 'facebook', label: 'Facebook', score: r.fbScore },
    { key: 'instagram', label: 'Instagram', score: r.igScore },
    { key: 'tiktok', label: 'TikTok', score: r.ttScore },
    { key: 'linkedin', label: 'LinkedIn', score: r.liScore },
    { key: 'twitter', label: 'Twitter/X', score: r.twScore },
  ];
  const activas = plataformas.filter((p) => r[p.key]).map((p) => p.label);
  const faltantes = ['TikTok', 'LinkedIn'].filter((x) => !activas.includes(x));
  const items = [];
  if (faltantes.length) items.push({ tipo: 'bad', texto: `Sin presencia en ${faltantes.join(', ')}` });
  else items.push({ tipo: 'ok', texto: 'Presencia activa en las principales plataformas' });
  const tarjetas = plataformas.filter((p) => p.score != null && p.score > 0).length
    ? `<div class="mini-scores">${plataformas.filter((p) => p.score != null).map((p) => `<div class="mini-score"><div class="mini-score-val" style="color:${tierInfo(p.score).hex}">${p.score}</div><div class="mini-score-lbl">${esc(p.label)}</div></div>`).join('')}</div>`
    : '';
  const opp = findOportunidad(d.oportunidades, 'Redes Sociales');
  const next = opp ? opp.desc : 'Buena presencia en redes — hoy es donde más alcance orgánico gratuito se puede conseguir sin pautar.';
  const porque = 'Antes de comprarte, la mayoría de la gente en LATAM revisa tus redes para confirmar que sos un negocio real y activo. Un perfil abandonado genera la misma desconfianza que un local cerrado.';
  return { titulo: 'Redes Sociales', score: d.scores?.redes, chips: chipsHtml(activas), tarjetas, items, next, porque };
}

function moduleCardHtml(m) {
  const t = tierInfo(m.score);
  return `
    <div class="module-card">
      <div class="module-top">
        <span class="module-name">${esc(m.titulo)}</span>
        <span class="module-score" style="color:${t.hex}">${m.score ?? '—'}<span class="module-score-max">/100</span></span>
      </div>
      <div class="bar-track"><div class="bar-fill" style="width:${m.score ?? 0}%;background:${t.hex}"></div></div>
      <div class="tier-tag" style="background:${t.hex}18;color:${t.hex}">${t.label}</div>
      ${m.chips || ''}
      ${m.extra || ''}
      ${m.tarjetas || ''}
      ${checklistHtml(m.items)}
      <div class="next-step"><strong>Próximo paso:</strong> ${m.next}</div>
      <div class="porque-box"><strong>¿Por qué importa?</strong> ${m.porque}</div>
    </div>`;
}

// ══ AISO ══
function aisoSectionHtml(d) {
  const a = d.aiso || {};
  const ha = d.htmlAnalysis || {};
  const ra = d.robotsAnalysis || {};
  const preguntas = Array.isArray(a.preguntas_ejemplo) && a.preguntas_ejemplo.length ? a.preguntas_ejemplo : null;
  const radar = (plataforma, aparece, posicion) => `
    <div class="radar-item">
      <div class="radar-top">
        <span class="radar-platform">${plataforma}</span>
        <span class="radar-status ${aparece ? 'si' : 'no'}">${iconFor(aparece ? 'ok' : 'bad')} ${aparece ? 'Aparece' : 'No detectado'}</span>
      </div>
      ${aparece && posicion ? `<div class="radar-pos">#${posicion} <span>posición estimada</span></div>` : ''}
    </div>`;
  const recomendaciones = Array.isArray(a.recomendaciones) ? a.recomendaciones : [];

  const bots = Array.isArray(ra.botsBloqueados) ? ra.botsBloqueados : [];
  const botsHtml = bots.length ? `
    <div class="aiso-box">
      <div class="aiso-box-label">Quién puede leer tu sitio hoy</div>
      <div class="bots-grid">
        ${bots.map((b) => `<div class="bot-chip">${iconFor(!b.bloqueado ? 'ok' : 'bad')} ${esc(b.nombre)}</div>`).join('')}
      </div>
      <p class="bots-note">Estos son los robots de las principales IA — si están bloqueados, esa plataforma directamente no puede leer tu sitio para recomendarte.</p>
    </div>` : '';

  const schemaHtml = `
    <div class="aiso-box">
      <div class="aiso-box-label">Tu "tarjeta de identidad digital" para las IA</div>
      <ul class="check-list">
        <li class="check-item">${iconFor(ha.schemaLB ? 'ok' : 'bad')}<span>${ha.schemaLB ? 'Tenés Schema LocalBusiness — le decís a las IA exactamente qué sos y dónde estás' : 'Sin Schema LocalBusiness — las IA tienen que "adivinar" tu negocio en vez de confirmarlo con datos exactos'}</span></li>
        <li class="check-item">${iconFor(ha.schemaFAQ ? 'ok' : 'warn')}<span>${ha.schemaFAQ ? 'Tenés preguntas frecuentes marcadas para que las IA las citen' : 'Sin preguntas frecuentes estructuradas — es el formato que más citan ChatGPT y Gemini'}</span></li>
      </ul>
    </div>`;

  return `
  <div class="aiso-section page-start">
    <div class="aiso-header">
      <div class="aiso-badge">${iconSparkle()}</div>
      <div class="aiso-title">Presencia en Inteligencia Artificial</div>
    </div>
    <p class="aiso-subtitle">Cada vez más gente le pregunta directamente a ChatGPT o a Gemini "¿dónde compro X en mi ciudad?" en vez de buscar en Google. Si tu negocio no aparece en esa respuesta, perdés al cliente antes de que sepa que existís.</p>
    <div class="aiso-radar">${radar('ChatGPT', a.chatgpt_aparece, a.chatgpt_posicion)}${radar('Gemini', a.gemini_aparece, a.gemini_posicion)}</div>
    ${a.motivo ? `<div class="aiso-box"><div class="aiso-box-label">Por qué te ubicamos ahí</div><p>${esc(a.motivo)}</p></div>` : ''}
    ${schemaHtml}
    ${botsHtml}
    ${recomendaciones.length ? `<ul class="reco-list">${recomendaciones.map((r, i) => `<li><span class="reco-num">${i + 1}</span> ${esc(r)}</li>`).join('')}</ul>` : ''}
    <div class="questions-box">
      <span class="questions-tag">${preguntas ? 'Generado para tu negocio' : 'Sin datos suficientes en este diagnóstico'}</span>
      <h4>Así es como alguien te podría estar buscando hoy en ChatGPT:</h4>
      ${(preguntas || ['No se generaron ejemplos para esta corrida.']).map((q) => `<div class="q-item">${iconQuote()}<span>${esc(q)}</span></div>`).join('')}
    </div>
  </div>`;
}

function oportunidadesHtml(oportunidades) {
  const iconos = { 'SEO Local': iconPin(), 'Contenido Web': iconPin(), 'Presencia en IA': iconSparkle2(), 'Publicidad': iconPin(), 'Conversión': iconPin(), 'Redes Sociales': iconPin(), 'Blog/Contenidos': iconPin() };
  if (!Array.isArray(oportunidades) || oportunidades.length === 0) {
    return `<div class="section page-start"><div class="section-eyebrow">Cómo te podemos ayudar</div>
      <div class="section-title">Estás cubriendo bien todos los frentes</div>
      <p class="lead-text">No detectamos oportunidades urgentes en este diagnóstico.</p></div>`;
  }
  return `
  <div class="section page-start">
    <div class="section-eyebrow">Cómo te podemos ayudar</div>
    <div class="section-title">${oportunidades.length === 1 ? 'Tu oportunidad más clara' : 'Tus oportunidades más claras'}</div>
    ${oportunidades.map((o) => `
      <div class="opp-card">
        <div class="opp-icon">${iconos[o.area] || iconPin()}</div>
        <div>
          <div class="opp-area">${esc(o.area)}</div>
          <div class="opp-desc">${esc(o.desc)}</div>
          <div class="opp-product">Producto recomendado: <strong>${esc(o.producto)}</strong></div>
        </div>
      </div>
    `).join('')}
  </div>`;
}
function iconSparkle2() { return `<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2l1.8 5.6L19.4 9.4 13.8 11.2 12 17l-1.8-5.8L4.6 9.4l5.6-1.8L12 2z"/></svg>`; }

function clienteLogoCardHtml(imagenes) {
  const logo = imagenes?.logo_cliente || null;
  if (!logo) return '';
  return `<div class="cliente-logo-card"><img src="${esc(logo)}" class="cliente-logo-img" alt="Logo del negocio" onerror="this.parentElement.style.display='none'" /></div>`;
}
function fotoHtml(imagenes) {
  const foto = imagenes?.foto_gbp || imagenes?.og_image || null;
  if (foto) return `<img src="${esc(foto)}" class="hero-photo-img" alt="Foto del negocio" onerror="this.outerHTML='<div class=&quot;hero-photo&quot;>Sin foto disponible</div>'" />`;
  return `<div class="hero-photo">Sin foto disponible</div>`;
}

function hallazgosCriticosHtml(scores, oportunidades) {
  const withScores = MODULOS_DEF.map((m) => ({ ...m, score: scores?.[m.key] ?? 0 }));
  const peores = [...withScores].sort((a, b) => a.score - b.score).slice(0, 3).filter((m) => m.score < 70);
  if (!peores.length) return '';
  return `
  <div class="section">
    <div class="section-eyebrow">Alerta rápida</div>
    <div class="section-title">Tus 3 focos más urgentes</div>
    <div class="critical-grid">
      ${peores.map((m) => {
        const t = tierInfo(m.score);
        const opp = findOportunidad(oportunidades, m.label === 'Posicionamiento' ? 'Contenido Web' : m.label === 'AISO' ? 'Presencia en IA' : m.label);
        return `<div class="critical-card" style="border-color:${t.hex}44">
          <div class="critical-score" style="color:${t.hex}">${m.score}</div>
          <div class="critical-label">${esc(m.label)}</div>
          <div class="critical-desc">${opp ? esc(opp.desc) : 'Necesita atención'}</div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

// ══════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// ══════════════════════════════════════════════════════════════
function generateReportHtml(d) {
  const scores = d.scores || {};
  const global = scores.global ?? 0;
  const gTier = tierInfo(global);
  const gbp = d.gbp || {};
  const categoria = (gbp.categorias && gbp.categorias.length > 0) ? gbp.categorias[0] : 'Negocio local';
  const fecha = d.fechaGeneracion || new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

  const modulos = [moduloSeoLocal(d), moduloPosicionamiento(d), moduloConstruccion(d), moduloPublicidad(d), moduloConversion(d), moduloRedes(d)];

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Diagnóstico Digital — ${esc(d.empresa)}</title>
<style>${REPORT_CSS}</style>
</head>
<body>
<div class="page">

  <div class="hero">
    <div class="hero-top">
      <div></div>
      <div class="hero-date">${esc(fecha)}</div>
    </div>
    <div class="hero-body">
      <div class="hero-photo-wrap">
        ${fotoHtml(d.imagenes)}
      </div>
      <div class="hero-info">
        <div class="hero-eyebrow">Diagnóstico de Presencia Digital</div>
        <div class="hero-company">${esc(d.empresa)}</div>
        <div class="hero-meta">${esc(d.ciudad)}${d.pais ? ', ' + esc(d.pais) : ''} · ${esc(categoria)}</div>
        ${gbp.rating ? `<div class="hero-rating">${starsHtml(gbp.rating)} ${gbp.rating} <span>(${gbp.resenas || 0} reseñas)</span></div>` : ''}
        ${clienteLogoCardHtml(d.imagenes)}
      </div>
      <div class="gauge-wrap">
        <div class="gauge" style="background: conic-gradient(${gTier.hex} 0% ${global}%, rgba(255,255,255,.15) ${global}% 100%);">
          <div class="gauge-inner"><div class="gauge-score">${global}</div><div class="gauge-label">de 100</div></div>
        </div>
        <div class="gauge-tier">${esc(globalTierLabel(global))}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-eyebrow">En pocas palabras</div>
    <p class="lead-text">${buildSummary(scores)}</p>
  </div>

  ${hallazgosCriticosHtml(scores, d.oportunidades)}

  <div class="section page-start">
    <div class="section-eyebrow">Panorama general</div>
    <div class="section-title">Puntaje por área</div>
    <div class="charts-row">
      <div class="chart-box chart-box-wide">${barChartSvg(scores)}</div>
    </div>
    <div class="charts-row">
      <div class="chart-box">
        <div class="chart-title">Forma de tu presencia digital</div>
        ${radarChartSvg(scores)}
      </div>
      <div class="chart-box">
        <div class="chart-title">Qué pesa más en tu score</div>
        ${donutChartSvg(scores)}
      </div>
    </div>
  </div>

  ${aisoSectionHtml(d)}

  <div class="section page-start">
    <div class="section-eyebrow">Diagnóstico completo</div>
    <div class="section-title">Los 6 frentes restantes, en detalle</div>
    <div class="modules-grid">${modulos.map(moduleCardHtml).join('')}</div>
  </div>

  ${oportunidadesHtml(d.oportunidades)}

  <div class="cta">
    <div class="cta-content">
      <h2>${global >= 70 ? 'Vas mejor que la mayoría. Faltan detalles, no cimientos.' : 'Hay una oportunidad clara de mejorar rápido.'}</h2>
      <p>Tu asesor Guru ya tiene este diagnóstico completo — hablá con él ahora para armar el plan de acción.</p>
      <a href="#" class="cta-button">Hablar con mi asesor Guru</a>
      <div class="cta-vendor">Diagnóstico generado por <strong>${esc(d.nombreVendedor || 'tu Asesor Guru')}</strong>${d.emailVendedor ? ` · ${esc(d.emailVendedor)}` : ''}</div>
    </div>
  </div>

  <div class="footer-note">Guru Soluciones © ${new Date().getFullYear()} — Diagnóstico automatizado de presencia digital</div>
</div>
</body>
</html>`;
}

const REPORT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Sans:wght@400;500&display=swap');
:root {
  --guru-primary: #1A1A2E; --guru-accent: #E94560; --guru-accent-soft: #FF6B6B;
  --guru-teal: #0F9B8E; --guru-gold: #F5A623; --guru-purple: #6C63FF;
  --guru-bg: #F8F9FC; --guru-surface: #FFFFFF; --guru-border: #E2E8F0;
  --guru-text-primary: #1A1A2E; --guru-text-secondary: #64748B; --guru-text-muted: #94A3B8;
  --radius-sm: 6px; --radius-md: 12px; --radius-lg: 20px;
  --shadow-card: 0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.08);
  --font-display: 'Plus Jakarta Sans', sans-serif; --font-body: 'DM Sans', sans-serif;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font-body); background: var(--guru-bg); color: var(--guru-text-primary); line-height: 1.6; }
.page { max-width: 880px; margin: 0 auto; background: var(--guru-surface); }
.hero { background: linear-gradient(135deg, var(--guru-primary) 0%, #262650 55%, var(--guru-purple) 130%); color: white; padding: 56px 48px 64px; position: relative; overflow: hidden; }
.hero::before { content: ""; position: absolute; top: -120px; right: -120px; width: 360px; height: 360px; border-radius: 50%; background: radial-gradient(circle, rgba(108,99,255,.35), transparent 70%); }
.hero-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; position: relative; z-index: 1; }
.hero-date { font: 500 13px var(--font-body); color: rgba(255,255,255,.65); }
.hero-body { position: relative; z-index: 1; display: flex; gap: 28px; align-items: center; flex-wrap: wrap; }
.hero-photo-wrap { position: relative; width: 132px; height: 132px; flex-shrink: 0; }
.hero-photo, .hero-photo-img { width: 132px; height: 132px; border-radius: 20px; object-fit: cover; box-shadow: 0 10px 26px rgba(0,0,0,.35); }
.hero-photo { background: rgba(255,255,255,.08); border: 1.5px dashed rgba(255,255,255,.35); display: flex; align-items: center; justify-content: center; text-align: center; font-size: 10px; color: rgba(255,255,255,.55); line-height: 1.3; padding: 4px; }
.hero-info { flex: 1; min-width: 260px; position: relative; }
.cliente-logo-card { display: inline-flex; align-items: center; margin-top: 16px; background: white; border-radius: 12px; padding: 10px 20px; box-shadow: 0 8px 22px rgba(0,0,0,.28); }
.cliente-logo-img { display: block; height: 44px; max-width: 210px; width: auto; object-fit: contain; }
.hero-eyebrow { font: 700 12px var(--font-display); letter-spacing: .12em; text-transform: uppercase; color: var(--guru-accent-soft); margin-bottom: 10px; }
.hero-company { font: 800 30px/1.15 var(--font-display); letter-spacing: -0.02em; margin-bottom: 8px; }
.hero-meta { color: rgba(255,255,255,.72); font-size: 14.5px; margin-bottom: 6px; }
.hero-rating { display: flex; align-items: center; gap: 6px; font: 700 13px var(--font-display); color: white; }
.hero-rating span { font: 500 12px var(--font-body); color: rgba(255,255,255,.6); }
.gauge-wrap { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.gauge { width: 168px; height: 168px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 6px rgba(255,255,255,.06); }
.gauge-inner { width: 132px; height: 132px; border-radius: 50%; background: var(--guru-primary); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.gauge-score { font: 800 44px var(--font-display); line-height: 1; }
.gauge-label { font: 600 11px var(--font-body); letter-spacing: .06em; text-transform: uppercase; color: rgba(255,255,255,.6); margin-top: 4px; }
.gauge-tier { font: 700 13px var(--font-display); color: white; text-align: center; max-width: 168px; }
.section { padding: 40px 48px; border-bottom: 1px solid var(--guru-border); }
.section-eyebrow { font: 700 12px var(--font-display); letter-spacing: .1em; text-transform: uppercase; color: var(--guru-text-muted); margin-bottom: 8px; }
.section-title { font: 700 24px var(--font-display); margin-bottom: 18px; letter-spacing: -0.01em; }
.lead-text { font-size: 16px; color: var(--guru-text-secondary); max-width: 680px; }
.lead-text strong { color: var(--guru-text-primary); }
.charts-row { display: flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap; }
.chart-box { flex: 1; min-width: 260px; background: var(--guru-bg); border-radius: var(--radius-lg); padding: 20px; border: 1px solid var(--guru-border); display: flex; flex-direction: column; align-items: center; }
.chart-box-wide { flex: 1 1 100%; align-items: stretch; }
.chart-title { font: 700 13px var(--font-display); color: var(--guru-text-secondary); margin-bottom: 12px; align-self: flex-start; }
.donut-wrap { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; justify-content: center; }
.legend-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 14px; }
.legend-item { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--guru-text-secondary); }
.legend-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.aiso-section { background: radial-gradient(circle at 15% 20%, #EEEDFF 0%, #F8F9FC 55%); border-bottom: 1px solid var(--guru-border); padding: 44px 48px; }
.aiso-header { display: flex; align-items: center; gap: 14px; margin-bottom: 6px; }
.aiso-badge { width: 40px; height: 40px; border-radius: var(--radius-md); background: linear-gradient(135deg, var(--guru-purple), #9B8CFF); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(108,99,255,.35); }
.aiso-title { font: 800 26px var(--font-display); letter-spacing: -0.01em; }
.aiso-subtitle { color: var(--guru-text-secondary); font-size: 15px; margin: 6px 0 28px; max-width: 640px; }
.aiso-radar { display: flex; gap: 32px; margin-bottom: 28px; flex-wrap: wrap; }
.radar-item { flex: 1; min-width: 220px; background: var(--guru-surface); border-radius: var(--radius-lg); padding: 20px 22px; box-shadow: var(--shadow-card); border: 1px solid #ECEBFF; }
.radar-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.radar-platform { font: 700 15px var(--font-display); }
.radar-status { display: inline-flex; align-items: center; gap: 5px; font: 700 11px var(--font-display); letter-spacing: .04em; padding: 4px 10px; border-radius: 999px; }
.radar-status.si { background: #E6F7F5; color: var(--guru-teal); }
.radar-status.no { background: #FDECEE; color: var(--guru-accent); }
.radar-pos { font: 800 30px var(--font-display); color: var(--guru-primary); }
.radar-pos span { font-size: 14px; font-weight: 600; color: var(--guru-text-muted); }
.aiso-box { background: var(--guru-surface); border-radius: var(--radius-lg); padding: 22px 26px; box-shadow: var(--shadow-card); margin-bottom: 20px; border-left: 4px solid var(--guru-purple); }
.aiso-box-label { font: 700 12px var(--font-display); letter-spacing: .08em; text-transform: uppercase; color: var(--guru-purple); margin-bottom: 8px; }
.aiso-box p { font-size: 14.5px; color: var(--guru-text-secondary); }
.bots-grid { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; }
.bot-chip { display: inline-flex; align-items: center; gap: 5px; font: 600 12px var(--font-body); padding: 6px 12px; border-radius: 999px; background: var(--guru-bg); border: 1px solid var(--guru-border); }
.bots-note { font-size: 11.5px; color: var(--guru-text-muted); margin-top: 6px; }
.reco-list { list-style: none; margin-bottom: 4px; }
.reco-list li { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px dashed var(--guru-border); font-size: 14.5px; }
.reco-list li:last-child { border-bottom: none; }
.reco-num { flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%; background: var(--guru-purple); color: white; font: 700 11px var(--font-display); display: flex; align-items: center; justify-content: center; }
.questions-box { margin-top: 22px; background: var(--guru-primary); border-radius: var(--radius-lg); padding: 22px 26px; color: white; }
.questions-tag { display: inline-block; font: 700 10px var(--font-display); letter-spacing: .08em; text-transform: uppercase; background: rgba(255,255,255,.12); color: var(--guru-accent-soft); padding: 3px 9px; border-radius: 999px; margin-bottom: 12px; }
.questions-box h4 { font: 700 15px var(--font-display); margin-bottom: 12px; }
.q-item { display: flex; gap: 8px; font-size: 14px; color: rgba(255,255,255,.85); padding: 6px 0; }
.q-item svg { color: var(--guru-accent-soft); }
.modules-grid { display: grid; grid-template-columns: 1fr; gap: 16px; margin-top: 8px; }
.module-card { background: var(--guru-surface); border: 1px solid var(--guru-border); border-radius: var(--radius-lg); padding: 22px 24px; box-shadow: var(--shadow-card); }
.module-top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; }
.module-name { font: 700 16px var(--font-display); }
.module-score { font: 800 22px var(--font-display); }
.module-score-max { font-size: 12px; font-weight: 600; color: var(--guru-text-muted); }
.bar-track { height: 8px; background: #EEF1F6; border-radius: 999px; overflow: hidden; margin-bottom: 8px; }
.bar-fill { height: 100%; border-radius: 999px; }
.tier-tag { display: inline-block; font: 700 10.5px var(--font-display); padding: 3px 10px; border-radius: 999px; margin-bottom: 14px; }
.rating-block { display: flex; align-items: center; gap: 6px; font: 700 13px var(--font-display); margin-bottom: 14px; }
.rating-sub { font: 500 12px var(--font-body); color: var(--guru-text-secondary); }
.check-list { list-style: none; margin-bottom: 14px; }
.check-item { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: var(--guru-text-secondary); padding: 4px 0; }
.next-step { font-size: 12.5px; padding: 10px 12px; border-radius: var(--radius-sm); background: var(--guru-bg); border-left: 3px solid var(--guru-primary); margin-bottom: 8px; }
.next-step strong { color: var(--guru-primary); }
.porque-box { font-size: 12.5px; padding: 10px 12px; border-radius: var(--radius-sm); background: #F3F1FF; border-left: 3px solid var(--guru-purple); color: #4B4488; }
.porque-box strong { color: var(--guru-purple); }
.serp-preview { background: var(--guru-bg); border: 1px solid var(--guru-border); border-radius: var(--radius-sm); padding: 14px 16px; margin-bottom: 14px; }
.serp-label { font: 700 10px var(--font-display); letter-spacing: .06em; text-transform: uppercase; color: var(--guru-text-muted); margin-bottom: 8px; }
.serp-url { font-size: 12px; color: #1a0dab; opacity: .75; margin-bottom: 2px; }
.serp-title { font-size: 15px; color: #1a0dab; font-weight: 500; margin-bottom: 3px; }
.serp-desc { font-size: 12.5px; color: var(--guru-text-secondary); }
.dir-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
.dir-chip { display: inline-flex; align-items: center; gap: 4px; font: 600 11.5px var(--font-body); padding: 5px 11px; border-radius: 999px; background: #E6F7F5; color: var(--guru-teal); border: 1px solid #C5EEE9; }
.detail-card { background: var(--guru-bg); border-radius: var(--radius-md); padding: 14px 16px; margin-bottom: 12px; }
.detail-card-wide { width: 100%; }
.detail-card-label { font: 700 10.5px var(--font-display); letter-spacing: .05em; text-transform: uppercase; color: var(--guru-text-muted); margin-bottom: 4px; }
.detail-card-value { font: 800 18px var(--font-display); color: var(--guru-primary); }
.detail-card-note { font-size: 12px; color: var(--guru-text-secondary); margin-top: 4px; }
.mini-scores { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 10px; }
.mini-score { text-align: center; }
.mini-score-val { font: 800 20px var(--font-display); }
.mini-score-lbl { font-size: 10.5px; color: var(--guru-text-secondary); margin-top: 2px; }
.opp-card { display: flex; align-items: center; gap: 18px; background: linear-gradient(120deg, #FFF6F2, #FFFFFF); border: 1px solid #FFE1D6; border-radius: var(--radius-lg); padding: 20px 24px; box-shadow: var(--shadow-card); margin-bottom: 12px; }
.opp-icon { width: 46px; height: 46px; border-radius: var(--radius-md); flex-shrink: 0; background: var(--guru-accent); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(233,69,96,.3); }
.opp-area { font: 700 11px var(--font-display); letter-spacing: .06em; text-transform: uppercase; color: var(--guru-accent); margin-bottom: 3px; }
.opp-desc { font: 600 15.5px var(--font-display); margin-bottom: 4px; }
.opp-product { font-size: 13px; color: var(--guru-text-secondary); }
.opp-product strong { color: var(--guru-primary); }
.cta { background: var(--guru-primary); color: white; padding: 48px; text-align: center; position: relative; overflow: hidden; }
.cta::before { content: ""; position: absolute; bottom: -100px; left: 50%; transform: translateX(-50%); width: 500px; height: 300px; border-radius: 50%; background: radial-gradient(ellipse, rgba(233,69,96,.25), transparent 70%); }
.cta-content { position: relative; z-index: 1; }
.cta h2 { font: 800 26px var(--font-display); margin-bottom: 12px; letter-spacing: -0.01em; }
.cta p { color: rgba(255,255,255,.7); max-width: 480px; margin: 0 auto 28px; font-size: 15px; }
.cta-button { display: inline-block; background: var(--guru-accent); color: white; text-decoration: none; font: 700 15px var(--font-display); padding: 15px 32px; border-radius: var(--radius-md); box-shadow: 0 8px 24px rgba(233,69,96,.4); }
.cta-vendor { margin-top: 26px; padding-top: 22px; border-top: 1px solid rgba(255,255,255,.12); font-size: 13.5px; color: rgba(255,255,255,.55); }
.cta-vendor strong { color: rgba(255,255,255,.85); }
.footer-note { text-align: center; padding: 20px; font-size: 11.5px; color: var(--guru-text-muted); }
.critical-grid { display: flex; gap: 14px; flex-wrap: wrap; }
.critical-card { flex: 1; min-width: 200px; background: var(--guru-surface); border: 1.5px solid; border-radius: var(--radius-lg); padding: 18px 20px; box-shadow: var(--shadow-card); page-break-inside: avoid; break-inside: avoid; }
.critical-score { font: 800 30px var(--font-display); line-height: 1; margin-bottom: 4px; }
.critical-label { font: 700 13px var(--font-display); color: var(--guru-text-primary); margin-bottom: 6px; }
.critical-desc { font-size: 12px; color: var(--guru-text-secondary); }
.page-start { page-break-before: always; break-before: page; }

/* ═══ Reglas de impresión: nunca cortar una tarjeta a la mitad entre páginas ═══ */
.module-card, .radar-item, .chart-box, .opp-card, .aiso-box, .questions-box, .detail-card, .hero {
  page-break-inside: avoid;
  break-inside: avoid;
}
`;

module.exports = { generateReportHtml };
