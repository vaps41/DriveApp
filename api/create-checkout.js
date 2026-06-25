import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { amount, serviceName, orderId } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: { 
          currency: 'brl', 
          product_data: { name: serviceName }, 
          unit_amount: amount * 100 // Stripe recebe em cêntimos
        },
        quantity: 1,
      }],
      mode: 'payment',
      // O SEGREDO ESTÁ AQUI: Isso diz à Stripe para "Congelar" o valor, mas não cobrar
      payment_intent_data: { capture_method: 'manual' }, 
      
      // URLs de retorno para a sua aplicação
      success_url: `${req.headers.origin}?status=success&order_id=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}?status=cancelled&order_id=${orderId}`,
    });

    res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}