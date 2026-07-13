const { generateReportHtml } = require('../lib/generateReportHtml');

async function getBrowser() {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    const chromium = require('@sparticuz/chromium');
    const puppeteer = require('puppeteer-core');
    return puppeteer.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }
  const puppeteer = require('puppeteer');
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
    const html = generateReportHtml(diagnostico);
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    const pdfBuffer = await page.pdf({
      format: 'A4', printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });

    const slug = (diagnostico.empresa || 'diagnostico')
      .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="diagnostico-${slug}.pdf"`);
    res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error('Error generando PDF:', err);
    res.status(500).json({ error: 'No se pudo generar el PDF', detalle: err.message });
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = handler;
module.exports.config = { maxDuration: 60 };
