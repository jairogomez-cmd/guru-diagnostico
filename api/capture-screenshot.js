// api/capture-screenshot.js
// Toma una captura real del home del sitio analizado, para la portada
// del PDF. Usa el mismo patrón de Puppeteer + @sparticuz/chromium que
// ya usa generate-pdf-sitio.js — sin paquetes nuevos que instalar.
async function getBrowser() {
  const chromium = (await import('@sparticuz/chromium')).default;
  const puppeteer = (await import('puppeteer-core')).default;
  return puppeteer.launch({
    args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 },
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { url } = req.body || {};
  if (!url) { res.status(400).json({ error: 'Falta el campo "url"' }); return; }

  let browser;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (compatible; GuruDiagnosticoBot/1.0; +https://gurusoluciones.com)');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    const buffer = await page.screenshot({ type: 'jpeg', quality: 70 });
    await browser.close();
    browser = null;

    res.status(200).json({
      success: true,
      screenshotBase64: `data:image/jpeg;base64,${buffer.toString('base64')}`,
    });
  } catch (err) {
    if (browser) { try { await browser.close(); } catch (e) {} }
    // No es un error fatal: el PDF se genera igual, solo sin la maqueta.
    res.status(200).json({ success: false, error: err.message || 'No se pudo capturar el screenshot' });
  }
};

module.exports.config = { maxDuration: 30 };
