# Malipo Java SDK

The official Java library for the Malipo Payment Gateway. Securely accept Mobile Money payments (Vodacom MPesa, Orange Money, Airtel Money) in the DRC.

## Installation

### Maven
Add this dependency to your `pom.xml`:

```xml
<dependency>
    <groupId>com.malipo</groupId>
    <artifactId>malipo-java</artifactId>
    <version>1.0.0</version>
</dependency>
```

## Quick Start

```java
import com.malipo.Malipo;
import com.malipo.models.ChargeCreateParams;
import com.malipo.models.MalipoNetwork;
import com.malipo.models.MalipoTransaction;

public class Main {
    public static void main(String[] args) {
        Malipo malipo = new Malipo("sk_test_your_api_key");

        // Create a charge
        try {
            ChargeCreateParams params = ChargeCreateParams.builder()
                .amount(10.0)
                .currency("USD")
                .phone("243810000000")
                .network(MalipoNetwork.VODACOM_MPESA)
                .description("Order #123")
                .build();

            MalipoTransaction charge = malipo.charges.create(params, "unique_order_id_123");

            System.out.println("Charge initiated: " + charge.getId());
            System.out.println("Status: " + charge.getStatus()); // "pending"
        } catch (Exception e) {
            System.err.println("Charge failed: " + e.getMessage());
        }
    }
}
```

## Features

### 🔐 Idempotency
Protect against duplicate charges by providing an `idempotencyKey` as the second argument to `charges.create()`. If the request is retried with the same key, the SDK will return the original transaction record.

### 🔄 Environment Detection
The SDK automatically switches between `sandbox` and `live` environments based on your API key prefix (`sk_test_` vs `sk_live_`).

### 📊 Balance Check
Check your available and pending balances for your current environment.

```java
MalipoBalance balance = malipo.balance.retrieve();
System.out.println("Available USD: " + balance.getAvailable().get(0).getAmount());
```

### 🔍 Transaction Status
Retrieve the latest status of any transaction.

```java
MalipoTransaction transaction = malipo.transactions.retrieve("tx_123");
System.out.println("Latest status: " + transaction.getStatus());
```

## API Reference

### `new Malipo(apiKey)` or `new Malipo(config)`
- `apiKey`: (Required) Your Malipo secret key.
- `config`: `MalipoConfig` object for advanced configuration (environment, baseUrl).

### `malipo.charges.create(params, idempotencyKey)`
- `params`: `ChargeCreateParams` (Required).
- `idempotencyKey`: (Optional) Unique string for request deduplication.

### `malipo.transactions.retrieve(id)`
- `id`: Transaction ID.

### `malipo.balance.retrieve()`
- Returns balance details for the current environment.

### `malipo.webhooks.constructEvent(payload, signature, secret)`
- `payload`: Raw string body of the request.
- `signature`: The `X-Webhook-Signature` header value.
- `secret`: Your webhook signing secret from the dashboard.
- **Returns**: A verified `MalipoEvent` object or throws an error if verification fails.

## License
MIT
