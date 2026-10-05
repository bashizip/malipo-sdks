# Malipo Node.js SDK

The official Node.js library for the [Malipo Payment Gateway](https://malipo.dev). Securely accept Mobile Money payments (Vodacom M-Pesa, Orange Money, Airtel Money) in the DRC with a single integration.

[![npm version](https://img.shields.io/npm/v/malipo-node.svg)](https://www.npmjs.com/package/malipo-node)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Table of Contents

- [Installation](#installation)
- [Initialization](#initialization)
- [Core Concepts](#core-concepts)
  - [Environments](#environments)
  - [Idempotency](#idempotency)
- [Charges (Direct API)](#charges-direct-api)
- [Refunds](#refunds)
- [Hosted Checkout](#hosted-checkout)
- [Transaction Status](#transaction-status)
- [Balances](#balances)
- [B2C disbursements](#b2c-disbursements)
- [Webhooks](#webhooks)
- [Error Handling](#error-handling)
- [TypeScript Support](#typescript-support)

---

## Installation

```bash
npm install malipo-node
# or
yarn add malipo-node
```

## Initialization

Initialize the client with your secret API key. You can find your keys in the [Malipo Dashboard](https://malipo.dev/api-keys).

```javascript
import { Malipo } from 'malipo-node';

const malipo = new Malipo({
  apiKey: process.env.MALIPO_API_KEY // Your standard Malipo server API key
});
```

### Configuration Options

| Option | Type | Description |
| :--- | :--- | :--- |
| `apiKey` | `string` | **Required.** Your Malipo secret key (`sk_test_...` or `sk_live_...`). |
| `environment` | `string` | `sandbox` or `live`. Auto-detected from the API key prefix by default. |
| `baseUrl` | `string` | Optional. Override the API base URL (default: `https://api.malipo.dev/v1`). |

---

## Core Concepts

### Environments
Malipo provides two environments:
- **Sandbox**: For testing. No real money is moved. Use `sk_test_` keys.
- **Live**: For production. Real money transactions. Use `sk_live_` keys.

The SDK automatically detects the environment based on your API key.

### Idempotency
To prevent duplicate charges or refunds in case of network retries, Malipo supports **Idempotency**.
- **Mandatory for Live**: You *must* provide an `idempotencyKey` for all live charge and refund requests.
- **Recommended for Sandbox**: Good practice for testing your retry logic.

---

## Charges (Direct API)

Create a direct Mobile Money charge. This triggers a USSD push (STK Push) on the customer's phone.

```javascript
const charge = await malipo.charges.create({
  amount: 50.0,
  currency: 'USD',
  phone: '243810000000',
  network: 'VODACOM_MPESA',
  description: 'Payment for Order #789',
  metadata: { internal_id: '789' },
  payer: {
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane.doe@example.com'
  }
}, {
  idempotencyKey: 'order_789_unique_key'
});

console.log(`Charge ID: ${charge.id}`);
console.log(`Status: ${charge.status}`); // usually 'pending'
```

### Parameters (`ChargeCreateParams`)

- `amount` (Number): The amount to charge.
- `currency` (String): `USD` or `CDF`.
- `phone` (String): Customer phone in DRC format (e.g., `243...`).
- `network` (String): `VODACOM_MPESA`, `ORANGE_MONEY`, or `AIRTEL_MONEY`.
- `description` (String, optional): Description for the transaction.
- `metadata` (Object, optional): Custom key-value pairs.
- `payer` (Object, optional): `first_name`, `last_name`, `email`.

---

## Refunds

Refund a previously successful transaction.

```javascript
const refund = await malipo.refunds.create({
  charge_id: 'ch_123abc',
  amount: 20.0, // Partial refund (optional)
  reason: 'Customer requested cancellation'
}, {
  idempotencyKey: 'refund_order_789'
});

console.log(`Refund Status: ${refund.status}`);
```

---

## Hosted Checkout

Redirect customers to a secure, Malipo-hosted payment page. This is the easiest way to support all networks with zero UI work.

```javascript
const session = await malipo.checkoutSessions.create({
  amount: 25.0,
  currency: 'USD',
  description: 'Premium Membership',
  redirect_url: 'https://mysite.com/success',
  metadata: { user_id: '456' }
});

// Redirect the user to this URL
console.log(`Pay here: ${session.url}`);
```

---

## Transaction Status

Retrieve the latest status of any charge or refund.

```javascript
const transaction = await malipo.transactions.retrieve('ch_123abc');

if (transaction.status === 'succeeded') {
  console.log('Payment completed!');
  console.log('Settlement:', transaction.settlement_amount, transaction.settlement_currency);
}
```

---

## Balances

Retrieve your available and pending balances for the current environment.

```javascript
const balance = await malipo.balance.retrieve();

balance.available.forEach(bal => {
  console.log(`Available: ${bal.amount} ${bal.currency}`);
});
```

---

## Webhooks

Malipo sends webhooks for asynchronous events. Use the SDK to verify the signature and ensure the request came from Malipo.

```javascript
// Express Example
app.post('/webhooks/malipo', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.header('x-webhook-signature');
  const timestamp = req.header('x-webhook-timestamp');
  const secret = process.env.MALIPO_WEBHOOK_SECRET;

  try {
    const event = malipo.webhooks.constructEvent(
      req.body.toString(), 
      signature, 
      secret,
      timestamp // Validates signature and replay window (5 mins)
    );

    switch (event.type) {
      case 'charge.succeeded':
        const charge = event.data.object;
        // Fulfill the order
        break;
      case 'refund.succeeded':
        // Handle successful refund
        break;
    }

    res.sendStatus(200);
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});
```

---

## Error Handling

The SDK throws `MalipoError` for API failures.

```javascript
try {
  await malipo.charges.create({ ... });
} catch (error) {
  if (error instanceof MalipoError) {
    console.error('API Error:', error.message);
    console.error('Status:', error.status); // HTTP Status Code
    console.error('Code:', error.code);     // Malipo Error Code (e.g., 'insufficient_funds')
  } else {
    console.error('Generic Error:', error.message);
  }
}
```

---

## TypeScript Support

The SDK is written in TypeScript and includes full type definitions.

```typescript
import { Malipo, ChargeCreateParams, MalipoTransaction } from 'malipo-node';

const params: ChargeCreateParams = {
  amount: 10,
  currency: 'USD',
  phone: '243810000000',
  network: 'VODACOM_MPESA'
};

const result: MalipoTransaction = await malipo.charges.create(params);
```

---

## License

MIT © [Malipo Team](https://malipo.dev)


## B2C disbursements

Version `1.3.0-beta.1` is published on npm. Install it with `npm install malipo-node@1.3.0-beta.1`. The production API is `https://api.malipo.dev/v1` (the SDK default). B2C is available in sandbox; live B2C remains disabled. Use your standard merchant API key through `MALIPO_API_KEY`, with the B2C write permission enabled and the `sk_test_` prefix for sandbox. The same key authenticates payments, balances, beneficiaries and disbursements. User wallets remain the responsibility of your backend; Malipo reserves the merchant's available USD balance.

```js
const beneficiary = await malipo.beneficiaries.create({
  reference: 'customer-123', name: 'Sandbox recipient',
  network: 'ORANGE_MONEY', msisdn: '243840000001',
});
await malipo.testing.approveBeneficiary(beneficiary.id);
const payout = await malipo.disbursements.create({
  beneficiary_id: beneficiary.id, amount: '20.00', currency: 'USD',
  reference: 'withdrawal-123',
}, { idempotencyKey: 'withdrawal-123' });
```

Persist the reference, idempotency key and complete input in your application before submitting. Both sandbox and live disbursement creation require the key. After a lost response, retrieve by reference or replay exactly the same request and key. Never generate a new withdrawal reference just because the HTTP response was lost. Divergent replays return `409`.

```js
const page = await malipo.disbursements.list({ reference: 'withdrawal-123' });
const recovered = page.data[0];
```

`beneficiaries.update(id, changes)` creates a version requiring approval; changes activate 24 UTC hours after approval. Owner identity/residence verification is recorded per version in live, and each version exposes both verification statuses. Numbers are masked in responses. `disbursements.cancel(id)` succeeds only before worker pickup.

`testing.*` is rejected for live keys. Sandbox helpers include `release`, `setDefaultScenario`, `run`, `advanceTime`, `screenMerchant`, `screenBeneficiary`, `reviewBeneficiary`, `holdBeneficiary`, `holdMerchant`, `holdDisbursement`, `result`, `resolve` and `replayWebhook`. Configure scenarios before creating a payout. A timeout retains reserved funds until a certain result or a resolution supported by proof.

Run the [funding and late-confirmation example](../samples/node/b2c.mjs) from the repository after building the SDK. Set `MALIPO_API_KEY` to your sandbox API key with B2C writes enabled; the example uses the production API domain by default. An optional `MALIPO_API_BASE_URL` overrides the API endpoint. `npm run test:package` instead checks the packed SDK in a disposable offline project against a local HTTP fixture; it does not validate the public API.

B2C webhooks use `payout.*`, `data.object.payout_kind === 'b2c'`, environment, test key ID and client reference. Verify the raw payload and required timestamp with `webhooks.constructEvent`, and atomically deduplicate `event.id` with your own wallet bookkeeping. Events may arrive repeatedly or out of order; reconcile using `disbursements.retrieve(id)` and do not regress a terminal wallet operation when an older event arrives.

### Public staging acceptance / Recette publique staging

Use an **exclusive synthetic sandbox key** with B2C writes enabled and no pending funds. Do not use a key with concurrent activity. The command creates a USD 30 simulated charge, releases funds, creates a beneficiary and a USD 20 simulated disbursement, checks replay/conflict and timeout/late confirmation, then restores the default success scenario. It leaves these test records for reconciliation. Customer wallets remain managed by the merchant.

```sh
# Set MALIPO_API_KEY through your local secret environment; never commit it.
# MALIPO_B2C_BASE_URL must be exactly https://api-staging.malipo.dev/v1 if set.
# Optional: MALIPO_B2C_RECEIPT_PATH chooses a new receipt filename.
npm run test:b2c:staging
```

The runner builds, packs and installs the actual candidate tarball in a temporary offline project. It accepts only the exact staging origin and a sandbox key, refuses HTTP redirects, bounds requests and writes a receipt containing SDK version/integrity, assertions and USD balances in minor units. It omits keys, names and phone numbers. Existing receipts are never overwritten. A failed run can leave sandbox records or an uncertain operation: inspect the dedicated key before retrying; do not treat a failed run as evidence of acceptance.

FR : cette commande effectue uniquement une recette sandbox. Une clé dédiée est requise ; les données de test sont conservées. Le reçu ne valide ni la réception des webhooks, ni l’isolation entre deux clés, ni un paiement opérateur réel. Ces contrôles restent des étapes de recette distinctes.

`npm run test:acceptance` validates the runner locally against an SDK HTTP fixture, including servers that double-debit or release uncertain funds. It does not contact staging. `npm run test:package` checks tarball installation and ESM/CJS compatibility independently.

### Received-webhook acceptance

`npm run test:webhooks` checks the acceptance receiver with Node.js 24 and the built SDK. The receiver requires both signature headers, verifies the original bytes with `webhooks.constructEvent`, rejects live/other-key events, reconciles each new event with the API and records event IDs plus one terminal bookkeeping effect in a local SQLite transaction. It retains deduplication across restarts. The SQLite file belongs to the test merchant consumer; Malipo does not create customer wallets.

The reusable test harness is `scripts/b2c-webhook-receiver.mjs`. For integrated acceptance, expose only its `/webhook` POST over a controlled HTTPS test tunnel, register a temporary endpoint for the dedicated sandbox merchant, replay `payout.*` using `testing.replayWebhook`, then disable the endpoint and stop the tunnel. `/health` exposes no receipts; the SQLite file and signing secret must remain outside Git. Verify actual delivery logs against received IDs, and confirm that old events and duplicates do not change the merchant balance or apply another consumer effect. An endpoint replay retains the original event ID while using a fresh signing timestamp.

FR : le récepteur est un outil de recette Node.js 24. Il vérifie le corps brut et l’horodatage, conserve la déduplication sur disque et consulte le statut canonique avant toute comptabilisation de test. Ce stockage appartient au consommateur marchand. Après recette, désactiver l’endpoint temporaire et arrêter le tunnel ; ne publier ni le secret ni la base SQLite.

To accept the exact release tarball without rebuilding it, set `MALIPO_B2C_SDK_TARBALL` to its absolute path when running `test:b2c:staging`. The runner verifies the package name/version and records its SHA-512 integrity before sandbox requests. Do not run builds concurrently against the same SDK directory.
