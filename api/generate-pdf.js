const { generateReportHtml } = require('../lib/generateReportHtml');

async function getBrowser() {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    const chromium = (await import('@sparticuz/chromium')).default;
    const puppeteer = (await import('puppeteer-core')).default;
    return puppeteer.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }
  const puppeteer = (await import('puppeteer')).default;
  return puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const diagnostico = req.body;
  if (!diagnostico || !diagnostico.empresa) {
    res.status(400).json({ error: 'Falta el campo "empresa" en el payload' });
    return;
  }

  let browser;
  try {
    browser = await getBrowser();
    const html = generateReportHtml(diagnostico);

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '26px', bottom: '40px', left: '0px', right: '0px' },
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: `
        <div style="position:relative; width:100%; box-sizing:border-box; padding:0 40px; font-family:Arial,Helvetica,sans-serif; font-size:8.5px; color:#94A3B8;">
          <div style="text-align:center; padding-top:8px;">
            Guru Diagnóstico Digital &middot; Página <span class="pageNumber"></span> de <span class="totalPages"></span>
          </div>
          <img src="https://guru-diagnostico.vercel.app/logo-guru.png" style="position:absolute; top:2px; right:40px; height:13px; width:auto; opacity:.65;" />
        </div>`,
    });

    const slug = (diagnostico.empresa || 'diagnostico')
      .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Content-Disposition', `inline; filename="diagnostico-${slug}.pdf"`);
    res.end(pdfBuffer);
  } catch (err) {
    console.error('Error generando PDF:', err);
    res.status(500).json({ error: 'No se pudo generar el PDF', detalle: err.message, stack: err.stack });
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = handler;
module.exports.config = { maxDuration: 60 };
