// Trae todas las filas de la vista consolidada desde Supabase, paginando de
// a 1000 (el límite por defecto de PostgREST) hasta traerlas todas — así el
// dashboard nunca se queda corto de datos aunque el histórico crezca.
async function traerTodasLasFilas() {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!base || !key) {
    throw new Error('Faltan las variables de entorno SUPABASE_URL / SUPABASE_SERVICE_KEY en Vercel.');
  }
  const pageSize = 1000;
  let offset = 0;
  let todas = [];
  while (true) {
    const url = `${base}/rest/v1/v_dashboard_diagnosticos?select=*&order=created_at.desc&limit=${pageSize}&offset=${offset}`;
    const r = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!r.ok) {
      const texto = await r.text().catch(() => '');
      throw new Error(`Supabase respondió ${r.status}: ${texto}`);
    }
    const chunk = await r.json();
    todas = todas.concat(chunk);
    if (chunk.length < pageSize) break;
    offset += pageSize;
  }
  return todas;
}

function escaparCampoCSV(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n;]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function armarCSV(filas) {
  if (!filas.length) return '';
  const columnas = Object.keys(filas[0]);
  const encabezado = columnas.join(',');
  const cuerpo = filas.map(f => columnas.map(c => escaparCampoCSV(f[c])).join(','));
  return [encabezado, ...cuerpo].join('\r\n');
}

module.exports = { traerTodasLasFilas, armarCSV };
