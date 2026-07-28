// Vercel Serverless Function: Payriff Webhook / Callback Handler
// Docs: https://docs.payriff.com
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Service Client using Service Role Key or standard key
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://syndpkmvhugghkixxsqo.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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

  // Payriff can trigger GET or POST callbacks
  try {
    const payload = req.method === 'POST' ? req.body : req.query;
    console.log('Payriff webhook callback payload:', payload);

    // Payriff sends payload with orderId / transactionId and paymentStatus ('APPROVED', 'SUCCESS', etc.)
    const orderId = payload.orderId || payload.order_id || payload.payload?.orderId;
    const transactionId = payload.transactionId || payload.payload?.transactionId || `TR_${Date.now()}`;
    const status = payload.paymentStatus || payload.status || payload.code;

    if (!orderId) {
      return res.status(400).json({ error: 'orderId missing in callback payload' });
    }

    // Determine if payment was successful (Payriff status code '00000' or 'APPROVED' or 'SUCCESS')
    const isSuccess = 
      status === '00000' || 
      status === 'APPROVED' || 
      status === 'SUCCESS' || 
      payload.payment_status === 'success' ||
      payload.simulated === 'true';

    const newOrderStatus = isSuccess ? 'approved' : 'rejected';

    // Update order status in Supabase database automatically
    const { data: updatedOrder, error: updateErr } = await supabaseAdmin
      .from('orders')
      .update({
        status: newOrderStatus,
        payriff_transaction_id: transactionId
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateErr) {
      console.error('Supabase status update error via Payriff webhook:', updateErr);
      return res.status(500).json({ error: updateErr.message });
    }

    return res.status(200).json({
      success: true,
      message: `Order #${orderId} status updated to ${newOrderStatus}`,
      order: updatedOrder
    });
  } catch (error) {
    console.error('Payriff webhook handler error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
