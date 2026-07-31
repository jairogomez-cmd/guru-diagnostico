const { firmarToken } = require('../lib/dashboardAuth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: false, error: 'Método no permitido.' }));
  }

  const body = req.body || {};
  const usuario = (body.usuario || '').trim();
  const clave = body.clave || '';

  // Usuario/clave por defecto (los que ya definimos juntos). Para cambiarla
  // en el futuro: Vercel → Settings → Environment Variables → DASHBOARD_USER
  // y DASHBOARD_PASS → editar el valor → Redeploy. No hace falta tocar código.
  const USUARIO_VALIDO = process.env.DASHBOARD_USER || 'Administrador';
  const CLAVE_VALIDA = process.env.DASHBOARD_PASS || 'Diagnostico2026';

  if (usuario !== USUARIO_VALIDO || clave !== CLAVE_VALIDA) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: false, error: 'Usuario o contraseña incorrectos.' }));
  }

  const OCHO_HORAS_MS = 8 * 60 * 60 * 1000;
  const token = firmarToken({ exp: Date.now() + OCHO_HORAS_MS });

  res.setHeader(
    'Set-Cookie',
    `guru_dash_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${8 * 60 * 60}`
  );
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 200;
  res.end(JSON.stringify({ ok: true }));
};
