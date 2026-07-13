// ══════════════════════════════════════════════════════════════
// lib/generateReportHtml.js
// Convierte el JSON que entrega N16 (Motor de Scoring) en el HTML
// completo del reporte. Este HTML es el que Puppeteer convierte a PDF.
// ══════════════════════════════════════════════════════════════

function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function tierInfo(score) {
  if (score === null || score === undefined) return { cls: 'atencion', label: 'Sin datos' };
  if (score >= 80) return { cls: 'excelente', label: 'Excelente' };
  if (score >= 60) return { cls: 'bueno', label: 'Bueno' };
  if (score >= 40) return { cls: 'atencion', label: 'Necesita atención' };
  return { cls: 'critico', label: 'Crítico' };
}

function globalTierLabel(score) {
  if (score >= 80) return 'Excelente presencia digital';
  if (score >= 60) return 'Bueno, con oportunidades';
  if (score >= 40) return 'Necesita atención';
  return 'Requiere acción urgente';
}

function buildSummary(scores, empresa) {
  const modules = [
    { key: 'seoLocal', label: 'tu perfil de Google' },
    { key: 'posicionamiento', label: 'tu posicionamiento orgánico' },
    { key: 'construccion', label: 'la construcción técnica de tu sitio' },
    { key: 'publicidad', label: 'tu publicidad paga' },
    { key: 'aiso', label: 'tu presencia en buscadores de IA' },
    { key: 'conversion', label: 'tu capacidad de conversión' },
    { key: 'redes', label: 'tus redes sociales' },
  ];
  const withScores = modules.map((m) => ({ ...m, score: scores?.[m.key] ?? 0 }));
  const sorted = [...withScores].sort((a, b) => b.score - a.score);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const global = scores?.global ?? 0;

  let opening;
  if (global >= 80) opening = 'Tu presencia digital está entre las mejores de tu categoría.';
  else if (global >= 60) opening = 'Tu presencia digital está por encima del promedio, pero se te están escapando oportunidades concretas.';
  else if (global >= 40) opening = 'Tu presencia digital tiene una base, pero hay varios frentes que están frenando tu crecimiento.';
  else opening = 'Tu presencia digital necesita atención urgente en varios frentes a la vez.';

  if (best.score === worst.score) {
    return `${opening} Tus resultados están parejos en todos los frentes — no hay un problema puntual que resolver, sino una mejora general a trabajar.`;
  }

  return `${opening} <strong>${best.label}</strong> es tu punto más fuerte (${best.score}/100). El foco más claro para mejorar es <strong>${worst.label}</strong> (${worst.score}/100).`;
}

function findOportunidad(oportunidades, area) {
  if (!Array.isArray(oportunidades)) return null;
  return oportunidades.find((o) => o.area === area) || null;
}

function checklistHtml(items) {
  return `<ul class="check-list">${items.map((it) => `
    <li class="check-item"><span class="check-icon check-${it.tipo}">${it.tipo === 'ok' ? '✓' : it.tipo === 'warn' ? '△' : '✗'}</span> ${it.texto}</li>
  `).join('')}</ul>`;
}

function chipsHtml(items) {
  if (!items.length) return '';
  return `<div class="dir-chips">${items.map((t) => `<span class="dir-chip">✓ ${esc(t)}</span>`).join('')}</div>`;
}

// ══ MÓDULO: SEO Local ══
function moduloSeoLocal(d) {
  const gbp = d.gbp || {};
  const directorios = d.directorios?.lista || [];
  const items = [];
  items.push(gbp.encontrado
    ? { tipo: 'ok', texto: 'Perfil de Google Business reclamado y verificado' }
    : { tipo: 'bad', texto: 'No encontramos un Perfil de Google Business activo' });
  if (gbp.resenas) {
    items.push({ tipo: 'ok', texto: `${gbp.resenas} reseñas con ${gbp.rating ?? '—'}★ de promedio` });
  }
  const opp = findOportunidad(d.oportunidades, 'SEO Local');
  const next = opp
    ? opp.desc
    : 'Ya estás fuerte acá. Es lo primero que Google y las IA usan para decidir a quién recomendar cerca tuyo — mantenelo respondiendo todas las reseñas nuevas.';
  return { titulo: 'SEO Local', score: d.scores?.seoLocal, chips: chipsHtml(directorios), items, next };
}

// ══ MÓDULO: Posicionamiento Orgánico ══
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
  const serp = d.website
    ? `<div class="serp-preview">
        <div class="serp-label">Así te ve Google hoy</div>
        <div class="serp-url">${esc((d.website || '').replace(/^https?:\/\//, ''))}</div>
        <div class="serp-title">${esc(d.empresa)}</div>
        <div class="serp-desc">El texto que ve el buscador sale directo de tu página de inicio.</div>
      </div>`
    : '';
  const opp = findOportunidad(d.oportunidades, 'Contenido Web');
  const next = opp ? opp.desc : 'Vas bien en este frente — seguí publicando contenido actualizado.';
  return { titulo: 'Posicionamiento Orgánico', score: d.scores?.posicionamiento, extra: serp, items, next };
}

// ══ MÓDULO: Construcción del Sitio ══
function moduloConstruccion(d) {
  const c = d.construccion || {};
  const stack = d.stackTecnologico || {};
  const dominio = d.dominio || {};
  const pagespeed = d.pagespeed || {};
  const items = [];
  items.push(c.ssl
    ? { tipo: 'ok', texto: 'HTTPS activo — tu sitio es seguro para tus clientes' }
    : { tipo: 'bad', texto: 'Tu sitio no tiene HTTPS activo (SSL) — esto genera desconfianza y penaliza tu posición en Google' });
  if (stack.cms) {
    items.push({ tipo: 'ok', texto: `Sitio construido en ${stack.cms}${c.faviconDetectado && c.blogDetectado ? ', bien configurado (favicon y blog activos)' : ''}` });
  }
  if (dominio.disponible && dominio.antiguedadAnios !== null && dominio.antiguedadAnios !== undefined) {
    items.push({ tipo: 'ok', texto: `Dominio registrado hace ${dominio.antiguedadAnios} años — un dominio con antigüedad transmite confianza real, tanto a Google como a un cliente que investiga antes de comprar` });
  }
  if (pagespeed.disponible) {
    const seg = pagespeed.lcp_ms ? (pagespeed.lcp_ms / 1000).toFixed(1) : null;
    if (pagespeed.scorePerformance >= 80) {
      items.push({ tipo: 'ok', texto: `Velocidad de carga: ${pagespeed.scorePerformance}/100 — muy buena` });
    } else {
      items.push({ tipo: 'warn', texto: `El contenido principal tarda ~${seg ?? '?'} segundos en cargar en celular (ideal: menos de 2.5s)` });
    }
  }
  const next = pagespeed.disponible && pagespeed.scorePerformance < 80
    ? 'Comprimir las imágenes del sitio para acelerar la carga — un sitio que carga rápido en celular retiene más visitas y Google lo premia con mejor posición.'
    : (!c.ssl ? 'Activar HTTPS es el ajuste más urgente de todo este diagnóstico.' : 'Base técnica sólida — no hay ajustes urgentes acá.');
  return { titulo: 'Construcción del Sitio', score: d.scores?.construccion, items, next };
}

// ══ MÓDULO: Publicidad ══
function moduloPublicidad(d) {
  const p = d.publicidad || {};
  const items = [
    { tipo: p.googleAdsDetectado ? 'ok' : 'bad', texto: p.googleAdsDetectado ? 'Google Ads activo' : 'Sin Google Ads activo' },
    { tipo: p.displayDetectado ? 'ok' : 'bad', texto: p.displayDetectado ? 'Display (banners) activo' : 'Sin Display (banners) activo' },
    { tipo: p.metaAdsDetectado ? 'ok' : 'bad', texto: p.metaAdsDetectado ? 'Meta Ads (Facebook/Instagram) activo' : 'Sin Meta Ads activo' },
  ];
  const opp = findOportunidad(d.oportunidades, 'Publicidad');
  const next = opp
    ? `${opp.desc} — es el único canal donde le hablás a alguien que ya está buscando tu producto en ese momento, no a alguien que hay que convencer primero.`
    : 'Ya tenés publicidad activa en los canales principales — buen trabajo.';
  return { titulo: 'Publicidad', score: d.scores?.publicidad, items, next };
}

// ══ MÓDULO: Conversión ══
function moduloConversion(d) {
  const c = d.conversion || {};
  const items = [
    { tipo: c.chatDetectado ? 'ok' : 'bad', texto: c.chatDetectado ? `${c.chatTipo || 'Chat'} visible y funcional en el sitio` : 'No detectamos WhatsApp ni chat visible en el sitio' },
    { tipo: c.ecommerceDetectado ? 'ok' : 'warn', texto: c.ecommerceDetectado ? 'Tienda online activa y operando' : 'No detectamos tienda online / e-commerce' },
  ];
  const opp = findOportunidad(d.oportunidades, 'Conversión');
  const next = opp
    ? opp.desc
    : 'Esto es justo lo que hace que toda la inversión en visibilidad (SEO, Ads) realmente se traduzca en ventas — no lo pierdas de vista.';
  return { titulo: 'Conversión', score: d.scores?.conversion, items, next };
}

// ══ MÓDULO: Redes Sociales ══
function moduloRedes(d) {
  const r = d.redes || {};
  const activas = [];
  if (r.facebook) activas.push('Facebook');
  if (r.instagram) activas.push('Instagram');
  if (r.tiktok) activas.push('TikTok');
  if (r.linkedin) activas.push('LinkedIn');
  if (r.twitter) activas.push('Twitter/X');
  if (r.youtube) activas.push('YouTube');
  const faltantes = ['TikTok', 'LinkedIn', 'YouTube'].filter((x) => !activas.includes(x));
  const items = [];
  if (faltantes.length) {
    items.push({ tipo: 'bad', texto: `Sin presencia en ${faltantes.join(', ')}` });
  } else {
    items.push({ tipo: 'ok', texto: 'Presencia activa en las principales plataformas' });
  }
  const opp = findOportunidad(d.oportunidades, 'Redes Sociales');
  const next = opp
    ? opp.desc
    : 'Buena presencia en redes — hoy es donde más alcance orgánico gratuito se puede conseguir sin pautar.';
  return { titulo: 'Redes Sociales', score: d.scores?.redes, chips: chipsHtml(activas), items, next };
}

function moduleCardHtml(m) {
  const t = tierInfo(m.score);
  return `
    <div class="module-card">
      <div class="module-top"><span class="module-name">${esc(m.titulo)}</span><span class="module-score tier-${t.cls}">${m.score ?? '—'}</span></div>
      <div class="bar-track"><div class="bar-fill fill-${t.cls}" style="width:${m.score ?? 0}%"></div></div>
      ${m.chips || ''}
      ${m.extra || ''}
      ${checklistHtml(m.items)}
      <div class="next-step"><strong>Próximo paso:</strong> ${m.next}</div>
    </div>`;
}

// ══ AISO ══
function aisoSectionHtml(d) {
  const a = d.aiso || {};
  const preguntas = Array.isArray(a.preguntas_ejemplo) && a.preguntas_ejemplo.length
    ? a.preguntas_ejemplo
    : null;

  const radar = (plataforma, aparece, posicion) => `
    <div class="radar-item">
      <div class="radar-top">
        <span class="radar-platform">${plataforma}</span>
        <span class="radar-status ${aparece ? 'si' : 'no'}">${aparece ? 'Aparece' : 'No detectado'}</span>
      </div>
      ${aparece && posicion ? `<div class="radar-pos">#${posicion} <span>posición estimada</span></div>` : ''}
    </div>`;

  const recomendaciones = Array.isArray(a.recomendaciones) ? a.recomendaciones : [];

  return `
  <div class="aiso-section">
    <div class="aiso-header">
      <div class="aiso-badge">✨</div>
      <div class="aiso-title">Presencia en Inteligencia Artificial</div>
    </div>
    <p class="aiso-subtitle">
      Cada vez más gente le pregunta directamente a ChatGPT o a Gemini "¿dónde compro X en mi ciudad?" en vez de buscar en Google. Si tu negocio no aparece en esa respuesta, perdés al cliente antes de que sepa que existís.
    </p>

    <div class="aiso-radar">
      ${radar('ChatGPT', a.chatgpt_aparece, a.chatgpt_posicion)}
      ${radar('Gemini', a.gemini_aparece, a.gemini_posicion)}
    </div>

    ${a.motivo ? `
    <div class="aiso-box">
      <div class="aiso-box-label">Por qué te ubicamos ahí</div>
      <p>${esc(a.motivo)}</p>
    </div>` : ''}

    ${recomendaciones.length ? `
    <ul class="reco-list">
      ${recomendaciones.map((r, i) => `<li><span class="reco-num">${i + 1}</span> ${esc(r)}</li>`).join('')}
    </ul>` : ''}

    <div class="questions-box">
      <span class="questions-tag">${preguntas ? 'Generado para tu negocio' : 'Próximamente'}</span>
      <h4>Así es como alguien te podría estar buscando hoy en ChatGPT:</h4>
      ${(preguntas || ['Sin datos suficientes para generar ejemplos en este diagnóstico.']).map((q) => `<div class="q-item">${esc(q)}</div>`).join('')}
    </div>
  </div>`;
}

function oportunidadesHtml(oportunidades) {
  const iconos = {
    'SEO Local': '📍', 'Contenido Web': '📝', 'Presencia en IA': '✨',
    'Publicidad': '📣', 'Conversión': '💬', 'Redes Sociales': '📱', 'Blog/Contenidos': '📰',
  };
  if (!Array.isArray(oportunidades) || oportunidades.length === 0) {
    return `<div class="section"><div class="section-eyebrow">Cómo te podemos ayudar</div>
      <div class="section-title">Estás cubriendo bien todos los frentes</div>
      <p class="lead-text">No detectamos oportunidades urgentes en este diagnóstico. Tu asesor Guru puede revisar en detalle si hay margen de optimización fina.</p></div>`;
  }
  return `
  <div class="section">
    <div class="section-eyebrow">Cómo te podemos ayudar</div>
    <div class="section-title">${oportunidades.length === 1 ? 'Tu oportunidad más clara' : 'Tus oportunidades más claras'}</div>
    ${oportunidades.map((o) => `
      <div class="opp-card" style="margin-bottom:12px;">
        <div class="opp-icon">${iconos[o.area] || '🎯'}</div>
        <div>
          <div class="opp-area">${esc(o.area)}</div>
          <div class="opp-desc">${esc(o.desc)}</div>
          <div class="opp-product">Producto recomendado: <strong>${esc(o.producto)}</strong></div>
        </div>
      </div>
    `).join('')}
  </div>`;
}

function fotoHtml(imagenes) {
  const foto = imagenes?.foto_gbp || imagenes?.og_image || null;
  if (foto) {
    return `<img src="${esc(foto)}" class="hero-photo-img" alt="Foto del negocio" />`;
  }
  return `<div class="hero-photo">Sin foto disponible</div>`;
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

  const modulos = [
    moduloSeoLocal(d),
    moduloPosicionamiento(d),
    moduloConstruccion(d),
    moduloPublicidad(d),
    moduloConversion(d),
    moduloRedes(d),
  ];

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
      <div class="guru-logo">GURU<span>·</span>SOLUCIONES</div>
      <div class="hero-date">${esc(fecha)}</div>
    </div>
    <div class="hero-body">
      ${fotoHtml(d.imagenes)}
      <div class="hero-info">
        <div class="hero-eyebrow">Diagnóstico de Presencia Digital</div>
        <div class="hero-company">${esc(d.empresa)}</div>
        <div class="hero-meta">${esc(d.ciudad)}${d.pais ? ', ' + esc(d.pais) : ''} · ${esc(categoria)}${gbp.resenas ? ` · <strong>${gbp.resenas} reseñas</strong> en Google (${gbp.rating ?? '—'}★)` : ''}</div>
      </div>
      <div class="gauge-wrap">
        <div class="gauge" style="background: conic-gradient(var(--guru-${gTier.cls === 'excelente' ? 'teal' : gTier.cls === 'bueno' ? 'gold' : gTier.cls === 'atencion' ? 'accent-soft' : 'accent'}) 0% ${global}%, rgba(255,255,255,.12) ${global}% 100%);">
          <div class="gauge-inner">
            <div class="gauge-score">${global}</div>
            <div class="gauge-label">de 100</div>
          </div>
        </div>
        <div class="gauge-tier">${esc(globalTierLabel(global))}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-eyebrow">En pocas palabras</div>
    <p class="lead-text">${buildSummary(scores, d.empresa)}</p>
  </div>

  ${aisoSectionHtml(d)}

  <div class="section">
    <div class="section-eyebrow">Diagnóstico completo</div>
    <div class="section-title">Los 6 frentes restantes</div>
    <div class="modules-grid">
      ${modulos.map(moduleCardHtml).join('')}
    </div>
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
.page { max-width: 860px; margin: 0 auto; background: var(--guru-surface); }
.hero { background: linear-gradient(135deg, var(--guru-primary) 0%, #262650 55%, var(--guru-purple) 130%); color: white; padding: 56px 48px 64px; position: relative; overflow: hidden; }
.hero::before { content: ""; position: absolute; top: -120px; right: -120px; width: 360px; height: 360px; border-radius: 50%; background: radial-gradient(circle, rgba(108,99,255,.35), transparent 70%); }
.hero-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; position: relative; z-index: 1; }
.guru-logo { font: 800 20px var(--font-display); letter-spacing: -0.02em; }
.guru-logo span { color: var(--guru-accent-soft); }
.hero-date { font: 500 13px var(--font-body); color: rgba(255,255,255,.65); }
.hero-body { position: relative; z-index: 1; display: flex; gap: 28px; align-items: center; flex-wrap: wrap; }
.hero-photo, .hero-photo-img { width: 84px; height: 84px; border-radius: var(--radius-md); flex-shrink: 0; object-fit: cover; }
.hero-photo { background: rgba(255,255,255,.08); border: 1.5px dashed rgba(255,255,255,.35); display: flex; align-items: center; justify-content: center; text-align: center; font-size: 10px; color: rgba(255,255,255,.55); line-height: 1.3; padding: 4px; }
.hero-info { flex: 1; min-width: 260px; }
.hero-eyebrow { font: 700 12px var(--font-display); letter-spacing: .12em; text-transform: uppercase; color: var(--guru-accent-soft); margin-bottom: 10px; }
.hero-company { font: 800 32px/1.15 var(--font-display); letter-spacing: -0.02em; margin-bottom: 8px; }
.hero-meta { color: rgba(255,255,255,.72); font-size: 14.5px; }
.hero-meta strong { color: white; font-weight: 600; }
.gauge-wrap { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.gauge { width: 168px; height: 168px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 6px rgba(255,255,255,.06); }
.gauge-inner { width: 132px; height: 132px; border-radius: 50%; background: var(--guru-primary); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.gauge-score { font: 800 44px var(--font-display); line-height: 1; }
.gauge-label { font: 600 11px var(--font-body); letter-spacing: .06em; text-transform: uppercase; color: rgba(255,255,255,.6); margin-top: 4px; }
.gauge-tier { font: 700 14px var(--font-display); color: var(--guru-gold); text-align: center; max-width: 168px; }
.section { padding: 40px 48px; border-bottom: 1px solid var(--guru-border); }
.section-eyebrow { font: 700 12px var(--font-display); letter-spacing: .1em; text-transform: uppercase; color: var(--guru-text-muted); margin-bottom: 8px; }
.section-title { font: 700 24px var(--font-display); margin-bottom: 18px; letter-spacing: -0.01em; }
.lead-text { font-size: 16px; color: var(--guru-text-secondary); max-width: 640px; }
.lead-text strong { color: var(--guru-text-primary); }
.aiso-section { background: radial-gradient(circle at 15% 20%, #EEEDFF 0%, #F8F9FC 55%); border-bottom: 1px solid var(--guru-border); padding: 44px 48px; }
.aiso-header { display: flex; align-items: center; gap: 14px; margin-bottom: 6px; }
.aiso-badge { width: 40px; height: 40px; border-radius: var(--radius-md); background: linear-gradient(135deg, var(--guru-purple), #9B8CFF); display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 4px 14px rgba(108,99,255,.35); }
.aiso-title { font: 800 26px var(--font-display); letter-spacing: -0.01em; }
.aiso-subtitle { color: var(--guru-text-secondary); font-size: 15px; margin: 6px 0 28px; max-width: 620px; }
.aiso-radar { display: flex; gap: 32px; margin-bottom: 28px; flex-wrap: wrap; }
.radar-item { flex: 1; min-width: 220px; background: var(--guru-surface); border-radius: var(--radius-lg); padding: 20px 22px; box-shadow: var(--shadow-card); border: 1px solid #ECEBFF; }
.radar-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.radar-platform { font: 700 15px var(--font-display); }
.radar-status { font: 700 11px var(--font-display); letter-spacing: .04em; padding: 4px 10px; border-radius: 999px; }
.radar-status.si { background: #E6F7F5; color: var(--guru-teal); }
.radar-status.no { background: #FDECEE; color: var(--guru-accent); }
.radar-pos { font: 800 30px var(--font-display); color: var(--guru-primary); }
.radar-pos span { font-size: 14px; font-weight: 600; color: var(--guru-text-muted); }
.aiso-box { background: var(--guru-surface); border-radius: var(--radius-lg); padding: 22px 26px; box-shadow: var(--shadow-card); margin-bottom: 20px; border-left: 4px solid var(--guru-purple); }
.aiso-box-label { font: 700 12px var(--font-display); letter-spacing: .08em; text-transform: uppercase; color: var(--guru-purple); margin-bottom: 8px; }
.aiso-box p { font-size: 14.5px; color: var(--guru-text-secondary); }
.reco-list { list-style: none; margin-bottom: 4px; }
.reco-list li { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px dashed var(--guru-border); font-size: 14.5px; }
.reco-list li:last-child { border-bottom: none; }
.reco-num { flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%; background: var(--guru-purple); color: white; font: 700 11px var(--font-display); display: flex; align-items: center; justify-content: center; }
.questions-box { margin-top: 22px; background: var(--guru-primary); border-radius: var(--radius-lg); padding: 22px 26px; color: white; }
.questions-tag { display: inline-block; font: 700 10px var(--font-display); letter-spacing: .08em; text-transform: uppercase; background: rgba(255,255,255,.12); color: var(--guru-accent-soft); padding: 3px 9px; border-radius: 999px; margin-bottom: 12px; }
.questions-box h4 { font: 700 15px var(--font-display); margin-bottom: 12px; }
.q-item { font-size: 14px; color: rgba(255,255,255,.85); padding: 6px 0 6px 20px; position: relative; }
.q-item::before { content: "\\201C"; position: absolute; left: 0; color: var(--guru-accent-soft); font-size: 18px; }
.modules-grid { display: grid; grid-template-columns: 1fr; gap: 14px; margin-top: 8px; }
.module-card { background: var(--guru-surface); border: 1px solid var(--guru-border); border-radius: var(--radius-lg); padding: 20px 22px; box-shadow: var(--shadow-card); }
.module-top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; }
.module-name { font: 700 14.5px var(--font-display); }
.module-score { font: 800 20px var(--font-display); }
.bar-track { height: 8px; background: #EEF1F6; border-radius: 999px; overflow: hidden; margin-bottom: 10px; }
.bar-fill { height: 100%; border-radius: 999px; }
.check-list { list-style: none; margin-bottom: 14px; }
.check-item { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: var(--guru-text-secondary); padding: 4px 0; }
.check-icon { flex-shrink: 0; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; margin-top: 1px; }
.check-ok { background: #E6F7F5; color: var(--guru-teal); }
.check-warn { background: #FDF1E2; color: #E08A3C; }
.check-bad { background: #FDECEE; color: var(--guru-accent); }
.next-step { font-size: 12.5px; padding: 10px 12px; border-radius: var(--radius-sm); background: var(--guru-bg); border-left: 3px solid var(--guru-primary); }
.next-step strong { color: var(--guru-primary); }
.serp-preview { background: var(--guru-bg); border: 1px solid var(--guru-border); border-radius: var(--radius-sm); padding: 14px 16px; margin-bottom: 14px; }
.serp-label { font: 700 10px var(--font-display); letter-spacing: .06em; text-transform: uppercase; color: var(--guru-text-muted); margin-bottom: 8px; }
.serp-url { font-size: 12px; color: #1a0dab; opacity: .75; margin-bottom: 2px; }
.serp-title { font-size: 15px; color: #1a0dab; font-weight: 500; margin-bottom: 3px; }
.serp-desc { font-size: 12.5px; color: var(--guru-text-secondary); }
.dir-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
.dir-chip { font: 600 11.5px var(--font-body); padding: 5px 11px; border-radius: 999px; background: #E6F7F5; color: var(--guru-teal); border: 1px solid #C5EEE9; }
.opp-card { display: flex; align-items: center; gap: 18px; background: linear-gradient(120deg, #FFF6F2, #FFFFFF); border: 1px solid #FFE1D6; border-radius: var(--radius-lg); padding: 20px 24px; box-shadow: var(--shadow-card); }
.opp-icon { width: 46px; height: 46px; border-radius: var(--radius-md); flex-shrink: 0; background: var(--guru-accent); color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 4px 14px rgba(233,69,96,.3); }
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
`;

module.exports = { generateReportHtml };
