# Node SDK changelog

## 1.3.0-beta.1 — B2C sandbox candidate

- Add versioned beneficiaries, USD disbursements, required payout idempotency keys, pagination and sandbox testing helpers.
- Support PATCH and typed B2C errors, statuses and compliance fields.
- Add packaged staging acceptance and a signed webhook receiver with durable deduplication and canonical status reconciliation.
- Preserve the existing charge/refund and webhook APIs. User wallets remain in the merchant backend.

This prerelease targets the B2C sandbox on `https://api-staging.malipo.dev/v1`. A dedicated sandbox key with an explicit B2C write grant is required. Orange Money and M-Pesa live disbursements remain disabled pending separate operator acceptance. The npm `latest` tag must remain unchanged; publish this version under `beta` after recorded staging acceptance.
