// Autenticación del dashboard interno: usuario/clave compartidos (no por
// persona), con una sesión firmada criptográficamente — no un simple booleano
// escondido en el navegador. Aunque alguien le pida los datos a la API
// directamente (sin pasar por el login), sin este token firmado no recibe nada.
const crypto = require('crypto');

function getSecret() {
  // Si algún día se rota la clave del dashboard, conviene rotar también este
  // secreto (invalida todas las sesiones activas de un solo golpe).
  return process.env.DASHBOARD_SESSION_SECRET || 'guru-dashboard-secret-cambiar-en-vercel-2026';
}

function firmarToken(payload) {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json, 'utf8').toString('base64url');
  const firma = crypto.createHmac('sha256', getSecret()).update(b64).digest('base64url');
  return `${b64}.${firma}`;
}

function verificarToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const partes = token.split('.');
  if (partes.length !== 2) return null;
  const [b64, firma] = partes;
  const firmaEsperada = crypto.createHmac('sha256', getSecret()).update(b64).digest('base64url');
  const a = Buffer.from(firma);
  const b = Buffer.from(firmaEsperada);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) return null; // sesión vencida
    return payload;
  } catch (e) {
    return null;
  }
}

function leerCookie(req, nombre) {
  if (req.cookies && req.cookies[nombre]) return req.cookies[nombre];
  const header = req.headers && req.headers.cookie ? req.headers.cookie : '';
  const partes = header.split(';').map(s => s.trim());
  const encontrada = partes.find(s => s.startsWith(nombre + '='));
  if (!encontrada) return null;
  return decodeURIComponent(encontrada.split('=').slice(1).join('='));
}

function requiereSesionValida(req, res) {
  const token = leerCookie(req, 'guru_dash_session');
  const sesion = verificarToken(token);
  if (!sesion) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'Sesión inválida o vencida. Volvé a iniciar sesión.' }));
    return false;
  }
  return true;
}

module.exports = { firmarToken, verificarToken, leerCookie, requiereSesionValida };
