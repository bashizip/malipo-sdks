import pytest
import responses
import json
import hmac
import hashlib
from malipo import Malipo, MalipoError

@pytest.fixture
def client():
    return Malipo(api_key="sk_test_123")

@responses.activate
def test_create_charge(client):
    responses.add(
        responses.POST,
        "https://api.malipo.dev/charge",
        json={"id": "tx_123", "status": "pending"},
        status=200
    )
    
    charge = client.charges.create({
        "amount": 10,
        "currency": "USD",
        "phone": "243810000000",
        "network": "VODACOM_MPESA"
    }, idempotency_key="idemp_123")
    
    assert charge["id"] == "tx_123"
    assert responses.calls[0].request.headers["Idempotency-Key"] == "idemp_123"

@responses.activate
def test_retrieve_transaction(client):
    responses.add(
        responses.GET,
        "https://api.malipo.dev/transaction-status?id=tx_123",
        json={"id": "tx_123", "status": "succeeded"},
        status=200
    )
    
    tx = client.transactions.retrieve("tx_123")
    assert tx["status"] == "succeeded"

@responses.activate
def test_error_handling(client):
    responses.add(
        responses.POST,
        "https://api.malipo.dev/charge",
        json={"error": {"message": "Invalid amount", "code": "invalid_amount"}},
        status=400
    )
    
    with pytest.raises(MalipoError) as excinfo:
        client.charges.create({"amount": -1})
    
    assert "Invalid amount" in str(excinfo.value)
    assert excinfo.value.status_code == 400
    assert excinfo.value.code == "invalid_amount"

def test_webhook_verification(client):
    payload = json.dumps({"id": "evt_123", "type": "charge.succeeded"})
    secret = "whsec_test"
    signature = hmac.new(
        secret.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    
    event = client.webhooks.construct_event(payload, signature, secret)
    assert event["id"] == "evt_123"
    assert event["type"] == "charge.succeeded"

def test_webhook_verification_failure(client):
    payload = json.dumps({"id": "evt_123"})
    secret = "whsec_test"
    signature = "wrong_signature"
    
    with pytest.raises(MalipoError) as excinfo:
        client.webhooks.construct_event(payload, signature, secret)
    
    assert "Invalid webhook signature" in str(excinfo.value)
