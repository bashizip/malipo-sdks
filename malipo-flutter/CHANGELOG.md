## 1.1.2

*   **Fix**: `constructEvent` now verifies the signature over `${timestamp}.${rawBody}` and
    rejects timestamps outside a 5-minute replay window, matching the Node.js SDK. Pass the
    `X-Webhook-Timestamp` header as the 4th argument. Previously only the raw body was hashed,
    so every live delivery failed verification.
*   **Security**: Signature comparison is now constant-time and length-safe.
*   Updated `X-Client-Info` to `malipo-flutter/1.1.2`.

## 1.1.1

*   **Bug Fix**: Corrected base URL to include `/v1/` prefix for all API requests.
*   **Improvement**: Enhanced error handling to gracefully manage non-JSON responses from the API (e.g., HTML 404 pages), preventing JSON parsing errors.
*   Updated `X-Client-Info` to `malipo-flutter/1.1.1`.

## 1.1.0

* Added support for **Refunds API**: Initiate full or partial refunds for successful transactions.
* Added support for **Hosted Checkout Sessions**: Programmatically create hosted payment links for dynamic checkout flows.
* Updated `MalipoTransaction` to include settlement fields and the `declined` status.
* Added new models: `MalipoRefund`, `RefundCreateParams`, `MalipoCheckoutSession`, and `CheckoutSessionCreateParams`.

## 1.0.0

* Initial release of the official Malipo Flutter SDK.
* Support for initiating mobile money charges (Vodacom, Orange, Airtel).
* Transaction retrieval and status checking.
* Sandbox and Live balance checking.
* Webhook signature verification utility.
* Strongly-typed models and error handling via `MalipoException`.
