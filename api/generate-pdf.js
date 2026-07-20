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

// ══════════════════════════════════════════════════════════════
// ENVÍO DE CORREOS — al vendedor siempre, al cliente si cargó su email
// ══════════════════════════════════════════════════════════════
function wrapEmailHtml(bodyHtml) {
  const logoUrl = 'https://guru-diagnostico.vercel.app/logo-guru.png';
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F8F7FF;font-family:Arial,Helvetica,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F7FF;padding:32px 0;">
      <tr><td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 8px 30px rgba(109,40,217,.12);">
          <tr><td style="background:linear-gradient(135deg,#6D28D9,#8B5CF6);padding:22px 28px;">
            <img src="${logoUrl}" alt="Guru Soluciones" height="28" style="display:block;" />
          </td></tr>
          <tr><td style="padding:28px 32px;">${bodyHtml}</td></tr>
          <tr><td style="padding:16px 32px;background:#F8F7FF;font-size:11px;color:#9CA3AF;text-align:center;">
            Guru Soluciones &copy; ${new Date().getFullYear()} &middot; Diagnóstico automatizado de presencia digital
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

async function enviarCorreos(diagnostico, pdfBuffer, slug) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP no configurado (faltan variables de entorno) — se omite el envío de correos.');
    return;
  }
  const nodemailer = require('nodemailer');
  const port = Number(process.env.SMTP_PORT || 465);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // true (SSL) para el puerto 465, false (STARTTLS) para el 587
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const empresa = diagnostico.empresa || 'tu empresa';
  const score = diagnostico.scores?.global ?? '—';
  const nombreVendedor = diagnostico.nombreVendedor || 'Asesor Guru';
  const emailVendedor = diagnostico.emailVendedor || diagnostico.email_vendedor;
  const emailCliente = diagnostico.emailCliente || diagnostico.email_cliente;
  const attachments = [{ filename: `diagnostico-${slug}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }];

  const envios = [];

  if (emailCliente) {
    const bodyCliente = `
      <p style="font-size:15px;color:#1A1A2E;margin:0 0 14px;">Hola,</p>
      <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 14px;">
        Te compartimos el <strong>Diagnóstico de Presencia Digital de ${empresa}</strong> — un análisis completo de tu SEO local,
        tu posicionamiento, tu presencia en Inteligencia Artificial (ChatGPT, Gemini), publicidad, redes sociales y mucho más.
      </p>
      <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 14px;">
        Esta información es <strong style="color:#6D28D9;">oro puro</strong>: te muestra exactamente dónde estás parado hoy
        frente a tu competencia, y qué acciones concretas te van a ayudar a ganar más visibilidad, atraer más clientes y cerrar más ventas.
      </p>
      <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 20px;">
        Encontrás el informe completo adjunto en PDF. Tu asesor de Guru Soluciones va a contactarte pronto para revisarlo
        juntos y armar un plan de acción concreto.
      </p>
      <p style="font-size:13px;color:#6B7280;margin:0;">&mdash; ${nombreVendedor}, Guru Soluciones</p>
    `;
    envios.push(transporter.sendMail({
      from: `"Guru Soluciones" <${process.env.SMTP_USER}>`,
      to: emailCliente,
      subject: `📈 El diagnóstico digital de ${empresa} ya está listo`,
      html: wrapEmailHtml(bodyCliente),
      attachments,
    }));
  }

  if (emailVendedor) {
    const bodyVendedor = `
      <p style="font-size:15px;color:#1A1A2E;margin:0 0 14px;">Hola ${nombreVendedor},</p>
      <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 14px;">
        El diagnóstico de <strong>${empresa}</strong> se generó correctamente. Adjunto tenés una copia del PDF completo.
      </p>
      <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 14px;">
        ${emailCliente ? `También se envió una copia a <strong>${emailCliente}</strong>.` : 'No se cargó un email del cliente en el formulario, así que este envío quedó solo para vos.'}
      </p>
      <p style="font-size:14px;color:#374151;line-height:1.6;margin:0;">
        Score global: <strong style="color:#6D28D9;">${score}/100</strong> — usalo como punto de partida para la conversación con el cliente.
      </p>
    `;
    envios.push(transporter.sendMail({
      from: `"Guru Diagnóstico" <${process.env.SMTP_USER}>`,
      to: emailVendedor,
      subject: `✅ Diagnóstico de ${empresa} generado`,
      html: wrapEmailHtml(bodyVendedor),
      attachments,
    }));
  }

  console.log(`Preparando ${envios.length} correo(s) — cliente: ${emailCliente || '(no cargado)'} · vendedor: ${emailVendedor || '(no cargado)'}`);
  const resultados = await Promise.allSettled(envios);
  resultados.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      console.log(`Correo #${i + 1} enviado OK — messageId: ${r.value?.messageId}`);
    } else {
      console.error(`Error enviando correo #${i + 1}:`, r.reason?.message || r.reason);
    }
  });
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
      margin: { top: '26px', bottom: '66px', left: '0px', right: '0px' },
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: `
        <div style="position:relative; width:100%; box-sizing:border-box; padding:0 40px; font-family:Arial,Helvetica,sans-serif;">
          <div style="text-align:center; padding-top:16px; font-size:8.5px; color:#94A3B8;">
            Guru Diagnóstico Digital &middot; Página <span class="pageNumber"></span> de <span class="totalPages"></span>
          </div>
          <img src="data:image/png;base64,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" style="position:absolute; top:9px; right:40px; height:32px; width:auto; opacity:.9;" />
        </div>`,
    });

    const slug = (diagnostico.empresa || 'diagnostico')
      .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    // IMPORTANTE: los correos se mandan ANTES de responder al navegador, no después.
    // En una función serverless de Vercel no hay garantía de que el código posterior a
    // res.end() llegue a terminar de ejecutarse — el runtime puede cortar la ejecución
    // apenas la respuesta se considera "enviada". Por eso esperamos acá, dentro del
    // mismo ciclo de vida de la función, antes de cerrar la respuesta.
    console.log('Intentando enviar correos para:', diagnostico.empresa);
    try {
      await enviarCorreos(diagnostico, pdfBuffer, slug);
      console.log('Envío de correos finalizado sin excepciones.');
    } catch (emailErr) {
      // Un correo que falla nunca debe impedir que el vendedor reciba su PDF.
      console.error('Error en el envío de correos:', emailErr);
    }

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
