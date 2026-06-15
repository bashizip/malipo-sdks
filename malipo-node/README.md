# Malipo Node.js SDK

The official Node.js library for the Malipo Payment Gateway. Securely accept Mobile Money payments (Vodacom MPesa, Orange Money, Airtel Money) in the DRC.

## Installation

```bash
npm install malipo-node
# or
yarn add malipo-node
```

## Quick Start

```javascript
import { Malipo } from 'malipo-node';

const malipo = new Malipo({
  apiKey: 'sk_test_your_api_key'
});

// Create a charge
try {
  const charge = await malipo.charges.create({
    amount: 10,
    currency: 'USD',
    phone: '243810000000',
    network: 'VODACOM_MPESA',
    description: 'Order #123',
    payer: {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com'
    }
  }, {
    idempotencyKey: 'unique_order_id_123' // Highly recommended
  });

  console.log('Charge initiated:', charge.id);
  console.log('Status:', charge.status); // 'pending'
} catch (error) {
  console.error('Charge failed:', error.message);
}
```

## Features

### 🔐 Idempotency
Protect against duplicate charges by providing an `idempotencyKey` in the options. If the request is retried with the same key, the SDK will return the original transaction record.

### 🔄 Environment Detection
The SDK automatically switches between `sandbox` and `live` environments based on your API key prefix (`sk_test_` vs `sk_live_`).

### 📊 Balance Check
Check your available and pending balances for your current environment.

```javascript
const balance = await malipo.balance.retrieve();
console.log('Available USD:', balance.available[0].amount);
```

### 🔍 Transaction Status
Retrieve the latest status of any transaction.

```javascript
const transaction = await malipo.transactions.retrieve('tx_123');
console.log('Latest status:', transaction.status);
```

### 💸 Refunds
Refund a previously successful transaction.

```javascript
const refund = await malipo.refunds.create({
  charge_id: 'tx_123',
  amount: 5, // Partial refund, or omit for full refund
  reason: 'Customer return'
}, {
  idempotencyKey: 'refund_order_123'
});

console.log('Refund status:', refund.status);
```

### 🔗 Hosted Checkout
Create a checkout session to redirect your customer to a Malipo-hosted payment page.

```javascript
const session = await malipo.checkoutSessions.create({
  amount: 25,
  currency: 'USD',
  description: 'Pro Subscription',
  redirect_url: 'https://your-site.com/success',
  metadata: { order_id: '123' }
});

// Redirect the user to this URL
console.log('Checkout URL:', session.url);
```

## API Reference

### `new Malipo(config)`
- `apiKey`: (Required) Your Malipo secret key.
- `environment`: (Optional) `sandbox` or `live`. Auto-detected by default.
- `baseUrl`: (Optional) Override the default API base URL.

### `malipo.charges.create(params, options)`
- `amount`: Number.
- `currency`: String (`USD` or `CDF`).
- `phone`: String (DRC MSISDN format).
- `network`: `VODACOM_MPESA`, `ORANGE_MONEY`, or `AIRTEL_MONEY`.
- `description`: (Optional) String.
- `metadata`: (Optional) Object.
- `payer`: (Optional) Object with `first_name`, `last_name`, and `email`.
- `idempotencyKey`: (Optional) Unique string for request deduplication.

### `malipo.transactions.retrieve(id)`
- `id`: Transaction ID.

### `malipo.refunds.create(params, options)`
- `charge_id`: (Required) ID of the charge to refund.
- `amount`: (Optional) Amount to refund.
- `reason`: (Optional) Reason for refund.
- `metadata`: (Optional) Object.
- `idempotencyKey`: (Optional) Unique string for request deduplication.

### `malipo.checkoutSessions.create(params)`
- `amount`: (Required) Number.
- `currency`: (Required) `USD` or `CDF`.
- `description`: (Optional) String.
- `redirect_url`: (Optional) Success redirect URL.
- `expires_at`: (Optional) ISO Date string.
- `metadata`: (Optional) Object.

### `malipo.balance.retrieve()`
- Returns balance details for the current environment.

### `malipo.webhooks.constructEvent(payload, signature, secret)`
- `payload`: Raw string body of the request.
- `signature`: The `X-Webhook-Signature` header value.
- `secret`: Your webhook signing secret from the dashboard.
- **Returns**: A verified `MalipoEvent` object or throws an error if verification fails.

## Webhooks Example (Express)

```javascript
app.post('/webhooks/malipo', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.header('x-webhook-signature');

  try {
    const event = malipo.webhooks.constructEvent(
      req.body.toString(), 
      signature, 
      process.env.MALIPO_WEBHOOK_SECRET
    );

    if (event.type === 'charge.succeeded') {
      const charge = event.data.object;
      console.log(`Payment successful: ${charge.id}`);
    }

    res.sendStatus(200);
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});
```

## License
MIT
