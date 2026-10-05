// FR: après activation de la permission B2C sandbox dans le portail.
// EN: enable sandbox B2C writes in the portal before running this example.
// Build locally: npm --prefix malipo-sdks/malipo-node run build
import Malipo from '../../malipo-node/dist/index.js';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const apiKey = process.env.MALIPO_API_KEY ?? process.env.MALIPO_B2C_API_KEY;
if (!apiKey?.startsWith('sk_test_')) throw new Error('A sandbox MALIPO_API_KEY is required');
const client = new Malipo({ apiKey, baseUrl: process.env.MALIPO_API_BASE_URL ?? process.env.MALIPO_B2C_BASE_URL });
const run = randomUUID();
// Existing force-success sandbox phone. It is never sent to an operator.
let charge = await client.charges.create({ amount: 30, currency: 'USD', phone: '+243000000001', network: 'ORANGE_MONEY' }, { idempotencyKey: `b2c-funding-${run}` });
for (let attempt = 0; charge.status === 'pending' && attempt < 30; attempt++) {
  await delay(1000);
  charge = await client.transactions.retrieve(charge.id);
}
if (charge.status !== 'succeeded') throw new Error(`Funding charge ${charge.id}: ${charge.status}`);
await client.testing.release();
await client.testing.screenMerchant('cleared');
const beneficiary = await client.beneficiaries.create({ reference: `user-${run}`, name: 'Sandbox recipient', network: 'ORANGE_MONEY', msisdn: '243840000001' });
await client.testing.approveBeneficiary(beneficiary.id);
const params = { beneficiary_id: beneficiary.id, amount: '20.00', currency: 'USD', reference: `withdrawal-${run}` };
await client.testing.setDefaultScenario('timeout');
const payout = await client.disbursements.create(params, { idempotencyKey: `withdrawal-${run}` });
// Replay returns the same operation, not another debit.
const replay = await client.disbursements.create(params, { idempotencyKey: `withdrawal-${run}` });
if (replay.id !== payout.id) throw new Error('Replay returned a different operation');
await client.testing.run();
console.log(await client.disbursements.retrieve(payout.id)); // needs_review; funds remain reserved
await client.testing.result(payout.id, 'succeeded');
console.log(await client.disbursements.list({ reference: params.reference }));
console.log(await client.balance.retrieve());
// Webhook handler: preserve raw bytes, validate signature/timestamp, deduplicate event.id.
// const event = client.webhooks.constructEvent(rawBody, signature, secret, { timestamp });
// if (event.environment === 'sandbox' && event.type === 'payout.succeeded') { ... }
