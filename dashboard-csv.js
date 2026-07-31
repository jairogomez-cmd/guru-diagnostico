const { requiereSesionValida } = require('../lib/dashboardAuth');
const { traerTodasLasFilas, armarCSV } = require('../lib/dashboardData');

module.exports = async function handler(req, res) {
  if (!requiereSesionValida(req, res)) return;

  try {
    const filas = await traerTodasLasFilas();
    const csv = armarCSV(filas);
    const fecha = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="guru-diagnosticos-${fecha}.csv"`);
    res.statusCode = 200;
    // BOM al inicio: sin esto, Excel abre los acentos rotos (ej. "CÃ³rdoba").
    res.end('\uFEFF' + csv);
  } catch (e) {
    console.error('Error generando el CSV del dashboard:', e);
    res.statusCode = 500;
    res.end('Error generando el archivo.');
  }
};
