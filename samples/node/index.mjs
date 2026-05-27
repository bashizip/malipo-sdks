import { Malipo } from 'malipo-node';

const sampleConfig = {
  apiKey: process.env.MALIPO_API_KEY || 'sk_live_YOUR_API_KEY_HERE',
  idempotencyKey:
    process.env.MALIPO_IDEMPOTENCY_KEY || `node-sample-${Date.now()}`,
  charge: {
    amount: Number.parseFloat(process.env.MALIPO_AMOUNT || '3.00'),
    currency: process.env.MALIPO_CURRENCY || 'USD',
    phone: process.env.MALIPO_PHONE || '+243831386749',
    network: process.env.MALIPO_NETWORK || 'VODACOM_MPESA',
    description: process.env.MALIPO_DESCRIPTION || 'Node SDK sample charge',
    metadata: {
      source: 'node_sample',
      merchant_reference:
        process.env.MALIPO_MERCHANT_REFERENCE || 'node-sample-001',
    },
    payer: {
      first_name: process.env.MALIPO_PAYER_FIRST_NAME || 'John',
      last_name: process.env.MALIPO_PAYER_LAST_NAME || 'Doe',
      email: process.env.MALIPO_PAYER_EMAIL || 'john.doe@example.com',
    },
  },
};

function assertSampleIsConfigured() {
  if (!sampleConfig.apiKey || sampleConfig.apiKey.includes('YOUR_API_KEY')) {
    throw new Error('Set MALIPO_API_KEY before running the node sample.');
  }
}

async function main() {
  assertSampleIsConfigured();

  const malipo = new Malipo({ apiKey: sampleConfig.apiKey });

  console.log('Initiating charge...');

  const charge = await malipo.charges.create(sampleConfig.charge, {
    idempotencyKey: sampleConfig.idempotencyKey,
  });

  console.log('Charge initiated successfully!');
  console.log(`Charge ID: ${charge.id}`);
  console.log(`Status: ${charge.status}`);
}

main().catch((error) => {
  console.error('Charge failed:', error.message || error);
  process.exitCode = 1;
});
