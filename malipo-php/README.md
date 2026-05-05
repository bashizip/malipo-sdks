# Malipo PHP SDK

The official PHP library for the Malipo Payment Gateway. Securely accept Mobile Money payments (Vodacom MPesa, Orange Money, Airtel Money) in the DRC.

## Installation

```bash
composer require malipo/malipo-php
```

## Quick Start

```php
use Malipo\Malipo;

$malipo = new Malipo('sk_test_your_api_key');

// Create a charge
try {
    $charge = $malipo->charges->create([
        "amount" => 10,
        "currency" => "USD",
        "phone" => "243810000000",
        "network" => "VODACOM_MPESA",
        "description" => "Order #123"
    ], [
        'idempotencyKey' => 'unique_order_id_123'
    ]);

    echo "Charge initiated: " . $charge['id'] . "\n";
    echo "Status: " . $charge['status'] . "\n"; // 'pending'
} catch (\Malipo\Exceptions\MalipoException $e) {
    echo "Charge failed: " . $e->getMessage() . "\n";
}
```

## Features

### 🔐 Idempotency
Protect against duplicate charges by providing an `idempotencyKey` in the options array.

### 🔄 Environment Detection
The SDK automatically switches between `sandbox` and `live` environments based on your API key prefix (`sk_test_` vs `sk_live_`).

### 📊 Balance Check
Check your available and pending balances for your current environment.

```php
$balance = $malipo->balance->retrieve();
print_r($balance['available']);
```

## Webhooks

```php
use Malipo\Malipo;

$malipo = new Malipo('...');

$payload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'];
$secret = 'whsec_your_secret';

try {
    $event = $malipo->webhooks->constructEvent($payload, $signature, $secret);
    
    if ($event['type'] === 'charge.succeeded') {
        $charge = $event['data']['object'];
        // Handle successful payment
    }
} catch (\Exception $e) {
    http_response_code(400);
    echo $e->getMessage();
}
```

## License
MIT
