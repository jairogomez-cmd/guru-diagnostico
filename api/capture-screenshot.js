// api/capture-screenshot.js
// Toma una captura real del home del sitio analizado (para la portada del
// PDF) Y, de paso, devuelve el HTML YA RENDERIZADO por el navegador —
// después de que su JavaScript corrió — para que n8n pueda buscar ahí los
// enlaces del menú/footer en sitios que arman su navegación con JS (donde
// el HTML crudo sin ejecutar no trae esos enlaces).
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

    // HTML después de ejecutar JavaScript (esto es lo nuevo)
    const htmlRenderizado = await page.content();

    const buffer = await page.screenshot({ type: 'jpeg', quality: 70 });
    await browser.close();
    browser = null;

    res.status(200).json({
      success: true,
      screenshotBase64: `data:image/jpeg;base64,${buffer.toString('base64')}`,
      htmlRenderizado,
    });
  } catch (err) {
    if (browser) { try { await browser.close(); } catch (e) {} }
    // No es un error fatal: el PDF se genera igual, solo sin la maqueta
    // ni el HTML renderizado (el rastreador cae de vuelta al HTML crudo).
    res.status(200).json({ success: false, error: err.message || 'No se pudo capturar el sitio' });
  }
};

module.exports.config = { maxDuration: 30 };
