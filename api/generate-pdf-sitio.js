// api/generate-pdf-sitio.js
// Mismo patrón que tu endpoint de Diagnóstico 360: recibe HTML desde n8n,
// lo renderiza a PDF con Puppeteer + @sparticuz/chromium, y envía el
// correo con el PDF adjunto usando el mismo SMTP de Hostinger. Todo en
// una sola llamada, para no tener que configurar un credential de email
// nuevo en n8n.
//
// IMPORTANTE (gotcha ya documentado en el proyecto): en Vercel, las
// funciones serverless se cortan apenas se llama a res.status().json().
// Por eso el envío del correo se hace y se espera (await) ANTES de
// responder, nunca después ni en paralelo.
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
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
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 794, height: 1123 },
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
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

    // 2) Enviar por correo (misma config SMTP que ya usas — reemplaza
    // las variables de entorno por las que ya tengas configuradas en
    // Vercel para el otro endpoint, si tienen nombres distintos).
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.hostinger.com',
      port: Number(process.env.SMTP_PORT || 465),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const destinatarios = [emailPrincipal];
    if (emailOpcional) destinatarios.push(emailOpcional);

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: destinatarios.join(', '),
      subject: `📊 Informe Técnico y Diagnóstico Web para ${dominio || 'tu sitio'} - Gurú Soluciones`,
      html: `<p>Hola,</p><p>Adjunto el informe de auditoría técnica del sitio <strong>${dominio || ''}</strong>.</p><p>Puntuación global: <strong>${scoreGlobal != null ? scoreGlobal : '—'}/100</strong>.</p><p>Equipo Gurú Soluciones</p>`,
      attachments: [{ filename: nombreArchivo, content: pdfBuffer }],
    });

    // 3) Responder a n8n (solo después de que el correo ya se envió)
    res.status(200).json({
      success: true,
      filename: nombreArchivo,
      emailEnviado: true,
      destinatarios,
    });
  } catch (err) {
    if (browser) { try { await browser.close(); } catch (e) { /* ignorar */ } }
    res.status(500).json({ error: err.message || 'Error generando o enviando el informe' });
  }
};
