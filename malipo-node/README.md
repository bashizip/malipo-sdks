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
  apiKey: 'sk_test_51Mz...' // Use your secret key
});
```

### Configuration Options

| Option | Type | Description |
| :--- | :--- | :--- |
| `apiKey` | `string` | **Required.** Your Malipo secret key (`sk_test_...` or `sk_live_...`). |
| `environment` | `string` | `sandbox` or `live`. Auto-detected from the API key prefix by default. |
| `baseUrl` | `string` | Optional. Override the API base URL (default: `https://api.malipo.dev`). |

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
