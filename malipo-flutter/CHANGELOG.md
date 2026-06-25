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
