/**
 * Supported Mobile Money Networks in DRC
 */
export type MalipoNetwork = "VODACOM_MPESA" | "AIRTEL_MONEY" | "ORANGE_MONEY";

/**
 * Transaction Status
 * - `pending`: The transaction is initiated and awaiting customer action (USSD).
 * - `succeeded`: The payment was successfully completed and settled.
 * - `failed`: The payment failed (e.g., technical error, provider down).
 * - `declined`: The customer or provider declined the payment (e.g., insufficient funds).
 * - `expired`: The payment request timed out before completion.
 */
export type MalipoTransactionStatus = "pending" | "succeeded" | "failed" | "declined" | "expired";

/**
 * Environment
 * - `sandbox`: Testing environment with simulated payments.
 * - `live`: Production environment with real money transactions.
 */
export type MalipoEnvironment = "sandbox" | "live";

/**
 * Malipo SDK Configuration
 */
export interface MalipoConfig {
  /**
   * Your Malipo secret API Key.
   * Starts with `sk_test_` for Sandbox or `sk_live_` for Live.
   */
  apiKey: string;
  
  /**
   * Target environment. If omitted, it is auto-inferred from the `apiKey` prefix.
   */
  environment?: MalipoEnvironment;

  /**
   * Optional custom base URL for the API.
   * Default: `https://api.malipo.dev`
   */
  baseUrl?: string;
}

/**
 * Payer details for KYC and verification purposes.
 */
export interface MalipoPayer {
  /** Payer first name */
  first_name: string;

  /** Payer last name */
  last_name: string;

  /** Payer email address */
  email: string;
}

/**
 * Parameters for creating a direct charge.
 */
export interface ChargeCreateParams {
  /**
   * Amount to charge.
   * In Live, this must be USD. In Sandbox, USD or CDF are supported.
   */
  amount: number;
  
  /**
   * Currency code (e.g., "USD", "CDF").
   */
  currency: string;
  
  /**
   * Customer phone number in MSISDN format (e.g., "243810000000").
   */
  phone: string;
  
  /**
   * The Mobile Money network to use for the charge.
   */
  network: MalipoNetwork;
  
  /**
   * Optional description for the transaction (shown in dashboard).
   */
  description?: string;
  
  /**
   * Optional merchant-defined metadata (hidden from customers).
   */
  metadata?: Record<string, any>;

  /**
   * Optional payer identity details.
   */
  payer?: MalipoPayer;
}

/**
 * Represents a Transaction (Charge) record.
 */
export interface MalipoTransaction {
  /** Unique Malipo Transaction ID */
  id: string;
  
  /** Object type (always "charge" or "transaction") */
  object: "charge" | "transaction";
  
  /** Final amount of the transaction */
  amount: number;
  
  /** Settlement currency */
  currency: string;
  
  /** Currency originally requested by the merchant */
  requested_currency: string;
  
  /** Currency in which the merchant will be settled */
  settlement_currency: string | null;
  
  /** Amount in settlement currency */
  settlement_amount: number | null;
  
  /** Current status of the transaction */
  status: MalipoTransactionStatus;
  
  /** Customer phone number used */
  phone: string;
  
  /** Network used for payment */
  network: MalipoNetwork;
  
  /** Environment in which the transaction occurred */
  environment: MalipoEnvironment;
  
  /** Merchant-defined metadata */
  metadata: Record<string, any>;
  
  /** ISO 8601 creation timestamp */
  created_at: string;
  
  /** ISO 8601 last update timestamp */
  updated_at: string;
  
  /** Human-readable failure reason if status is failed/declined */
  failure_reason?: string;
  
  /** Machine-readable failure code */
  failure_code?: string;
}

/**
 * Parameters for creating a refund.
 */
export interface RefundCreateParams {
  /**
   * The ID of the successful charge to refund.
   */
  charge_id: string;

  /**
   * Amount to refund. Omit for a full refund of the original charge.
   */
  amount?: number;

  /**
   * Reason for the refund.
   */
  reason?: string;

  /**
   * Optional merchant-defined metadata.
   */
  metadata?: Record<string, any>;
}

/**
 * Represents a Refund record.
 */
export interface MalipoRefund {
  /** Unique Malipo Refund ID */
  id: string;
  
  /** Object type (always "refund") */
  object: "refund";
  
  /** Amount refunded */
  amount: number;
  
  /** Currency of the refund */
  currency: string;
  
  /** Requested currency */
  requested_currency: string;
  
  /** Settlement currency (if applicable) */
  settlement_currency: string | null;
  
  /** Settlement amount (if applicable) */
  settlement_amount: number | null;
  
  /** Current status of the refund */
  status: MalipoTransactionStatus;
  
  /** MSISDN the refund is sent to */
  phone: string;
  
  /** Network used for disbursement */
  network: MalipoNetwork;
  
  /** Environment in which the refund occurred */
  environment: MalipoEnvironment;
  
  /** Merchant-defined metadata */
  metadata: Record<string, any>;
  
  /** ISO 8601 creation timestamp */
  created_at: string;
  
  /** ISO 8601 last update timestamp */
  updated_at: string;
  
  /** Failure reason if the refund failed */
  failure_reason?: string;
  
  /** Failure code if the refund failed */
  failure_code?: string;
}

/**
 * Parameters for creating a hosted checkout session.
 */
export interface CheckoutSessionCreateParams {
  /**
   * The total amount to be paid by the customer.
   */
  amount: number;

  /**
   * Currency code (e.g., "USD", "CDF").
   */
  currency: string;

  /**
   * Description shown on the hosted payment page.
   */
  description?: string;

  /**
   * The URL to redirect the customer to after a successful or failed payment.
   * Malipo will append `status` and `transaction_id` query parameters.
   */
  redirect_url?: string;

  /**
   * ISO 8601 date string for session expiration (default: 24h).
   */
  expires_at?: string;

  /**
   * Merchant-defined metadata associated with the resulting transaction.
   */
  metadata?: Record<string, any>;
}

/**
 * Represents a Hosted Checkout Session.
 */
export interface MalipoCheckoutSession {
  /** Unique Session ID */
  id: string;
  
  /** Object type */
  object: "checkout_session";
  
  /** Secure session token */
  token: string;
  
  /** The URL where you should redirect your customer */
  url: string;
  
  /** Session amount */
  amount: number;
  
  /** Session currency */
  currency: string;
  
  /** Session description */
  description: string | null;
  
  /** Current session status */
  status: "active" | "completed" | "expired";
  
  /** Session environment */
  environment: MalipoEnvironment;
  
  /** ISO 8601 expiration timestamp */
  expires_at: string;
  
  /** ISO 8601 creation timestamp */
  created_at: string;
}

/**
 * Details for a specific currency balance.
 */
export interface MalipoBalanceAmount {
  /** Current numeric amount */
  amount: number;
  
  /** Currency code */
  currency: string;
}

/**
 * Represents the account balance.
 */
export interface MalipoBalance {
  /** Object type */
  object: "balance";
  
  /** Funds currently available for payout */
  available: MalipoBalanceAmount[];
  
  /** Funds currently held (e.g., pending settlement) */
  pending: MalipoBalanceAmount[];
  
  /** ISO 8601 timestamp of last update */
  updated_at: string;
}

/**
 * Represents a Malipo Webhook Event.
 */
export interface MalipoEvent {
  /** Unique Event ID */
  id: string;
  
  /** Object type */
  object: "event";
  
  /** Event type (e.g., `charge.succeeded`, `refund.failed`) */
  type: string;
  
  /** Environment in which the event occurred */
  environment: MalipoEnvironment;
  
  /** The data payload associated with the event */
  data: {
    /** The actual resource that was updated */
    object: MalipoTransaction | MalipoRefund;
  };
  
  /** ISO 8601 event timestamp */
  created_at: string;
}

/**
 * Options for webhook signature verification.
 */
export interface WebhookConstructEventOptions {
  /**
   * The value of the X-Webhook-Timestamp header.
   */
  timestamp?: string;

  /**
   * Maximum allowed age of the webhook event in milliseconds (default: 300,000 ms / 5 minutes).
   * Set to 0 to disable replay window check.
   */
  toleranceMs?: number;
}

/**
 * Standard API Error Response.
 */
export interface MalipoErrorResponse {
  error: {
    /** Human-readable error message */
    message: string;
    
    /** Machine-readable error code */
    code: string;
    
    /** Additional error context */
    [key: string]: any;
  };
}
