// lib/dashboardDataSitioWeb.js
//
// Trae todas las filas de "sitio_web_diagnosticos" — la tabla del proyecto
// de Supabase NUEVO ("Auditoría de Sitios Web"), separado del proyecto de
// Supabase que usa el Diagnóstico 360.
//
// Usa fetch directo a la REST API de Supabase (PostgREST): no hace falta
// instalar ninguna librería nueva, alcanza con las dos variables de entorno
// de abajo.

async function traerTodasLasFilasSitioWeb() {
  const url = process.env.SUPABASE_SITIO_WEB_URL;
  const key = process.env.SUPABASE_SITIO_WEB_SERVICE_KEY;

  if (!url || !key) {
    throw new Error(
      'Faltan las variables de entorno SUPABASE_SITIO_WEB_URL / SUPABASE_SITIO_WEB_SERVICE_KEY en Vercel.'
    );
  }

  const endpoint =
    `${url.replace(/\/$/, '')}/rest/v1/sitio_web_diagnosticos` +
    `?select=*&order=creado_en.desc`;

  const resp = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      // Hasta 5000 filas en una sola página — de sobra para el volumen
      // actual. Si en el futuro se supera, hay que paginar con este mismo
      // header (Range: 5000-9999, etc.).
      Range: '0-4999',
    },
  });

  if (!resp.ok) {
    const texto = await resp.text().catch(() => '');
    throw new Error(`Supabase respondió ${resp.status}: ${texto.slice(0, 300)}`);
  }

  return resp.json();
}

module.exports = { traerTodasLasFilasSitioWeb };
