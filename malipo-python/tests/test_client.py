import pytest
import responses
import json
import hmac
import hashlib
from datetime import datetime, timezone
from malipo import Malipo, MalipoError

@pytest.fixture
def client():
    return Malipo(api_key="sk_test_123")

@responses.activate
def test_create_charge(client):
    responses.add(
        responses.POST,
        "https://api.malipo.dev/v1/charge",
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
        "https://api.malipo.dev/v1/transaction-status?id=tx_123",
        json={"id": "tx_123", "status": "succeeded"},
        status=200
    )
    
    tx = client.transactions.retrieve("tx_123")
    assert tx["status"] == "succeeded"

@responses.activate
def test_error_handling(client):
    responses.add(
        responses.POST,
        "https://api.malipo.dev/v1/charge",
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


# Published in malipo-sdks/samples/webhook-test-vectors.md. The signature is asserted as
# a literal so the shared contract across every SDK cannot drift silently.
VECTOR_SECRET = "whsec_example_only"
VECTOR_TIMESTAMP = "2026-09-18T07:30:00.000Z"
VECTOR_BODY = '{"id": "evt_test_1234567890abcdef", "object": "event", "type": "charge.succeeded", "environment": "sandbox", "created_at": "2026-09-18T07:29:58.000Z", "data": {"object": {"id": "tx_12345", "object": "transaction", "amount": 50, "currency": "USD", "requested_currency": "USD", "status": "succeeded", "phone": "+243831386749", "network": "VODACOM_MPESA", "environment": "sandbox", "metadata": {}, "created_at": "2026-09-18T07:29:58.000Z"}}}'
VECTOR_SIGNATURE = "457fada06ad0a706baee51fb3a6cb06bcdc179c95c82c24bafe17fb90fe4d343"
VECTOR_LEGACY_SIGNATURE = "53878fca703f5121a9e19a31edf7bbd5d28e1ce734bc0e9211d8e7715780658a"


def _sign(message: str) -> str:
    return hmac.new(
        VECTOR_SECRET.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def test_webhook_vector_accepts_the_timestamped_scheme(client):
    event = client.webhooks.construct_event(
        VECTOR_BODY,
        VECTOR_SIGNATURE,
        VECTOR_SECRET,
        timestamp=VECTOR_TIMESTAMP,
        tolerance_ms=0,
    )

    assert event["id"] == "evt_test_1234567890abcdef"
    assert event["type"] == "charge.succeeded"
    assert event["data"]["object"]["id"] == "tx_12345"


def test_webhook_vector_rejects_a_live_delivery_when_verified_without_the_timestamp(client):
    # The live-delivery failure this alignment fixes: Malipo signs
    # f"{timestamp}.{rawBody}" and the SDK only hashed the body.
    with pytest.raises(MalipoError) as excinfo:
        client.webhooks.construct_event(VECTOR_BODY, VECTOR_SIGNATURE, VECTOR_SECRET)

    assert "Invalid webhook signature" in str(excinfo.value)


def test_webhook_vector_still_accepts_the_legacy_body_only_scheme(client):
    event = client.webhooks.construct_event(VECTOR_BODY, VECTOR_LEGACY_SIGNATURE, VECTOR_SECRET)

    assert event["id"] == "evt_test_1234567890abcdef"


def test_webhook_vector_accepts_a_fresh_timestamp_with_the_default_window(client):
    timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    signature = _sign(f"{timestamp}.{VECTOR_BODY}")

    event = client.webhooks.construct_event(
        VECTOR_BODY,
        signature,
        VECTOR_SECRET,
        timestamp=timestamp,
    )

    assert event["id"] == "evt_test_1234567890abcdef"


def test_webhook_vector_rejects_a_stale_timestamp(client):
    stale = "2020-01-01T00:00:00.000Z"

    with pytest.raises(MalipoError) as excinfo:
        client.webhooks.construct_event(
            VECTOR_BODY,
            _sign(f"{stale}.{VECTOR_BODY}"),
            VECTOR_SECRET,
            timestamp=stale,
        )

    assert "out of window" in str(excinfo.value)


def test_webhook_vector_rejects_an_unparseable_timestamp(client):
    epoch_seconds = "1758171000"

    with pytest.raises(MalipoError) as excinfo:
        client.webhooks.construct_event(
            VECTOR_BODY,
            _sign(f"{epoch_seconds}.{VECTOR_BODY}"),
            VECTOR_SECRET,
            timestamp=epoch_seconds,
        )

    assert "out of window" in str(excinfo.value)


def test_webhook_vector_rejects_a_tampered_body(client):
    with pytest.raises(MalipoError) as excinfo:
        client.webhooks.construct_event(
            VECTOR_BODY + " ",
            VECTOR_SIGNATURE,
            VECTOR_SECRET,
            timestamp=VECTOR_TIMESTAMP,
            tolerance_ms=0,
        )

    assert "Invalid webhook signature" in str(excinfo.value)
