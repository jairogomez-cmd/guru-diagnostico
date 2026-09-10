// api/analyze-images.js
// Descarga hasta 8 imágenes de verdad y las recomprime con sharp para
// calcular cuánto pesarían optimizadas — esto es lo que no se puede
// hacer dentro de n8n (su sandbox no tiene librerías de imágenes).
const sharp = require('sharp');

async function descargarImagen(url) {
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GuruDiagnosticoBot/1.0; +https://gurusoluciones.com)' },
  });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  const arrayBuffer = await resp.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { imagenes } = req.body || {};
  if (!Array.isArray(imagenes) || imagenes.length === 0) {
    res.status(400).json({ error: 'Falta el arreglo "imagenes"' });
    return;
  }

  const lote = imagenes.slice(0, 8);

  const resultados = await Promise.all(lote.map(async (img) => {
    try {
      const buffer = await descargarImagen(img.url);
      const tamanoOriginal = buffer.length;

      // Recomprime a WebP calidad 75 (un estándar razonable de "optimizado")
      const optimizada = await sharp(buffer)
        .resize({ width: 1600, withoutEnlargement: true })
        .webp({ quality: 75 })
        .toBuffer();
      const tamanoOptimizado = optimizada.length;

      // Miniatura chiquita para mostrar en el PDF (no la imagen completa)
      const miniatura = await sharp(buffer)
        .resize({ width: 100, height: 100, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 55 })
        .toBuffer();

      const ahorroPct = tamanoOriginal > 0
        ? Math.max(0, Math.round((1 - tamanoOptimizado / tamanoOriginal) * 100))
        : 0;

      return {
        url: img.url,
        tamanoOriginal,
        tamanoOptimizado,
        ahorroPct,
        miniaturaBase64: `data:image/webp;base64,${miniatura.toString('base64')}`,
        error: null,
      };
    } catch (err) {
      return {
        url: img.url,
        tamanoOriginal: img.tamanoOriginalBytes || null,
        tamanoOptimizado: null,
        ahorroPct: null,
        miniaturaBase64: null,
        error: err.message || 'Error desconocido procesando la imagen',
      };
    }
  }));

  res.status(200).json({ resultados });
};

module.exports.config = { maxDuration: 60 };
