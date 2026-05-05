# Malipo Python SDK

The official Python library for the Malipo Payment Gateway. Securely accept Mobile Money payments (Vodacom MPesa, Orange Money, Airtel Money) in the DRC.

## Installation

```bash
pip install malipo
```

## Quick Start

```python
from malipo import Malipo

malipo = Malipo(api_key='sk_test_your_api_key')

# Create a charge
try:
    charge = malipo.charges.create({
        "amount": 10,
        "currency": "USD",
        "phone": "243810000000",
        "network": "VODACOM_MPESA",
        "description": "Order #123"
    }, idempotency_key='unique_order_id_123')

    print(f"Charge initiated: {charge['id']}")
    print(f"Status: {charge['status']}") # 'pending'
except Exception as e:
    print(f"Charge failed: {e}")
```

## Features

### 🔐 Idempotency
Protect against duplicate charges by providing an `idempotency_key` in the options.

### 🔄 Environment Detection
The SDK automatically switches between `sandbox` and `live` environments based on your API key prefix (`sk_test_` vs `sk_live_`).

### 📊 Balance Check
Check your available and pending balances for your current environment.

```python
balance = malipo.balance.retrieve()
print(f"Available USD: {balance['available'][0]['amount']}")
```

## Webhooks

```python
from flask import Flask, request
from malipo import Malipo

app = Flask(__name__)
malipo = Malipo(api_key='...')

@app.route('/webhooks/malipo', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-Webhook-Signature')
    payload = request.get_data(as_text=True)
    
    try:
        event = malipo.webhooks.construct_event(
            payload=payload,
            signature=signature,
            secret='whsec_your_secret'
        )
        
        if event['type'] == 'charge.succeeded':
            charge = event['data']['object']
            print(f"Payment successful: {charge['id']}")
            
        return "OK", 200
    except Exception as e:
        return str(e), 400
```

## License
MIT
