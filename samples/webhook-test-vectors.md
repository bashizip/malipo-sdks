# Webhook signature test vectors

Verified reference values for the webhook `constructEvent` / `construct_event` helpers.
Use these to check an integration without touching the live API: nothing here calls Malipo.

All values below were reproduced with the SDKs in this repo (Node 1.2.4, Python 1.0.2,
PHP 1.0.3, Flutter/Dart 1.1.3, Java 1.0.1).

## How the signature is built

```
signature = hex( HMAC-SHA256( signing_secret, `${X-Webhook-Timestamp}.${rawBody}` ) )   # current scheme
signature = hex( HMAC-SHA256( signing_secret, rawBody ) )                              # legacy scheme
```

- `rawBody` is the **exact bytes** of the request body. Do not parse and re-serialize it:
  re-encoding drops whitespace and changes the HMAC.
- The separator between timestamp and body is a literal `.` (dot).
- Every SDK accepts the timestamp scheme, and the timestamp is optional: omitting it
  falls back to the legacy payload-only scheme. That fallback keeps older integrations
  working, but it also means a live delivery verified without the timestamp header is
  rejected - the failure mode in the table below.

## Test vector 1 - `whsec_example_only`

**Signing secret**

```
whsec_example_only
```

**Timestamp header** (`X-Webhook-Timestamp`) - exactly this string, no trailing whitespace

```
2026-09-18T07:30:00.000Z
```

**Raw request body** - 438 bytes of UTF-8, no trailing newline

```json
{"id": "evt_test_1234567890abcdef", "object": "event", "type": "charge.succeeded", "environment": "sandbox", "created_at": "2026-09-18T07:29:58.000Z", "data": {"object": {"id": "tx_12345", "object": "transaction", "amount": 50, "currency": "USD", "requested_currency": "USD", "status": "succeeded", "phone": "+243831386749", "network": "VODACOM_MPESA", "environment": "sandbox", "metadata": {}, "created_at": "2026-09-18T07:29:58.000Z"}}}
```

**Expected signatures**

| Scheme | Signed string | Expected `X-Webhook-Signature` |
| --- | --- | --- |
| Timestamped (new) | `2026-09-18T07:30:00.000Z.` + body | `457fada06ad0a706baee51fb3a6cb06bcdc179c95c82c24bafe17fb90fe4d343` |
| Payload only (legacy) | body | `53878fca703f5121a9e19a31edf7bbd5d28e1ce734bc0e9211d8e7715780658a` |

Both are plain HMACs you can recompute locally with the body saved byte-for-byte as
`body.json` (no trailing newline):

```bash
# timestamped scheme: HMAC over "<timestamp>.<body>" (note the literal dot)
{ printf '%s' '2026-09-18T07:30:00.000Z'; printf '.'; cat body.json; } \
  | openssl dgst -sha256 -hmac 'whsec_example_only'
# -> 457fada06ad0a706baee51fb3a6cb06bcdc179c95c82c24bafe17fb90fe4d343

# legacy scheme: HMAC over the body only
openssl dgst -sha256 -hmac 'whsec_example_only' body.json
# -> 53878fca703f5121a9e19a31edf7bbd5d28e1ce734bc0e9211d8e7715780658a
```

## Verified per-SDK results

| SDK | Timestamped signature | Payload-only signature | Notes |
| --- | --- | --- | --- |
| Node 1.2.4 (CJS + ESM) | passes | passes | 4th arg `timestamp`, or `{ timestamp, toleranceMs: 0 }` for a frozen vector |
| Python 1.0.2 | passes | passes | `timestamp=..., tolerance_ms=0` for a frozen vector |
| PHP 1.0.3 | passes | passes | 4th arg `$timestamp`, 5th `$toleranceMs` (`0` for a frozen vector) |
| Flutter/Dart 1.1.3 | passes | passes | 4th arg `timestamp`, 5th `toleranceMs` (`0` for a frozen vector) |
| Java 1.0.1 | passes | passes | `constructEvent(body, sig, secret, timestamp, 0L)` for a frozen vector |

Each SDK's test suite pins the signatures above as literals, so a change to any one
implementation fails that SDK's tests rather than shipping.

The versions shown are the ones carrying the timestamp support. Java is the exception:
`com.malipo:malipo-java` has no Maven Central release at all, because `pom.xml` still has
no release plumbing.

## Common causes of signature mismatch

1. **Body re-serialized instead of raw bytes** - `JSON.stringify(JSON.parse(body))` on the
   vector above produces a different signature (`Invalid webhook signature.`).
2. **Trailing newline or CRLF** in the body, or reading it as text with an added newline.
3. **Timestamp included in the wrong order** - the expected input is `timestamp + "." + body`.
4. **Non-ISO timestamp header** - every SDK parses `X-Webhook-Timestamp` as an ISO-8601
   string (`Date.parse`, `datetime.fromisoformat`, `strtotime`, `DateTime.tryParse`,
   `Instant.parse`); an epoch-seconds value (`1758171000`) is unparseable and the SDK
   throws `Webhook timestamp out of window.`. Use an ISO-8601 string such as
   `2026-09-18T07:30:00.000Z`.
5. **Frozen vector + default tolerance** - a static test vector older than 5 minutes is
   rejected by the replay window before the signature is even compared; set the tolerance
   to 0 when testing with fixed values (`{ toleranceMs: 0 }` Node, `tolerance_ms=0`
   Python, `$toleranceMs = 0` PHP, `toleranceMs: 0` Dart, `0L` Java).
6. **Wrong secret** - the value must be the endpoint's signing secret as shown in the
   dashboard: 64 lowercase hex characters with no `whsec_` prefix, no surrounding quotes
   and no trailing whitespace. It is not the API key, and a secret carrying a prefix
   never matches a signature we send.
