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

// ── Glifos por módulo (chip AISO, megáfono Publicidad, red Redes, etc.) ──
// Vector plano de un solo color (currentColor), sin librerías externas ni PNG:
// se renderiza igual en cualquier Chromium, pesa casi nada y respeta la
// paleta de marca de cada tarjeta (usa el mismo hex que ya trae cada módulo).
function moduloGlyph(key) {
  const g = {
    seoLocal: '<path fill="currentColor" d="M12 3C8.1 3 5 6.1 5 10c0 5.3 7 12.5 7 12.5S19 15.3 19 10c0-3.9-3.1-7-7-7zm0 9.6a2.6 2.6 0 110-5.2 2.6 2.6 0 010 5.2z"/>',
    posicionamiento: '<circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="2"/><line x1="15" y1="15" x2="20" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    construccion: '<path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" d="M18.5 6.6a4.4 4.4 0 01-5.6 6.1L6.7 18.9l-1.6-1.6 6.2-6.2a4.4 4.4 0 016.1-5.6l-3 3 1.6 1.6 3-3z"/>',
    publicidad: '<path fill="currentColor" d="M4 10.5v3h3.2l5.3 3.7V6.8L7.2 10.5H4z"/><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" d="M15.3 9.6a2.9 2.9 0 010 4.8"/><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" opacity=".55" d="M17.6 7.2a6.1 6.1 0 010 9.6"/>',
    aiso: '<rect x="8" y="8" width="8" height="8" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="10.6" y="10.6" width="2.8" height="2.8" fill="currentColor"/><g stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><line x1="10" y1="4.5" x2="10" y2="8"/><line x1="14" y1="4.5" x2="14" y2="8"/><line x1="10" y1="16" x2="10" y2="19.5"/><line x1="14" y1="16" x2="14" y2="19.5"/><line x1="4.5" y1="10" x2="8" y2="10"/><line x1="4.5" y1="14" x2="8" y2="14"/><line x1="16" y1="10" x2="19.5" y2="10"/><line x1="16" y1="14" x2="19.5" y2="14"/></g>',
    conversion: '<circle cx="12" cy="12" r="6.4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/>',
    redes: '<circle cx="6.5" cy="6.5" r="2.4" fill="currentColor"/><circle cx="6.5" cy="17.5" r="2.4" fill="currentColor"/><circle cx="18" cy="12" r="2.4" fill="currentColor"/><line x1="8.6" y1="7.6" x2="15.7" y2="10.9" stroke="currentColor" stroke-width="1.6"/><line x1="8.6" y1="16.4" x2="15.7" y2="13.1" stroke="currentColor" stroke-width="1.6"/>',
  };
  return g[key] || g.seoLocal;
}
function moduloIconBadge(key, hex, size) {
  size = size || 34;
  const inner = size - 12;
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${hex}1c;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:${hex}">
    <svg width="${inner}" height="${inner}" viewBox="0 0 24 24" fill="none">${moduloGlyph(key)}</svg>
  </div>`;
}
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
function diasDesdeFecha(fechaStr) {
  if (!fechaStr) return null;
  const m = String(fechaStr).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const f = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  if (isNaN(f.getTime())) return null;
  const dias = Math.floor((Date.now() - f.getTime()) / 86400000);
  return dias >= 0 ? dias : null;
}

function moduloSeoLocal(d) {
  const gbp = d.gbp || {};
  const directorios = d.directorios?.lista || [];
  const items = [];
  items.push(gbp.encontrado
    ? { tipo: 'ok', texto: 'Perfil de Google Business reclamado y verificado' }
    : { tipo: 'bad', texto: 'No encontramos un Perfil de Google Business activo' });
  if (gbp.resenas) items.push({ tipo: 'ok', texto: `${gbp.resenas} reseñas con ${gbp.rating ?? '—'}/5 de promedio` });
  if (gbp.categorias?.length) items.push({ tipo: 'ok', texto: `Categoría en Google: ${esc(gbp.categorias[0])}` });

  // Actividad reciente en la ficha: Google premia los perfiles vivos
  const diasPub = diasDesdeFecha(gbp.ultimaPublicacion);
  if (diasPub !== null) {
    if (diasPub <= 14) items.push({ tipo: 'ok', texto: `Publicaste en tu ficha hace ${diasPub} ${diasPub === 1 ? 'día' : 'días'} — Google favorece los perfiles activos` });
    else if (diasPub <= 45) items.push({ tipo: 'warn', texto: `Hace ${diasPub} días que no publicás en tu ficha de Google — lo ideal es al menos una publicación cada 15 días` });
    else items.push({ tipo: 'bad', texto: `Hace ${diasPub} días que no publicás nada en tu ficha de Google — para Google, una ficha sin movimiento es una ficha con menos vida` });
  } else if (gbp.encontrado) {
    items.push({ tipo: 'warn', texto: 'No detectamos publicaciones recientes en tu ficha de Google — las publicaciones son gratis y le muestran a Google que el negocio está activo' });
  }
  const opp = findOportunidad(d.oportunidades, 'SEO Local');
  const next = opp ? opp.desc : 'Ya estás fuerte acá — mantenelo respondiendo todas las reseñas nuevas.';
  const porque = 'Tu ficha de Google es lo primero que ven tanto las personas como las IA cuando buscan un negocio como el tuyo cerca. Cuantos más directorios te tengan bien listado, más confían Google y las IA en recomendarte.';
  const tarjetas = [];
  if (Array.isArray(gbp.atributos) && gbp.atributos.length) {
    const attrs = gbp.atributos.filter(a => a && a.toLowerCase() !== 'other');
    if (attrs.length) {
      tarjetas.push(`<div class="detail-card"><div class="detail-card-label">Atributos cargados en tu ficha</div>
        <div class="attr-chips">${attrs.map(a => `<span class="attr-chip">${esc(a)}</span>`).join('')}</div>
        <div class="detail-card-note">Los atributos (formas de pago, accesibilidad, servicios) ayudan a que Google y las IA te muestren en búsquedas más específicas — cuantos más completes, en más consultas podés aparecer.</div></div>`);
    }
  }
  if (gbp.fotosCount) {
    tarjetas.push(`<div class="detail-card"><div class="detail-card-label">Fotos en tu ficha de Google</div><div class="detail-card-value">${gbp.fotosCount}</div><div class="detail-card-note">Más fotos reales generan más confianza para quien te encuentra por primera vez.</div></div>`);
  }
  if (gbp.ultimaPublicacion) {
    const dp = diasDesdeFecha(gbp.ultimaPublicacion);
    const notaPub = dp === null
      ? 'Publicar novedades, promociones o fotos nuevas mantiene tu ficha activa a los ojos de Google.'
      : dp <= 14
        ? `Hace ${dp} ${dp === 1 ? 'día' : 'días'}. Vas bien: seguí con este ritmo, Google le da más visibilidad a las fichas que se mueven.`
        : `Hace ${dp} días. Las publicaciones son gratuitas y le indican a Google que el negocio está activo — una cada 15 días alcanza para marcar diferencia.`;
    tarjetas.push(`<div class="detail-card"><div class="detail-card-label">Última publicación en Google</div><div class="detail-card-value" style="font-size:16px;">${esc(gbp.ultimaPublicacion)}</div><div class="detail-card-note">${esc(notaPub)}</div></div>`);
  }
  // Bloque de gestión de reseñas — abre la conversación comercial
  const bloqueResenas = gbp.resenas
    ? `<div class="resenas-box">
        <div class="resenas-label">Un frente que casi nadie atiende bien</div>
        <p class="resenas-texto">Tenés <strong>${gbp.resenas.toLocaleString('es-AR')} reseñas</strong>. Responderlas todas —las buenas y sobre todo las malas— es una de las señales que más pesan para que Google te muestre primero, y también para que las IA te describan bien: cuando responden, leen tanto la opinión del cliente como tu respuesta.</p>
        <div class="resenas-pregunta">
          <div class="resenas-pregunta-label">Una pregunta para pensar</div>
          <p>Un cliente molesto no escribe en horario de oficina: escribe un sábado a la noche, apenas le pasó algo. <strong>¿Hay alguien de tu equipo respondiendo reseñas los fines de semana y fuera de horario?</strong> Si la respuesta llega el lunes, esa reseña ya la leyeron decenas de personas — y Google también.</p>
        </div>
      </div>`
    : '';

  return { key: 'seoLocal', titulo: 'SEO Local', score: d.scores?.seoLocal, chips: chipsHtml(directorios), extra: ratingBlock(gbp) + bloqueResenas + (gbp.rating != null ? `<div class="reputacion-box" style="background:var(--guru-bg);border:1px solid var(--guru-border);border-radius:var(--radius-lg);padding:16px 18px;margin-bottom:14px;"><div class="detail-card-label" style="margin-bottom:10px;">Tu reputación vs. el estándar del rubro</div>${reputationBarSvg(gbp.rating)}</div>` : ''), tarjetas: tarjetas.join(''), items, next, porque };
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
  if (ha.contenidoMedible === false) {
    items.push({ tipo: 'warn', texto: 'Tu sitio arma el contenido con JavaScript — Google y las IA tienen que trabajar de más para leerte, y muchas veces no lo logran' });
  } else if (ha.palabras !== undefined) {
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
  return { key: 'posicionamiento', titulo: 'Posicionamiento Orgánico', score: d.scores?.posicionamiento, extra: serp, items, next, porque };
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
  return { key: 'construccion', titulo: 'Construcción del Sitio', score: d.scores?.construccion, tarjetas: tarjetas.join(''), items, next, porque };
}

function moduloPublicidad(d) {
  const p = d.publicidad || {};
  const pt = d.publicidadTecnica || {};
  const items = [
    { tipo: p.googleAdsDetectado ? 'ok' : 'warn', texto: p.googleAdsDetectado ? 'Etiqueta de Google Ads detectada en tu sitio' : 'No detectamos la etiqueta de Google Ads en el sitio analizado' },
    { tipo: p.displayDetectado ? 'ok' : 'warn', texto: p.displayDetectado ? 'Señales de campañas de Display (banners)' : 'No detectamos señales de campañas de Display' },
    { tipo: p.metaAdsDetectado ? 'ok' : 'warn', texto: p.metaAdsDetectado ? 'Pixel de Meta detectado — Facebook e Instagram pueden medir tus resultados' : 'No detectamos el Pixel de Meta en el sitio analizado' },
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
  const aclaracion = `<p class="modulo-alcance">Qué miramos acá: las etiquetas de medición instaladas en <strong>${esc((d.website || '').replace(/^https?:\/\//, ''))}</strong>. Si tus campañas corren desde otro dominio o subdominio (por ejemplo, una landing de marketing aparte), no las vamos a ver desde acá — comentáselo a tu asesor para revisarlo juntos.</p>`;
  const hasTechData = pt.googleTagManager || pt.metaPixelDirecto || pt.facebookDomainVerification;
  const extra = hasTechData
    ? `<div class="chart-box" style="background:var(--guru-bg);border:1px solid var(--guru-border);border-radius:var(--radius-lg);padding:18px;margin-bottom:14px;">
        <div class="chart-title">Madurez de remarketing</div>
        ${remarketingDonutSvg(pt)}
      </div>`
    : '';
  return { key: 'publicidad', titulo: 'Publicidad', score: d.scores?.publicidad, extra: extra + aclaracion, items, next, porque };
}

function moduloConversion(d) {
  const c = d.conversion || {};
  const wa = d.whatsappAnalisis || {};
  const ha = d.htmlAnalysis || {};
  // Fuente de la etiqueta: preferimos htmlAnalysis.chatTipo porque ya distingue "Bot (Proveedor)" de forma confiable;
  // si no está, usamos whatsappAnalisis; si tampoco, el genérico de N16.
  const chatLabel = (ha.chatTipo && ha.chatTipo.startsWith('Bot'))
    ? ha.chatTipo.replace(/^Bot \(/, 'Bot conversacional (')
    : wa.botDetectado ? `Bot conversacional (${esc(wa.proveedorBot)})` : (c.chatTipo || 'Chat');
  // Único criterio de "tiene canal de WhatsApp/chat funcional en el sitio" — evita contradecirnos más abajo
  const tieneCanalFuncional = !!(c.chatDetectado || ha.chatDetectado);
  const items = [
    { tipo: tieneCanalFuncional ? 'ok' : 'bad', texto: tieneCanalFuncional ? `${chatLabel} visible y funcional en el sitio` : 'No detectamos WhatsApp ni chat visible en el sitio' },
    { tipo: c.ecommerceDetectado ? 'ok' : 'warn', texto: c.ecommerceDetectado ? 'Tienda online activa y operando' : 'No detectamos tienda online / e-commerce' },
  ];
  // Solo mostramos el contraste "GBP sí / sitio no" cuando el sitio realmente no tiene NINGÚN canal — ni link directo, ni bot
  if (!tieneCanalFuncional && wa.visibleEnGoogleBusiness && !wa.linkDirectoEnSitio && !wa.botDetectado) {
    items.push({ tipo: 'warn', texto: 'Tu ficha de Google Maps muestra WhatsApp, pero tu sitio web no tiene un botón de WhatsApp directo — quien llega por la web pierde ese camino rápido de contacto.' });
  }
  const opp = findOportunidad(d.oportunidades, 'Conversión');
  const next = opp ? opp.desc : 'Esto es justo lo que hace que toda la inversión en visibilidad realmente se traduzca en ventas.';
  const porque = 'De nada sirve traer visitas si después no pueden contactarte fácil o comprar directo. Esta es la puerta de entrada real del negocio.';
  return { key: 'conversion', titulo: 'Conversión', score: d.scores?.conversion, items, next, porque };
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
  // Único criterio de presencia: el score (que ya considera señales más allá del link exacto, como seguidores detectados).
  // Antes se usaba el link de la URL para esto y el score para las tarjetas — dos fuentes distintas que podían contradecirse.
  const activas = plataformas.filter((p) => p.score != null && p.score > 0).map((p) => p.label);
  const faltantes = plataformas.filter((p) => !p.score).map((p) => p.label);
  const items = [];
  if (faltantes.length) items.push({ tipo: 'bad', texto: `Sin presencia detectada en ${faltantes.join(', ')}` });
  else items.push({ tipo: 'ok', texto: 'Presencia activa en las principales plataformas' });
  const tarjetas = plataformas.filter((p) => p.score != null && p.score > 0).length
    ? `<div class="mini-scores">${plataformas.filter((p) => p.score != null).map((p) => `<div class="mini-score"><div class="mini-score-val" style="color:${tierInfo(p.score).hex}">${p.score}</div><div class="mini-score-lbl">${esc(p.label)}</div></div>`).join('')}</div>`
    : '';
  const opp = findOportunidad(d.oportunidades, 'Redes Sociales');
  const next = opp ? opp.desc : 'Buena presencia en redes — hoy es donde más alcance orgánico gratuito se puede conseguir sin pautar.';
  const porque = 'Antes de comprarte, la mayoría de la gente en LATAM revisa tus redes para confirmar que sos un negocio real y activo. Un perfil abandonado genera la misma desconfianza que un local cerrado.';
  return { key: 'redes', titulo: 'Redes Sociales', score: d.scores?.redes, chips: chipsHtml(activas), tarjetas, items, next, porque };
}

function moduleCardHtml(m) {
  const t = tierInfo(m.score);
  return `
    <div class="module-card">
      <div class="module-top">
        <span class="module-name-row">${moduloIconBadge(m.key, t.hex, 28)}<span class="module-name">${esc(m.titulo)}</span></span>
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
function sentimientoInfo(s) {
  const map = {
    positivo: { label: 'Positivo', hex: '#0F9B8E', pos: 88, desc: 'Una IA te recomendaría con confianza' },
    neutro:   { label: 'Neutro',   hex: '#F5A623', pos: 50, desc: 'Una IA te mencionaría, pero sin entusiasmo' },
    negativo: { label: 'Negativo', hex: '#E94560', pos: 12, desc: 'Una IA te mencionaría advirtiendo sobre las opiniones' },
  };
  return map[String(s || 'neutro').toLowerCase()] || map.neutro;
}

function sentimientoBarSvg(sent) {
  const info = sentimientoInfo(sent);
  const x = 30 + (info.pos / 100) * 400;
  return `<svg viewBox="0 0 460 74" width="100%" height="74" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="sentGrad" x1="0" x2="1">
      <stop offset="0%" stop-color="#E94560"/><stop offset="50%" stop-color="#F5A623"/><stop offset="100%" stop-color="#0F9B8E"/>
    </linearGradient></defs>
    <rect x="30" y="30" width="400" height="10" rx="5" fill="url(#sentGrad)" opacity=".28"/>
    <rect x="30" y="30" width="400" height="10" rx="5" fill="none" stroke="#E2E8F0" stroke-width="1"/>
    <circle cx="${x}" cy="35" r="11" fill="${info.hex}" stroke="#fff" stroke-width="3"/>
    <text x="30" y="60" font-family="DM Sans, sans-serif" font-size="10" fill="#94A3B8">Negativo</text>
    <text x="230" y="60" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="10" fill="#94A3B8">Neutro</text>
    <text x="430" y="60" text-anchor="end" font-family="DM Sans, sans-serif" font-size="10" fill="#94A3B8">Positivo</text>
    <text x="${x}" y="20" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="12" font-weight="800" fill="${info.hex}">${info.label}</text>
  </svg>`;
}

function plataformaIaCard(nombre, aparece, posicion, score, nota) {
  const hex = score >= 70 ? '#0F9B8E' : score >= 45 ? '#F5A623' : '#E94560';
  const r = 26, c = 2 * Math.PI * r, dash = (Math.max(0, Math.min(100, score)) / 100) * c;
  return `<div class="ia-card">
    <div class="ia-card-head">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r="${r}" fill="none" stroke="#E2E8F0" stroke-width="7"/>
        <circle cx="36" cy="36" r="${r}" fill="none" stroke="${hex}" stroke-width="7" stroke-linecap="round"
          stroke-dasharray="${dash.toFixed(1)} ${(c - dash).toFixed(1)}" transform="rotate(-90 36 36)"/>
        <text x="36" y="41" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="19" font-weight="800" fill="#1A1A2E">${score}</text>
      </svg>
      <div class="ia-card-id">
        <div class="ia-card-name">${esc(nombre)}</div>
        <div class="ia-card-status ${aparece ? 'si' : 'no'}">${aparece ? 'Aparecés' : 'No detectado'}</div>
      </div>
    </div>
    ${aparece && posicion ? `<div class="ia-card-pos"><span class="ia-pos-num">#${posicion}</span><span class="ia-pos-lbl">posición estimada<br>en la lista de recomendados</span></div>` : `<div class="ia-card-pos ia-card-pos-off"><span class="ia-pos-lbl">Hoy no apareceriás entre los recomendados</span></div>`}
    <div class="ia-card-note">${esc(nota)}</div>
  </div>`;
}

function conversacionSimuladaHtml(d) {
  const a = d.aiso || {};
  if (!a.descripcion_ia) return '';
  const pregunta = (Array.isArray(a.preguntas_ejemplo) && a.preguntas_ejemplo[0])
    ? a.preguntas_ejemplo[0]
    : `¿Qué me podés contar de ${d.empresa}?`;
  return `
  <div class="chat-sim">
    <div class="chat-sim-head">
      <span class="chat-sim-tag">Simulación</span>
      <span class="chat-sim-title">Así te describiría una IA hoy</span>
    </div>
    <div class="chat-bubble chat-user"><div class="chat-avatar chat-avatar-user">C</div><div class="chat-text">${esc(pregunta)}</div></div>
    <div class="chat-bubble chat-ai"><div class="chat-avatar chat-avatar-ai">${iconSparkle()}</div><div class="chat-text">${esc(a.descripcion_ia)}</div></div>
    <p class="chat-sim-foot">Esta respuesta es una <strong>reconstrucción</strong>, no una consulta real a ChatGPT. La generamos analizando con inteligencia artificial las mismas señales públicas que esos asistentes usan para armar sus respuestas: tu ficha de Google, tus reseñas y el contenido de tu sitio.</p>
  </div>`;
}

function aisoSectionHtml(d) {
  const a = d.aiso || {};
  const ha = d.htmlAnalysis || {};
  const ra = d.robotsAnalysis || {};
  const preguntas = Array.isArray(a.preguntas_ejemplo) && a.preguntas_ejemplo.length ? a.preguntas_ejemplo : null;
  const recomendaciones = Array.isArray(a.recomendaciones) ? a.recomendaciones : [];
  const sent = sentimientoInfo(a.sentimiento);

  const notaChat = 'Se apoya sobre todo en lo que puede leer directamente en tu sitio web.';
  const notaGem  = 'Es el asistente de Google: se apoya mucho en tu ficha de Google Business.';

  const bots = Array.isArray(ra.botsBloqueados) ? ra.botsBloqueados : [];
  const botsHtml = bots.length ? `
    <div class="aiso-box">
      <div class="aiso-box-label">Quién puede leer tu sitio hoy</div>
      <div class="bots-grid">
        ${bots.map((b) => `<div class="bot-chip">${iconFor(!b.bloqueado ? 'ok' : 'bad')} ${esc(b.nombre)}</div>`).join('')}
      </div>
      <p class="bots-note">Cada IA usa un programa que recorre las webs para aprender de ellas. Tu sitio puede darles permiso o negárselo (mediante un archivo llamado robots.txt). Si están bloqueados, esa plataforma directamente no puede leer tu sitio para recomendarte.</p>
    </div>` : '';

  const schemaHtml = `
    <div class="aiso-box">
      <div class="aiso-box-label">Tu "tarjeta de identidad digital" para las IA</div>
      <ul class="check-list">
        <li class="check-item">${iconFor(ha.schemaLB ? 'ok' : 'bad')}<span>${ha.schemaLB ? 'Tenés ficha de identidad digital (Schema LocalBusiness: un código invisible en tu web que le declara a Google y a las IA tu dirección, horarios y qué vendés) — les decís exactamente qué sos y dónde estás' : 'Te falta la ficha de identidad digital (Schema LocalBusiness: un código invisible en tu web que le declara a Google y a las IA tu dirección, horarios y qué vendés) — sin eso, las IA tienen que "adivinar" tu negocio en vez de confirmarlo'}</span></li>
        <li class="check-item">${iconFor(ha.schemaFAQ ? 'ok' : 'warn')}<span>${ha.schemaFAQ ? 'Tenés preguntas frecuentes marcadas (escritas en un formato que las IA reconocen y pueden citar textualmente)' : 'Sin preguntas frecuentes en formato reconocible por las IA — es el tipo de contenido que más citan ChatGPT y Gemini cuando responden'}</span></li>
      </ul>
    </div>`;

  return `
  <div class="aiso-section page-start">
    <div class="aiso-header">
      <div class="aiso-badge">${iconSparkle()}</div>
      <div class="aiso-title">Presencia en Inteligencia Artificial</div>
    </div>
    <p class="aiso-subtitle">Cada vez más gente le pregunta directamente a ChatGPT o a Gemini "¿dónde compro X en mi ciudad?" en vez de buscar en Google. Si tu negocio no aparece en esa respuesta, perdés al cliente antes de que sepa que existís.</p>

    <div class="ia-cards">
      ${plataformaIaCard('ChatGPT', a.chatgpt_aparece, a.chatgpt_posicion, a.score_chatgpt || 0, notaChat)}
      ${plataformaIaCard('Gemini', a.gemini_aparece, a.gemini_posicion, a.score_gemini || 0, notaGem)}
    </div>

    ${conversacionSimuladaHtml(d)}

    <div class="aiso-box sent-box">
      <div class="aiso-box-label">Con qué tono te nombran</div>
      ${sentimientoBarSvg(a.sentimiento)}
      <p class="sent-desc"><strong>${sent.desc}.</strong> ${esc(a.sentimiento_motivo || '')}</p>
    </div>

    ${a.motivo ? `<div class="aiso-box"><div class="aiso-box-label">Por qué te ubicamos ahí</div><p>${esc(a.motivo)}</p></div>` : ''}
    ${schemaHtml}
    ${botsHtml}
    ${recomendaciones.length ? `<ul class="reco-list">${recomendaciones.map((r, i) => `<li><span class="reco-num">${i + 1}</span> ${esc(r)}</li>`).join('')}</ul>` : ''}
    <div class="questions-box">
      <span class="questions-tag">${preguntas ? 'Generado para tu negocio' : 'Sin datos suficientes en este diagnóstico'}</span>
      <h4>Así es como alguien te podría estar buscando hoy en ChatGPT:</h4>
      ${(preguntas || ['No se generaron ejemplos para esta corrida.']).map((q) => `<div class="q-item">${iconQuote()}<span>${esc(q)}</span></div>`).join('')}
    </div>
    <p class="aiso-metodo">${esc(a.metodo || 'Estimación con IA a partir de señales públicas del negocio')} · Fuentes: ${esc(a.fuenteDatos || 'ficha de Google, robots.txt, sitemap y contenido del sitio')}.</p>
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
function singleStarIcon() {
  return `<svg width="12" height="12" viewBox="0 0 24 24" style="vertical-align:-2px;flex-shrink:0;"><path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5-4.7-4.6 6.5-.9z" fill="#F5A623"/></svg>`;
}

function competidoresInsightHtml(cliente, competidores) {
  if (!competidores.length) return '';
  const top = competidores.reduce((a, b) => ((b.resenas || 0) > (a.resenas || 0) ? b : a), competidores[0]);
  const avgRating = competidores.reduce((s, c) => s + (c.rating || 0), 0) / competidores.length;
  const partes = [];
  if (cliente.resenas != null && (top.resenas || 0) > cliente.resenas) {
    const diff = top.resenas - cliente.resenas;
    partes.push(`<strong>${esc(top.nombre)}</strong> tiene ${diff.toLocaleString('es-AR')} reseñas más que vos — pedirle una reseña a cada cliente satisfecho después de una compra o servicio es la forma más rápida de achicar esa distancia.`);
  }
  if (cliente.rating != null && avgRating > cliente.rating + 0.05) {
    partes.push(`Tu calificación (${cliente.rating}) está por debajo del promedio de tus competidores (${avgRating.toFixed(1)}) — responder las reseñas negativas y cuidar la experiencia de posventa suele ser el camino más directo para subirla.`);
  }
  if (!partes.length) {
    partes.push('Hoy estás bien posicionado frente a tu competencia directa — mantené el ritmo de reseñas y actividad para conservar esa ventaja.');
  }
  return `<div class="comp-insight-box"><div class="comp-insight-label">Oportunidad de mejora</div><p>${partes.join(' ')}</p></div>`;
}

function competidoresSectionHtml(d) {
  const competidores = Array.isArray(d.competidores) ? d.competidores : [];
  if (!competidores.length) return '';
  const gbp = d.gbp || {};
  const cliente = { nombre: d.empresa, rating: gbp.rating, resenas: gbp.resenas || 0, tieneWebsite: !!d.siteUrl, isClient: true };
  const todos = [cliente, ...competidores];
  const maxResenas = Math.max(...todos.map((t) => t.resenas || 0), 1);
  const rows = todos.map((t) => {
    const pct = Math.max(4, Math.round(((t.resenas || 0) / maxResenas) * 100));
    const color = t.isClient ? 'var(--guru-accent)' : 'var(--guru-purple)';
    return `<div class="comp-row${t.isClient ? ' comp-row-client' : ''}">
      <div class="comp-name">${esc(t.nombre)}${t.isClient ? ' (vos)' : ''}</div>
      <div class="comp-bar-track"><div class="comp-bar-fill" style="width:${pct}%;background:${color}"></div></div>
      <div class="comp-meta">${t.rating != null ? `${singleStarIcon()} ${t.rating}` : '—'} · ${(t.resenas || 0).toLocaleString('es-AR')} res.${t.tieneWebsite === false ? ' · sin web' : ''}</div>
    </div>`;
  }).join('');
  const n = competidores.length;
  return `
  <div class="section page-start">
    <div class="section-eyebrow">Benchmark de competencia</div>
    <div class="section-title">Así te comparás con ${n === 1 ? 'tu competencia directa' : `${n} competidores directos`}</div>
    <div class="chart-box comp-box">${rows}</div>
    ${competidoresInsightHtml(cliente, competidores)}
    <p class="comp-transparency">¿Cómo identificamos a tus competidores? Buscamos automáticamente en Google Maps otros negocios de tu misma categoría en tu ciudad, descartamos los que no tienen reseñas suficientes para comparar, y nos quedamos con los que muestran más actividad y trayectoria. Es una fotografía objetiva de quién más aparece cuando alguien busca lo que vos ofrecés — no una opinión nuestra.</p>
  </div>`;
}

function oportunidadPerdidaHtml(d) {
  const op = d.oportunidadPerdida;
  if (!op) return '';
  const pct = op.porcentajeNoCapturado;
  const tasaCierre = op.tasaCierreReferencia || 15;
  const ventasPerdidasPor100 = Math.round((pct * tasaCierre) / 10) / 10;
  const ejemplos = [50, 250, 500];
  const filasEjemplo = ejemplos.map((ticket) => {
    const ingreso = Math.round(ventasPerdidasPor100 * ticket);
    return `<div class="ejemplo-row">
      <div class="ejemplo-ticket">Ticket promedio<br><strong>USD $${ticket.toLocaleString('en-US')}</strong></div>
      <div class="ejemplo-arrow">→</div>
      <div class="ejemplo-resultado">~USD $${ingreso.toLocaleString('en-US')}<span>/mes no capturados (ejemplo)</span></div>
    </div>`;
  }).join('');
  const fuentesHtml = (op.fuentes || []).map((f) => `<li>${esc(f.texto)} <span class="fuente-cita">— ${esc(f.cita)}</span></li>`).join('');
  return `
  <div class="section page-start">
    <div class="section-eyebrow">Impacto estimado</div>
    <div class="section-title">Lo que tu presencia digital actual te puede estar costando</div>
    <div class="op-headline-box">
      <div class="op-pct">${pct}%</div>
      <div class="op-headline-text">De cada 100 personas que buscan un negocio como el tuyo, estimamos que hoy estás dejando pasar aproximadamente <strong>${pct}</strong> frente a la competencia, por brechas en tu presencia digital (nivel actual: <strong>${esc(op.tramoLabel)}</strong>).</div>
    </div>
    <div class="op-ejemplo-box">
      <div class="op-ejemplo-label">Ejemplo ilustrativo en USD — hacé la cuenta con tu ticket real</div>
      <p class="op-ejemplo-intro">Si tu categoría suele cerrar en ventas alrededor del ${tasaCierre}% de los contactos que recibe, esas ${pct} oportunidades perdidas (de cada 100) podrían representar aproximadamente <strong>${ventasPerdidasPor100} ventas menos al mes</strong>. Usamos dólares como referencia universal, ya que trabajamos con negocios en distintos países de LATAM — reemplazalos por tu ticket promedio en tu moneda local:</p>
      <div class="ejemplo-grid">${filasEjemplo}</div>
      <p class="op-ejemplo-disclaimer">Estos números son solo ejemplos para dimensionar el impacto — no son una medición exacta de tu negocio. Reemplazá el ticket promedio por el tuyo real para estimar tu propio caso.</p>
    </div>
    <div class="op-fuentes-box">
      <div class="op-fuentes-label">¿De dónde sale esta estimación?</div>
      <ul class="op-fuentes-list">${fuentesHtml}</ul>
      <p class="op-fuentes-disclaimer">El porcentaje por nivel de score es una estimación conservadora de Guru Soluciones, respaldada por estudios de comportamiento del consumidor local — no es una medición directa de tu negocio particular.</p>
    </div>
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
          <div class="critical-top-row">${moduloIconBadge(m.key, t.hex, 30)}<div class="critical-score" style="color:${t.hex}">${m.score}</div></div>
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
// ═══════════════════════════════════════════════════════════════════════
// SECCIÓN — PRESENCIA EN DIRECTORIOS (datos de Yext Scan API)
// ═══════════════════════════════════════════════════════════════════════

function dirIconOk()   { return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0F9B8E" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`; }
function dirIconNo()   { return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="3" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>`; }
function dirIconWarn() { return `<svg width="14" height="14" viewBox="0 0 24 24" fill="#F5A623"><path d="M12 2L1 21h22L12 2zm0 15h-1.5v-1.5H12V17zm0-3h-1.5V9H12v5z"/></svg>`; }

// Anillo de cobertura para la banda de estadísticas
function coberturaRingSvg(pct, hex) {
  const r = 34, c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return `<svg width="92" height="92" viewBox="0 0 92 92">
    <circle cx="46" cy="46" r="${r}" fill="none" stroke="#E2E8F0" stroke-width="9"/>
    <circle cx="46" cy="46" r="${r}" fill="none" stroke="${hex}" stroke-width="9" stroke-linecap="round"
      stroke-dasharray="${dash.toFixed(1)} ${(c - dash).toFixed(1)}" transform="rotate(-90 46 46)"/>
    <text x="46" y="44" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="22" font-weight="800" fill="#1A1A2E">${pct}</text>
    <text x="46" y="59" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="9" fill="#94A3B8">de 100</text>
  </svg>`;
}

// Infografía: cómo la ficha del negocio alimenta a las IAs y asistentes.
// Dato verificado con el endpoint listings/publishers de Yext:
// Google Business Profile distribuye a Gemini y Waze; Apple Maps a Siri;
// y Yext tiene integración directa con OpenAI.
function cadenaIaSvg() {
  const node = (x, y, w, label, sub, fill, textFill) => `
    <rect x="${x}" y="${y}" width="${w}" height="42" rx="10" fill="${fill}"/>
    <text x="${x + w / 2}" y="${y + 19}" text-anchor="middle" font-family="Plus Jakarta Sans, sans-serif" font-size="11.5" font-weight="700" fill="${textFill}">${label}</text>
    <text x="${x + w / 2}" y="${y + 33}" text-anchor="middle" font-family="DM Sans, sans-serif" font-size="9" fill="${textFill}" opacity=".75">${sub}</text>`;
  const arrow = (x1, y1, x2, y2) => `
    <path d="M${x1} ${y1} C ${x1 + 26} ${y1}, ${x2 - 26} ${y2}, ${x2} ${y2}" stroke="#CBD5E1" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="${x2}" cy="${y2}" r="3" fill="#CBD5E1"/>`;
  return `<svg viewBox="0 0 700 250" width="100%" height="230" xmlns="http://www.w3.org/2000/svg">
    ${node(14, 40, 172, 'Tu ficha de Google', 'Google Business Profile', '#1A1A2E', '#FFFFFF')}
    ${node(14, 150, 172, 'Tu ficha de Apple', 'Apple Maps', '#1A1A2E', '#FFFFFF')}
    ${node(252, 95, 162, 'Redes de distribución', 'de datos de negocios', '#6C63FF', '#FFFFFF')}
    ${arrow(186, 61, 258, 110)}
    ${arrow(186, 171, 258, 130)}
    ${node(480, 12, 206, 'Gemini', 'IA de Google', '#F1F5F9', '#1A1A2E')}
    ${node(480, 72, 206, 'Waze', 'Navegación', '#F1F5F9', '#1A1A2E')}
    ${node(480, 132, 206, 'Siri', 'Asistente de Apple', '#F1F5F9', '#1A1A2E')}
    ${node(480, 192, 206, 'ChatGPT', 'Integración directa OpenAI', '#F1F5F9', '#1A1A2E')}
    ${arrow(408, 110, 480, 33)}
    ${arrow(408, 113, 480, 93)}
    ${arrow(408, 120, 480, 153)}
    ${arrow(408, 127, 480, 213)}
  </svg>`;
}

// Tarjeta destacada de un canal prioritario
function canalPrioritarioCard(dir) {
  const presente = dir.estado === 'LISTING_FOUND';
  const noVerif = !presente && dir.estado !== 'NO_MATCH';
  const cls = presente ? 'canal-ok' : (noVerif ? 'canal-warn' : 'canal-no');
  const icono = presente ? dirIconOk() : (noVerif ? dirIconWarn() : dirIconNo());
  const etiqueta = presente ? 'Estás presente' : (noVerif ? 'No pudimos verificar' : 'No apareces');
  let detalle = '';
  if (presente) {
    const bits = [];
    if (dir.resenas > 0) bits.push(`${dir.resenas.toLocaleString('es-AR')} reseñas`);
    if (dir.rating > 0) bits.push(`${dir.rating} de calificación`);
    if (dir.telefonoNoPublicado) bits.push('sin teléfono publicado');
    detalle = bits.join(' · ') || 'Ficha activa';
  } else if (noVerif) {
    detalle = 'El directorio no respondió a tiempo';
  } else {
    detalle = 'Una puerta de entrada que hoy está cerrada';
  }
  return `<div class="canal-card ${cls}">
    <div class="canal-top">
      <span class="canal-icon">${icono}</span>
      <span class="canal-nombre">${esc(dir.nombre)}</span>
    </div>
    <div class="canal-estado">${etiqueta}</div>
    <div class="canal-detalle">${esc(detalle)}</div>
  </div>`;
}

// Grilla completa: todos los directorios agrupados por categoría
function directoriosGrillaHtml(yx) {
  const grupos = Array.isArray(yx.agrupadoPorTipo) ? yx.agrupadoPorTipo : [];
  if (!grupos.length) return '';
  // Se ordenan poniendo primero los grupos donde el negocio SÍ está presente
  const ordenados = [...grupos].sort((a, b) => (b.presentes.length - a.presentes.length));
  return ordenados.map((g) => {
    const chips = [
      ...g.presentes.map((n) => `<span class="dir-chip dir-chip-ok">${dirIconOk()}${esc(n)}</span>`),
      ...g.noVerificables.map((n) => `<span class="dir-chip dir-chip-warn">${dirIconWarn()}${esc(n)}</span>`),
      ...g.ausentes.map((n) => `<span class="dir-chip dir-chip-no">${dirIconNo()}${esc(n)}</span>`),
    ].join('');
    const total = g.presentes.length + g.ausentes.length + g.noVerificables.length;
    return `<div class="dir-grupo">
      <div class="dir-grupo-head">
        <span class="dir-grupo-nombre">${esc(g.tipo)}</span>
        <span class="dir-grupo-conteo">${g.presentes.length} de ${total}</span>
      </div>
      <div class="dir-chips">${chips}</div>
    </div>`;
  }).join('');
}

// Bloque de uniformidad del nombre comercial
function uniformidadNombreHtml(yx) {
  if (yx.nombreUniforme !== false || !Array.isArray(yx.variacionesNombre) || !yx.variacionesNombre.length) return '';
  const filas = yx.variacionesNombre.map((v) => `
    <div class="unif-row">
      <div class="unif-dir">${esc(v.directorio)}</div>
      <div class="unif-nombre">${esc(v.nombreEnDirectorio)}</div>
    </div>`).join('');
  return `
  <div class="unif-box">
    <div class="unif-title">Tu nombre no se escribe igual en todos lados</div>
    <div class="unif-compare">
      <div class="unif-oficial">
        <div class="unif-label">Tu nombre oficial</div>
        <div class="unif-oficial-valor">${esc(yx.nombreOficial || '')}</div>
      </div>
      <div class="unif-vs">vs</div>
      <div class="unif-variantes">
        <div class="unif-label">Cómo aparece en otros lados</div>
        ${filas}
      </div>
    </div>
    <p class="unif-texto">${esc(yx.textoUniformidad || '')}</p>
  </div>`;
}

function directoriosSectionHtml(d) {
  const yx = d.yextScan;
  if (!yx || yx.disponible !== true) return '';

  const presentes = Array.isArray(yx.presentes) ? yx.presentes : [];
  const ausentes = Array.isArray(yx.ausentes) ? yx.ausentes : [];
  const noVerif = Array.isArray(yx.noVerificables) ? yx.noVerificables : [];

  // Canales que realmente mueven la aguja para una pyme
  const prioritarios = [...presentes, ...ausentes, ...noVerif]
    .filter((x) => x.prioridad === 'alta')
    .sort((a, b) => (a.estado === 'LISTING_FOUND' ? -1 : 1) - (b.estado === 'LISTING_FOUND' ? -1 : 1));

  const cobertura = yx.scorePrioritarios ?? 0;
  const hexCob = cobertura >= 80 ? '#0F9B8E' : cobertura >= 50 ? '#F5A623' : '#E94560';

  const titular = presentes.length <= 1
    ? 'Estás casi invisible fuera de Google'
    : cobertura >= 80
      ? 'Tenés buena cobertura en los canales que importan'
      : 'Te faltan canales clave donde tus clientes buscan';

  return `
  <div class="section page-start">
    <div class="section-eyebrow">Dónde te encuentran</div>
    <div class="section-title">${titular}</div>
    <p class="dir-intro">Revisamos ${yx.totalAnalizados} directorios, mapas y plataformas donde los clientes buscan negocios como el tuyo. Esto es lo que encontramos.</p>

    <div class="dir-stats">
      <div class="dir-stat dir-stat-ring">
        ${coberturaRingSvg(cobertura, hexCob)}
        <div class="dir-stat-label">Cobertura en canales<br>de alto impacto</div>
      </div>
      <div class="dir-stat-nums">
        <div class="dir-num-box dir-num-ok">
          <div class="dir-num">${presentes.length}</div>
          <div class="dir-num-label">Donde sí aparecés</div>
        </div>
        <div class="dir-num-box dir-num-no">
          <div class="dir-num">${ausentes.length}</div>
          <div class="dir-num-label">Donde no estás</div>
        </div>
        ${noVerif.length ? `<div class="dir-num-box dir-num-warn">
          <div class="dir-num">${noVerif.length}</div>
          <div class="dir-num-label">Sin verificar</div>
        </div>` : ''}
      </div>
    </div>

    ${prioritarios.length ? `
    <div class="dir-sub">Los canales que más pesan para tu negocio</div>
    <div class="canales-grid">${prioritarios.map(canalPrioritarioCard).join('')}</div>` : ''}

    ${uniformidadNombreHtml(yx)}

    <div class="dir-sub dir-sub-spaced">El mapa completo, por categoría</div>
    <div class="dir-grilla">${directoriosGrillaHtml(yx)}</div>

    <div class="fuente-sello">Fuente: verificación automática en directorios y mapas</div>
    <p class="dir-nota">Revisamos una red amplia de directorios, mapas y plataformas donde los clientes buscan negocios. No todos aplican a cada rubro: algunos son específicos de un sector (por ejemplo, reservas de hoteles o restaurantes) y otros tienen más peso en ciertos países. Los que más influyen en que te encuentren son los buscadores, los mapas y las plataformas de inteligencia artificial. Aparecer en más lugares, y sobre todo con la misma información en todos, refuerza la confianza que Google y las IA tienen en tus datos. En Guru te podemos ayudar a construir y mantener esa presencia.</p>
  </div>

  <div class="section page-start">
    <div class="section-eyebrow">El efecto dominó</div>
    <div class="section-title">Tu ficha no solo aparece en mapas: alimenta a las inteligencias artificiales</div>
    <p class="dir-intro">Cuando alguien le pregunta a una IA por un negocio como el tuyo, esa IA no inventa la respuesta: la construye con datos de fichas y directorios. Así viaja tu información hoy:</p>
    <div class="chart-box cadena-box">${cadenaIaSvg()}</div>
    <div class="cadena-insight">
      <div class="cadena-insight-title">Por qué esto te conviene entender</div>
      <p>Mantener tu ficha completa y con los mismos datos en todos lados no solo te ayuda a aparecer en Google Maps. Esa misma información es la que después usan <strong>Gemini</strong> para responder, <strong>Waze</strong> para llevar gente a tu puerta, <strong>Siri</strong> para dar indicaciones y <strong>ChatGPT</strong> para recomendarte. Un solo dato mal cargado se multiplica por todos esos canales — y un dato bien cargado, también.</p>
    </div>
  </div>`;
}


function ctaButtonHtml(d) {
  const email = (d.emailVendedor || '').trim();
  const asunto = encodeURIComponent(`Consulta sobre mi diagnóstico digital — ${d.empresa || ''}`);
  const cuerpo = encodeURIComponent(`Hola ${d.nombreVendedor || ''},\n\nRecibí el diagnóstico digital de ${d.empresa || 'mi empresa'} y me gustaría que conversemos sobre los resultados.\n\nGracias.`);
  if (!email) return '<span class="cta-button cta-button-off">Hablá con tu asesor Guru</span>';
  return `<a href="mailto:${esc(email)}?subject=${asunto}&body=${cuerpo}" class="cta-button">Escribirle a mi asesor Guru</a>`;
}

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

  ${directoriosSectionHtml(d)}

  <div class="section modules-section page-start">
    <div class="section-eyebrow">Diagnóstico completo</div>
    <div class="section-title">Los 6 frentes restantes, en detalle</div>
    <div class="modules-grid">${modulos.map(moduleCardHtml).join('')}</div>
  </div>

  ${competidoresSectionHtml(d)}

  ${oportunidadPerdidaHtml(d)}

  ${oportunidadesHtml(d.oportunidades)}

  <div class="cta">
    <div class="cta-content">
      <h2>${global >= 70 ? 'Vas mejor que la mayoría. Faltan detalles, no cimientos.' : 'Hay una oportunidad clara de mejorar rápido.'}</h2>
      <p>Tu asesor Guru ya tiene este diagnóstico completo — hablá con él ahora para armar el plan de acción.</p>
      ${ctaButtonHtml(d)}
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
.cliente-logo-card { display: inline-flex; align-items: center; justify-content: center; margin-top: 16px; background: white; border-radius: 14px; padding: 10px 20px; box-shadow: 0 8px 24px rgba(0,0,0,.3); }
.cliente-logo-img { display: block; max-height: 90px; max-width: 340px; width: auto; height: auto; object-fit: contain; }
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
.section-eyebrow { font: 700 12px var(--font-display); letter-spacing: .1em; text-transform: uppercase; color: var(--guru-text-muted); margin-bottom: 8px; page-break-after: avoid; break-after: avoid; }
.section-title { font: 700 24px var(--font-display); margin-bottom: 18px; letter-spacing: -0.01em; page-break-after: avoid; break-after: avoid; }
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
.module-name-row { display: flex; align-items: center; gap: 10px; }
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
.comp-box { background: var(--guru-bg); border: 1px solid var(--guru-border); border-radius: var(--radius-lg); padding: 24px 26px; }
.comp-row { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
.comp-row:last-child { margin-bottom: 0; }
.comp-name { width: 200px; flex-shrink: 0; font: 700 12.5px var(--font-display); color: var(--guru-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.comp-row-client .comp-name { color: var(--guru-accent); }
.comp-bar-track { flex: 1; height: 22px; background: #EEF1F6; border-radius: 6px; overflow: hidden; }
.comp-bar-fill { height: 100%; border-radius: 6px; }
.comp-meta { width: 160px; flex-shrink: 0; text-align: right; font-size: 11px; color: var(--guru-text-secondary); white-space: nowrap; }
.comp-transparency { margin-top: 14px; font-size: 12px; color: var(--guru-text-muted); font-style: italic; line-height: 1.5; }
.comp-insight-box { background: linear-gradient(120deg, #F3F1FF, #FFFFFF); border: 1px solid #E3DEFF; border-radius: var(--radius-lg); padding: 16px 20px; margin-top: 14px; }
.comp-insight-label { font: 700 11.5px var(--font-display); letter-spacing: .06em; text-transform: uppercase; color: var(--guru-purple); margin-bottom: 6px; }
.comp-insight-box p { font-size: 13px; color: var(--guru-text-secondary); line-height: 1.55; margin: 0; }
.comp-insight-box strong { color: var(--guru-text-primary); }
.op-headline-box { display: flex; align-items: center; gap: 24px; background: linear-gradient(120deg, var(--guru-primary), #262650); color: white; border-radius: var(--radius-lg); padding: 26px 28px; margin-bottom: 20px; }
.op-pct { font: 800 48px var(--font-display); flex-shrink: 0; color: var(--guru-accent-soft); }
.op-headline-text { font-size: 15px; line-height: 1.5; color: rgba(255,255,255,.9); }
.op-headline-text strong { color: white; }
.op-ejemplo-box { background: var(--guru-surface); border: 1px solid var(--guru-border); border-radius: var(--radius-lg); padding: 22px 26px; box-shadow: var(--shadow-card); margin-bottom: 20px; }
.op-ejemplo-label { font: 700 12px var(--font-display); letter-spacing: .06em; text-transform: uppercase; color: var(--guru-purple); margin-bottom: 10px; }
.op-ejemplo-intro { font-size: 14px; color: var(--guru-text-secondary); margin-bottom: 16px; }
.ejemplo-grid { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 14px; }
.ejemplo-row { flex: 1; min-width: 160px; background: var(--guru-bg); border-radius: var(--radius-md); padding: 14px 16px; text-align: center; }
.ejemplo-ticket { font-size: 11.5px; color: var(--guru-text-secondary); margin-bottom: 8px; line-height: 1.4; }
.ejemplo-ticket strong { color: var(--guru-text-primary); font-size: 13px; }
.ejemplo-arrow { display: none; }
.ejemplo-resultado { font: 800 16px var(--font-display); color: var(--guru-teal); }
.ejemplo-resultado span { display: block; font: 400 10px var(--font-body); color: var(--guru-text-muted); margin-top: 2px; }
.op-ejemplo-disclaimer { font-size: 11.5px; color: var(--guru-text-muted); font-style: italic; line-height: 1.5; }
.op-fuentes-box { background: var(--guru-bg); border-radius: var(--radius-lg); padding: 20px 24px; }
.op-fuentes-label { font: 700 12px var(--font-display); letter-spacing: .06em; text-transform: uppercase; color: var(--guru-text-muted); margin-bottom: 10px; }
.op-fuentes-list { list-style: disc; padding-left: 18px; font-size: 12.5px; color: var(--guru-text-secondary); margin-bottom: 10px; }
.op-fuentes-list li { margin-bottom: 6px; }
.fuente-cita { color: var(--guru-text-muted); font-style: italic; }
.op-fuentes-disclaimer { font-size: 11.5px; color: var(--guru-text-muted); font-style: italic; line-height: 1.5; }
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
.critical-top-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.critical-score { font: 800 30px var(--font-display); line-height: 1; }
.critical-label { font: 700 13px var(--font-display); color: var(--guru-text-primary); margin-bottom: 6px; }
.critical-desc { font-size: 12px; color: var(--guru-text-secondary); }
.page-start { page-break-before: always; break-before: page; }

/* ═══ Reglas de impresión: nunca cortar una tarjeta a la mitad entre páginas ═══ */
.radar-item, .opp-card, .detail-card, .hero, .comp-box, .op-headline-box, .op-ejemplo-box, .op-fuentes-box, .comp-insight-box, .canal-card, .dir-grupo, .unif-box, .ia-card, .chat-sim, .resenas-box, .reputacion-box, .serp-preview {
  page-break-inside: avoid;
  break-inside: avoid;
}
/* Las tarjetas de módulo (SEO Local, Posicionamiento, Construcción, Publicidad,
   Conversión, Redes) vuelven a respetar el salto por capítulo: si no entran
   completas en el espacio restante de la página, pasan enteras a la siguiente
   en vez de cortarse a la mitad. Preferimos usar alguna página más a que una
   tarjeta quede con sensación de "incompleta". Si una tarjeta es más alta que
   una página completa (típicamente SEO Local, por su bloque de reseñas y
   atributos), el corte cae entre sus sub-bloques protegidos (.detail-card,
   .resenas-box, etc.), nunca a mitad de un párrafo o de una caja. */
.module-card { page-break-inside: avoid; break-inside: avoid; }
.module-top { page-break-after: avoid; break-after: avoid; }
.modules-section { padding-top: 20px; }
.chart-box, .aiso-box, .questions-box { page-break-inside: avoid; break-inside: avoid; }

/* ── Sección directorios ── */
.dir-intro { font-size: 14px; color: var(--guru-text-secondary); line-height: 1.65; margin-bottom: 22px; max-width: 660px; }

/* ── Banda de estadísticas ── */
.dir-stats { display: flex; gap: 18px; align-items: stretch; margin-bottom: 30px; flex-wrap: wrap; }
.dir-stat-ring { display: flex; align-items: center; gap: 14px; background: var(--guru-surface); border: 1px solid var(--guru-border); border-radius: var(--radius-md); padding: 16px 22px; box-shadow: var(--shadow-card); }
.dir-stat-label { font: 600 12px/1.45 var(--font-display); color: var(--guru-text-secondary); }
.dir-stat-nums { display: flex; gap: 12px; flex: 1; min-width: 260px; }
.dir-num-box { flex: 1; border-radius: var(--radius-md); padding: 18px 14px; text-align: center; border: 1px solid var(--guru-border); background: var(--guru-surface); box-shadow: var(--shadow-card); }
.dir-num { font: 800 34px/1 var(--font-display); letter-spacing: -0.02em; }
.dir-num-label { font: 600 11px var(--font-body); color: var(--guru-text-secondary); margin-top: 7px; }
.dir-num-ok   { border-top: 3px solid var(--guru-teal); }
.dir-num-ok   .dir-num { color: var(--guru-teal); }
.dir-num-no   { border-top: 3px solid var(--guru-text-muted); }
.dir-num-no   .dir-num { color: var(--guru-text-muted); }
.dir-num-warn { border-top: 3px solid var(--guru-gold); }
.dir-num-warn .dir-num { color: var(--guru-gold); }

/* ── Subtítulos internos ── */
.dir-sub { font: 700 15px var(--font-display); color: var(--guru-text-primary); margin-bottom: 14px; }
.dir-sub-spaced { margin-top: 30px; }

/* ── Tarjetas de canales prioritarios ── */
.canales-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 26px; }
.canal-card { border-radius: var(--radius-md); padding: 16px 15px; border: 1px solid var(--guru-border); background: var(--guru-surface); box-shadow: var(--shadow-card); }
.canal-top { display: flex; align-items: center; gap: 8px; margin-bottom: 9px; }
.canal-icon { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0; }
.canal-nombre { font: 700 13.5px var(--font-display); color: var(--guru-text-primary); line-height: 1.25; }
.canal-estado { font: 700 11px var(--font-display); letter-spacing: .04em; text-transform: uppercase; margin-bottom: 5px; }
.canal-detalle { font-size: 11.5px; color: var(--guru-text-secondary); line-height: 1.45; }
.canal-ok   { border-left: 3px solid var(--guru-teal); }
.canal-ok   .canal-icon { background: rgba(15,155,142,.12); }
.canal-ok   .canal-estado { color: var(--guru-teal); }
.canal-no   { border-left: 3px solid var(--guru-accent); background: #FFF8F9; }
.canal-no   .canal-icon { background: #F1F5F9; }
.canal-no   .canal-estado { color: var(--guru-accent); }
.canal-warn { border-left: 3px solid var(--guru-gold); }
.canal-warn .canal-icon { background: rgba(245,166,35,.14); }
.canal-warn .canal-estado { color: var(--guru-gold); }

/* ── Grilla completa por categoría ── */
.dir-grilla { display: flex; flex-direction: column; gap: 14px; }
.dir-grupo { background: var(--guru-bg); border: 1px solid var(--guru-border); border-radius: var(--radius-md); padding: 14px 16px; }
.dir-grupo-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; }
.dir-grupo-nombre { font: 700 12.5px var(--font-display); color: var(--guru-text-primary); }
.dir-grupo-conteo { font: 600 11px var(--font-body); color: var(--guru-text-muted); }
.dir-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.dir-chip { display: inline-flex; align-items: center; gap: 5px; padding: 5px 11px; border-radius: 999px; font: 600 11.5px var(--font-body); border: 1px solid var(--guru-border); background: var(--guru-surface); }
.dir-chip-ok   { color: var(--guru-teal); border-color: rgba(15,155,142,.35); background: rgba(15,155,142,.07); }
.dir-chip-warn { color: #B45309; border-color: rgba(245,166,35,.4); background: rgba(245,166,35,.09); }
.dir-chip-no   { color: var(--guru-text-muted); }

/* ── Uniformidad del nombre ── */
.unif-box { background: #FFFBF2; border: 1px solid rgba(245,166,35,.35); border-left: 4px solid var(--guru-gold); border-radius: var(--radius-md); padding: 20px 22px; margin-bottom: 26px; }
.unif-title { font: 700 14.5px var(--font-display); color: #92400E; margin-bottom: 15px; }
.unif-compare { display: flex; align-items: center; gap: 16px; margin-bottom: 15px; flex-wrap: wrap; }
.unif-oficial { flex: 1; min-width: 180px; background: var(--guru-surface); border-radius: var(--radius-sm); padding: 12px 14px; border: 1px solid var(--guru-border); }
.unif-variantes { flex: 1.4; min-width: 220px; }
.unif-label { font: 700 9.5px var(--font-display); letter-spacing: .09em; text-transform: uppercase; color: var(--guru-text-muted); margin-bottom: 6px; }
.unif-oficial-valor { font: 700 15px var(--font-display); color: var(--guru-text-primary); }
.unif-vs { font: 700 11px var(--font-display); color: var(--guru-text-muted); text-transform: uppercase; }
.unif-row { display: flex; align-items: baseline; gap: 10px; background: var(--guru-surface); border: 1px solid var(--guru-border); border-radius: var(--radius-sm); padding: 9px 13px; margin-bottom: 6px; }
.unif-dir { font: 700 11px var(--font-display); color: var(--guru-text-muted); min-width: 68px; }
.unif-nombre { font: 600 13.5px var(--font-display); color: #92400E; }
.unif-texto { font-size: 12.5px; line-height: 1.65; color: var(--guru-text-secondary); }

/* ── Nota de transparencia ── */
.dir-nota { margin-top: 22px; font-size: 11.5px; line-height: 1.65; color: var(--guru-text-muted); background: var(--guru-bg); border-radius: var(--radius-sm); padding: 14px 16px; }

/* ── Infografía cadena IA ── */
.cadena-box { padding: 18px 12px; }
.cadena-insight { margin-top: 18px; background: linear-gradient(135deg, var(--guru-primary) 0%, #2C2C56 100%); color: white; border-radius: var(--radius-md); padding: 22px 26px; }
.cadena-insight-title { font: 700 14px var(--font-display); color: var(--guru-accent-soft); margin-bottom: 9px; }
.cadena-insight p { font-size: 13px; line-height: 1.7; color: rgba(255,255,255,.88); }
.cadena-insight strong { color: white; font-weight: 700; }

/* ── Tarjetas de plataformas de IA ── */
.ia-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 22px; }
.ia-card { position: relative; background: var(--guru-surface); border: 1px solid var(--guru-border); border-radius: var(--radius-lg); padding: 20px 20px 18px; box-shadow: var(--shadow-card); overflow: hidden; }
.ia-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, var(--guru-purple), #A78BFA); }
.ia-card-head { display: flex; align-items: center; gap: 14px; margin-bottom: 15px; }
.ia-card-head svg { flex-shrink: 0; }
.ia-card-name { font: 800 18px var(--font-display); color: var(--guru-text-primary); margin-bottom: 4px; letter-spacing: -.01em; }
.ia-card-status { font: 700 10.5px var(--font-display); letter-spacing: .07em; text-transform: uppercase; display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 999px; }
.ia-card-status.si { color: #0B7F74; background: rgba(15,155,142,.13); }
.ia-card-status.no { color: #C2334D; background: rgba(233,69,96,.11); }
.ia-card-pos { display: flex; align-items: center; gap: 12px; background: linear-gradient(135deg, #F3F1FF, #FAF9FF); border: 1px solid rgba(108,99,255,.18); border-radius: var(--radius-md); padding: 12px 14px; margin-bottom: 12px; }
.ia-pos-num { font: 800 30px var(--font-display); color: var(--guru-purple); line-height: 1; letter-spacing: -.02em; }
.ia-pos-lbl { font: 500 10.5px/1.35 var(--font-body); color: var(--guru-text-secondary); }
.ia-card-pos-off { justify-content: center; text-align: center; background: var(--guru-bg); border-color: var(--guru-border); }
.ia-card-note { font-size: 11.5px; line-height: 1.55; color: var(--guru-text-secondary); border-top: 1px solid var(--guru-border); padding-top: 11px; }

/* ── Conversación simulada con la IA ── */
.chat-sim { background: white; border-radius: var(--radius-md); padding: 20px 22px; margin-bottom: 20px; }
.chat-sim-head { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.chat-sim-tag { font: 700 9.5px var(--font-display); letter-spacing: .1em; text-transform: uppercase; background: var(--guru-gold); color: white; padding: 4px 9px; border-radius: 4px; }
.chat-sim-title { font: 700 14px var(--font-display); color: var(--guru-text-primary); }
.chat-bubble { display: flex; gap: 11px; margin-bottom: 12px; align-items: flex-start; }
.chat-avatar { width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font: 700 12px var(--font-display); }
.chat-avatar-user { background: var(--guru-border); color: var(--guru-text-secondary); }
.chat-avatar-ai { background: linear-gradient(135deg, var(--guru-purple), var(--guru-accent)); color: white; }
.chat-avatar-ai svg { width: 16px; height: 16px; }
.chat-text { font-size: 13px; line-height: 1.6; padding: 11px 15px; border-radius: 14px; }
.chat-user .chat-text { background: var(--guru-bg); color: var(--guru-text-secondary); border-top-left-radius: 4px; }
.chat-ai .chat-text { background: linear-gradient(135deg, #F5F3FF, #FFF1F4); color: var(--guru-text-primary); border-top-left-radius: 4px; border: 1px solid rgba(108,99,255,.18); }
.chat-sim-foot { font-size: 10.5px; line-height: 1.55; color: var(--guru-text-muted); margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--guru-border); }

/* ── Barra de sentimiento ── */
.sent-box { padding-bottom: 14px; }
.sent-desc { font-size: 12.5px; line-height: 1.6; margin-top: 4px; }

/* ── Nota de método ── */
.aiso-metodo { margin-top: 18px; font-size: 10.5px; line-height: 1.55; color: var(--guru-text-muted); font-style: italic; border-top: 1px solid var(--guru-border); padding-top: 12px; }

/* ── Botón CTA sin email ── */
.cta-button-off { opacity: .75; cursor: default; }


/* ── Gestión de reseñas (SEO Local) ── */
.resenas-box { background: linear-gradient(135deg, #F3F1FF 0%, #FAFAFF 100%); border: 1px solid rgba(108,99,255,.2); border-left: 4px solid var(--guru-purple); border-radius: var(--radius-lg); padding: 20px 24px; margin-bottom: 16px; }
.resenas-label { font: 700 11.5px var(--font-display); letter-spacing: .08em; text-transform: uppercase; color: var(--guru-purple); margin-bottom: 9px; }
.resenas-texto { font-size: 13.5px; line-height: 1.65; color: var(--guru-text-secondary); margin-bottom: 15px; }
.resenas-texto strong { color: var(--guru-text-primary); font-weight: 700; }
.resenas-pregunta { background: var(--guru-surface); border-radius: var(--radius-md); padding: 15px 18px; border: 1px dashed rgba(108,99,255,.35); }
.resenas-pregunta-label { font: 700 10px var(--font-display); letter-spacing: .1em; text-transform: uppercase; color: var(--guru-gold); margin-bottom: 7px; }
.resenas-pregunta p { font-size: 13px; line-height: 1.65; color: var(--guru-text-secondary); }
.resenas-pregunta strong { color: var(--guru-text-primary); font-weight: 700; }

/* ── Aclaración de alcance de un módulo ── */
.modulo-alcance { font-size: 11.5px; line-height: 1.6; color: var(--guru-text-secondary); background: var(--guru-bg); border-left: 3px solid var(--guru-border); border-radius: var(--radius-sm); padding: 12px 14px; margin-bottom: 14px; }
.modulo-alcance strong { color: var(--guru-text-primary); }

/* ── Chips de atributos de la ficha de Google ── */
.attr-chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 4px; }
.attr-chip { font: 600 11px var(--font-body); background: var(--guru-surface); border: 1px solid var(--guru-border); color: var(--guru-text-secondary); padding: 4px 10px; border-radius: 999px; }

/* ── Sello de fuente ── */
.fuente-sello { display: inline-block; font: 600 10px var(--font-display); letter-spacing: .06em; text-transform: uppercase; color: var(--guru-text-muted); background: var(--guru-bg); border: 1px solid var(--guru-border); border-radius: 999px; padding: 5px 12px; margin-top: 18px; }
`;

module.exports = { generateReportHtml };
