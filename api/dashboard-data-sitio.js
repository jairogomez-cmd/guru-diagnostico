// Este dashboard NO requiere login — a diferencia del de Diagnóstico 360,
// entrar acá es libre, sin usuario ni contraseña (decisión explícita del
// proyecto: la consulta rápida por dominio tiene que ser de acceso directo).
const { traerTodasLasFilasSitioWeb } = require('../lib/dashboardDataSitioWeb');

module.exports = async function handler(req, res) {
  try {
    const filas = await traerTodasLasFilasSitioWeb();
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, data: filas }));
  } catch (e) {
    console.error('Error trayendo datos del dashboard (sitio web):', e);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'Error interno consultando los datos.' }));
  }
};
