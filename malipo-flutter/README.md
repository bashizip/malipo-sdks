# Malipo Flutter SDK

The official Flutter/Dart SDK for the Malipo Payment Gateway. Securely accept Mobile Money payments (Vodacom MPesa, Orange Money, Airtel Money) in the DRC directly from your Flutter apps.

## Installation

Add `malipo` to your `pubspec.yaml` dependencies:

```yaml
dependencies:
  malipo: ^1.1.0
```

Or run this command:

```bash
flutter pub add malipo
```

## Quick Start

```dart
import 'package:malipo/malipo.dart';

void main() async {
  // Initialize the SDK with your API key
  final malipo = Malipo(apiKey: 'sk_test_your_api_key');

  print('Initiating charge...');
  try {
    // Create a charge
    final charge = await malipo.charges.create(
      ChargeCreateParams(
        amount: 10.0,
        currency: 'USD',
        phone: '+243810000000',
        network: MalipoNetwork.vodacomMpesa,
        description: 'Order #123',
        payer: MalipoPayer(
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
        ),
      ),
      // Optional: Add idempotency key to prevent duplicate charges
      idempotencyKey: 'unique_order_id_123', 
    );

    print('Charge ID: ${charge.id}');
    print('Status: ${charge.status.value}');
  } on MalipoException catch (e) {
    print('API Error: ${e.message}');
    print('Error Code: ${e.errorCode}');
  } catch (e) {
    print('Unknown error: $e');
  } finally {
    // Close the HTTP client when done
    malipo.close();
  }
}
```

## Features

### 🔐 Idempotency
Protect against duplicate charges by providing an `idempotencyKey` to `charges.create()`. If the request is retried with the same key, the SDK will return the original transaction record without initiating a new payment.

### 🔄 Environment Detection
The SDK automatically switches between `sandbox` and `live` environments based on your API key prefix (`sk_test_` vs `sk_live_`). You can also manually override it during initialization.

### 📊 Check Balance
Retrieve your available and pending balances for the current environment.

```dart
try {
  final balance = await malipo.balance.retrieve();
  print('Available: ${balance.available.first.amount} ${balance.available.first.currency}');
} catch (e) {
  print('Failed to retrieve balance: $e');
}
```

### 🔍 Transaction Status
Retrieve the latest status of any transaction.

```dart
final transaction = await malipo.transactions.retrieve("tx_123");
print('Latest status: ${transaction.status.value}');
```

### 💸 Refunds
Refund a previously successful transaction.

```dart
final refund = await malipo.refunds.create(
  RefundCreateParams(
    chargeId: 'tx_123',
    amount: 5.0, // Partial refund, or omit for full refund
    reason: 'Customer return',
  ),
  idempotencyKey: 'refund_order_123',
);

print('Refund status: ${refund.status.value}');
```

### 🔗 Hosted Checkout
Create a checkout session to redirect your customer to a Malipo-hosted payment page.

```dart
final session = await malipo.checkoutSessions.create(
  CheckoutSessionCreateParams(
    amount: 25.0,
    currency: 'USD',
    description: 'Pro Subscription',
    redirectUrl: 'https://your-site.com/success',
  ),
);

// Redirect the user to this URL using a package like url_launcher
print('Checkout URL: ${session.url}');
```

## Error Handling

All API errors are wrapped in a `MalipoException` which contains the HTTP status code, error code, and detailed messages.

```dart
try {
  await malipo.charges.create(params);
} on MalipoException catch (e) {
  print(e.message);     // Human-readable error
  print(e.statusCode);  // e.g. 400, 500
  print(e.errorCode);   // e.g. "invalid_amount"
  print(e.details);     // Full error payload
}
```

## License

MIT
