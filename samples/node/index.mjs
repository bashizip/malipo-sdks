import { Malipo } from 'malipo-node';

async function main() {
  // Replace with your actual API key, or set it in the environment
  const apiKey = process.env.MALIPO_API_KEY || 'sk_live_YOUR_API_KEY_HERE';
  
  const malipo = new Malipo({ apiKey });

  console.log('Initiating charge...');
  
  try {
    // Create a charge with the same parameters as the Java and Python samples
    const charge = await malipo.charges.create({
      amount: 10.0,
      currency: 'USD',
      phone: '+243858561278',
      network: 'ORANGE_MONEY',
      description: 'Order #123',
      payer: {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com'
      }
    }, {
      idempotencyKey: 'unique_order_id_124'
    });

    console.log('Charge initiated successfully!');
    console.log(`Charge ID: ${charge.id}`);
    console.log(`Status: ${charge.status}`);
  } catch (error) {
    console.error('Charge failed:', error.message || error);
  }
}

main();
