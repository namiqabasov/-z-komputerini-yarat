// Vercel Serverless Function: Create Payriff Payment Order
// Docs: https://docs.payriff.com

export default async function handler(req, res) {
  // CORS & Method Check
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
    const { orderId, amount, description, userEmail, userName } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({ error: 'orderId and amount are required' });
    }

    // Environmental variables for Payriff (Sandbox / Production)
    const PAYRIFF_MERCHANT_SECRET = process.env.PAYRIFF_SECRET_KEY || 'sandbox_secret_key_test';
    const PAYRIFF_MERCHANT_ID = process.env.PAYRIFF_MERCHANT_ID || 'sandbox_merchant_id';
    const PAYRIFF_API_URL = process.env.PAYRIFF_API_URL || 'https://api.payriff.com/api/v2/createOrder';

    // Construct Payriff API request body according to Payriff docs (https://docs.payriff.com)
    const payriffPayload = {
      body: {
        amount: Number(amount),
        currencyType: 'AZN',
        description: description || `Sifariş #${orderId.substring(0, 8)} - PC Builder`,
        language: 'AZ',
        approveURL: `${req.headers.origin || 'https://z-komputerini-yarat.vercel.app'}?payment_status=success&order_id=${orderId}`,
        cancelURL: `${req.headers.origin || 'https://z-komputerini-yarat.vercel.app'}?payment_status=canceled&order_id=${orderId}`,
        declineURL: `${req.headers.origin || 'https://z-komputerini-yarat.vercel.app'}?payment_status=declined&order_id=${orderId}`
      },
      merchant: PAYRIFF_MERCHANT_ID
    };

    // If sandbox / test keys are active (real API key not provided yet), return simulated test payment session
    if (PAYRIFF_MERCHANT_SECRET.includes('sandbox') || PAYRIFF_MERCHANT_SECRET.includes('test')) {
      return res.status(200).json({
        code: '00000',
        message: 'Payriff Sandbox Order Created Successfully',
        payload: {
          orderId: `PAYRIFF_TEST_${Date.now()}`,
          paymentUrl: `${req.headers.origin || 'https://z-komputerini-yarat.vercel.app'}?payment_status=success&order_id=${orderId}&simulated=true`
        }
      });
    }

    // Call Real Payriff V2 API Endpoint
    const response = await fetch(PAYRIFF_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': PAYRIFF_MERCHANT_SECRET
      },
      body: JSON.stringify(payriffPayload)
    });

    const data = await response.json();

    if (!response.ok || data.code !== '00000') {
      return res.status(500).json({
        error: data.message || 'Payriff payment order creation failed',
        details: data
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Payriff create order serverless function error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
