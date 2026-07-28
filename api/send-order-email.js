// Vercel Serverless Function: Send Order Receipt Email via Resend API
// Docs: https://resend.com/docs

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderId, userEmail, userName, items, totalPrice, paymentMethod, orderDate } = req.body;

    if (!userEmail || !orderId) {
      return res.status(400).json({ error: 'orderId and userEmail are required' });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    // Items list HTML formatting
    const itemsHtml = Array.isArray(items) ? items.map(item => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px; color: #1e293b; font-weight: 600;">${item.name || 'Komponent'}</td>
        <td style="padding: 10px; color: #64748b; text-align: center;">${item.quantity || 1} ədəd</td>
        <td style="padding: 10px; color: #2563eb; font-weight: 700; text-align: right;">${item.price || 0} AZN</td>
      </tr>
    `).join('') : '';

    // Clean HTML Receipt Email Template
    const emailHtmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Sifariş Təsdiqi - PC Builder</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <!-- Header Banner -->
          <div style="background: linear-gradient(135deg, #0f172a, #1e293b); padding: 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 22px; color: #00f0ff;">PC Builder - Sifarişiniz Təsdiqləndi! 🎉</h1>
            <p style="margin: 6px 0 0 0; font-size: 14px; color: #94a3b8;">Təşəkkür edirik! Ödənişiniz alındı və sifarişiniz icra olunur.</p>
          </div>

          <!-- Order Summary Details -->
          <div style="padding: 24px;">
            <p style="font-size: 15px; color: #334155; margin-top: 0;">Hörmətli <strong>${userName || 'Müştəri'}</strong>,</p>
            <p style="font-size: 14px; color: #64748b; line-height: 1.5;">
              Sizin <strong>#${orderId.substring(0, 8)}</strong> nömrəli sifarişiniz inzibatçı tərəfindən uğurla təsdiqləndi. Sifarişin detalları aşağıdadır:
            </p>

            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8fafc; border-radius: 8px; overflow: hidden;">
              <thead>
                <tr style="background: #e2e8f0; color: #475569; font-size: 12px; text-transform: uppercase;">
                  <th style="padding: 10px; text-align: left;">Məhsul</th>
                  <th style="padding: 10px; text-align: center;">Say</th>
                  <th style="padding: 10px; text-align: right;">Qiymət</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; border-radius: 8px; display: flex; justify-content: space-between; margin-bottom: 20px;">
              <span style="font-weight: 700; color: #1e3a8a;">Ödənilmiş Yekun Məbləğ:</span>
              <span style="font-weight: 800; color: #2563eb; font-size: 18px;">${totalPrice} AZN</span>
            </div>

            <p style="font-size: 13px; color: #94a3b8; text-align: center; margin-bottom: 0;">
              Ödəniş Üsulu: <strong>${paymentMethod === 'payriff' ? '💳 Payriff Kart' : '🏦 Bank Transfer'}</strong> | Tarix: ${orderDate || new Date().toLocaleDateString('az-AZ')}
            </p>
          </div>

          <!-- Footer -->
          <div style="background: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0;">Suallarınız üçün saytdakı <strong>Canlı Dəstək</strong> bölməsindən yaza bilərsiniz.</p>
            <p style="margin: 4px 0 0 0; font-weight: 600;">© 2026 PC Builder MMC. Bütün hüquqlar qorunur.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Sandbox fallback if RESEND_API_KEY is not set yet in .env
    if (!RESEND_API_KEY || RESEND_API_KEY.includes('test_key')) {
      console.log(`[Resend Sandbox Test]: Email simulated for ${userEmail} (Order #${orderId})`);
      return res.status(200).json({
        success: true,
        simulated: true,
        message: `Email simulation successful for ${userEmail}. Add real RESEND_API_KEY to .env for real delivery.`,
        id: `resend_sim_${Date.now()}`
      });
    }

    // Real Resend.com REST API Call
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'PC Builder <onboarding@resend.dev>', // or custom verified domain
        to: [userEmail],
        subject: `Sifariş Təsdiq Edildi! - #${orderId.substring(0, 8)}`,
        html: emailHtmlContent
      })
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      return res.status(500).json({
        error: resendData.message || 'Resend email dispatch failed',
        details: resendData
      });
    }

    return res.status(200).json({
      success: true,
      id: resendData.id,
      message: 'Email sent successfully via Resend'
    });
  } catch (error) {
    console.error('Send email serverless function error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
