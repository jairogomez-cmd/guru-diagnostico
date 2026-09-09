// api/generate-pdf-sitio.js
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
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { html, filename, dominio, scoreGlobal, emailPrincipal, emailOpcional } = req.body || {};
  if (!html) { res.status(400).json({ error: 'Falta el campo "html"' }); return; }
  if (!emailPrincipal) { res.status(400).json({ error: 'Falta emailPrincipal' }); return; }

  let browser;
  try {
    // 1) Renderizar PDF
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' },
    });
    await browser.close();
    browser = null;

    const nombreArchivo = filename || `auditoria-${(dominio || 'sitio').replace(/[^a-z0-9.-]/gi, '-')}.pdf`;

    // 2) Enviar por correo — mismo patrón SMTP que el endpoint de Diagnóstico 360
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('SMTP no configurado (faltan variables de entorno) — se omite el envío de correo.');
    } else {
      const nodemailer = require('nodemailer');
      const port = Number(process.env.SMTP_PORT || 465);
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465, // true (SSL) para 465, false (STARTTLS) para 587
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });

      const destinatarios = [emailPrincipal];
      if (emailOpcional) destinatarios.push(emailOpcional);

      await transporter.sendMail({
        from: `"Guru Soluciones" <${process.env.SMTP_USER}>`,
        to: destinatarios.join(', '),
        subject: `📊 Informe Técnico y Diagnóstico Web para ${dominio || 'tu sitio'} - Gurú Soluciones`,
        html: `<p>Hola,</p><p>Adjunto el informe de auditoría técnica del sitio <strong>${dominio || ''}</strong>.</p><p>Puntuación global: <strong>${scoreGlobal != null ? scoreGlobal : '—'}/100</strong>.</p><p>Equipo Gurú Soluciones</p>`,
        attachments: [{ filename: nombreArchivo, content: pdfBuffer, contentType: 'application/pdf' }],
      });
    }

    // 3) Responder a n8n (después de que el correo ya se mandó)
    res.status(200).json({
      success: true,
      filename: nombreArchivo,
      emailEnviado: true,
    });
  } catch (err) {
    console.error('Error generando/enviando el informe:', err);
    res.status(500).json({ error: err.message || 'Error generando o enviando el informe', stack: err.stack });
  } finally {
    if (browser) { try { await browser.close(); } catch (e) { /* ignorar */ } }
  }
}

module.exports = handler;
module.exports.config = { maxDuration: 60 };
