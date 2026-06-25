import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { paymentIntentId } = req.body;
    
    // Captura o valor diretamente pelo ID do Payment Intent
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
    
    res.status(200).json({ success: true, paymentIntent });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}