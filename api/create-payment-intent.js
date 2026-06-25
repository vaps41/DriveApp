import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { amount, orderId } = req.body;

    // Cria a pré-autorização diretamente
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Stripe usa cêntimos
      currency: 'brl',
      capture_method: 'manual', // Mantém o valor retido até o prestador colocar o PIN
      metadata: { orderId }
    });

    // Devolve o "Segredo do Cliente", necessário para injetar o formulário no Frontend
    res.status(200).json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}