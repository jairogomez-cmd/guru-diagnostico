const { requiereSesionValida } = require('../lib/dashboardAuth');
const { traerTodasLasFilas } = require('../lib/dashboardData');

module.exports = async function handler(req, res) {
  if (!requiereSesionValida(req, res)) return; // ya respondió 401 adentro

  try {
    const filas = await traerTodasLasFilas();
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, data: filas }));
  } catch (e) {
    console.error('Error trayendo datos del dashboard:', e);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'Error interno consultando los datos.' }));
  }
};
