/**
 * Supported Mobile Money Networks in DRC
 */
export type MalipoNetwork = "VODACOM_MPESA" | "AIRTEL_MONEY" | "ORANGE_MONEY";

/**
 * Transaction Status
 */
export type MalipoTransactionStatus = "pending" | "succeeded" | "failed" | "declined" | "expired";

/**
 * Environment
 */
export type MalipoEnvironment = "sandbox" | "live";

/**
 * Malipo SDK Configuration
 */
export interface MalipoConfig {
  /**
   * Your Malipo API Key (starting with `sk_live_` or `sk_test_`)
   */
  apiKey: string;
  
  /**
   * Environment to use. If not provided, it will be inferred from the API Key prefix.
   */
  environment?: MalipoEnvironment;

  /**
   * Custom base URL for the API (optional)
   */
  baseUrl?: string;
}

/**
 * Payer details sent with a charge
 */
export interface MalipoPayer {
  /**
   * Payer first name
   */
  first_name: string;

  /**
   * Payer last name
   */
  last_name: string;

  /**
   * Payer email address
   */
  email: string;
}

/**
 * Charge Creation Parameters
 */
export interface ChargeCreateParams {
  /**
   * Amount to charge (in USD for Live, can be USD or CDF for Sandbox)
   */
  amount: number;
  
  /**
   * Currency code (e.g., "USD", "CDF")
   */
  currency: string;
  
  /**
   * Customer phone number in MSISDN format (e.g., "243810000000")
   */
  phone: string;
  
  /**
   * Mobile money network
   */
  network: MalipoNetwork;
  
  /**
   * Optional description for the transaction
   */
  description?: string;
  
  /**
   * Optional merchant-defined metadata
   */
  metadata?: Record<string, any>;

  /**
   * Optional payer details
   */
  payer?: MalipoPayer;
}

/**
 * Transaction Record
 */
export interface MalipoTransaction {
  id: string;
  object: "charge" | "transaction";
  amount: number;
  currency: string;
  requested_currency: string;
  settlement_currency: string | null;
  settlement_amount: number | null;
  status: MalipoTransactionStatus;
  phone: string;
  network: MalipoNetwork;
  environment: MalipoEnvironment;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  failure_reason?: string;
  failure_code?: string;
}

/**
 * Refund Creation Parameters
 */
export interface RefundCreateParams {
  /**
   * The ID of the charge to refund
   */
  charge_id: string;

  /**
   * Optional amount to refund. If not provided, the full charge amount will be refunded.
   */
  amount?: number;

  /**
   * Optional reason for the refund
   */
  reason?: string;

  /**
   * Optional merchant-defined metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Refund Record
 */
export interface MalipoRefund {
  id: string;
  object: "refund";
  amount: number;
  currency: string;
  requested_currency: string;
  settlement_currency: string | null;
  settlement_amount: number | null;
  status: MalipoTransactionStatus;
  phone: string;
  network: MalipoNetwork;
  environment: MalipoEnvironment;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  failure_reason?: string;
  failure_code?: string;
}

/**
 * Checkout Session Creation Parameters
 */
export interface CheckoutSessionCreateParams {
  /**
   * Amount to charge
   */
  amount: number;

  /**
   * Currency code (e.g., "USD", "CDF")
   */
  currency: string;

  /**
   * Optional description for the checkout page
   */
  description?: string;

  /**
   * Optional URL to redirect the customer to after payment
   */
  redirect_url?: string;

  /**
   * Optional expiry date for the session
   */
  expires_at?: string;

  /**
   * Optional merchant-defined metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Checkout Session Record
 */
export interface MalipoCheckoutSession {
  id: string;
  object: "checkout_session";
  token: string;
  url: string;
  amount: number;
  currency: string;
  description: string | null;
  status: "active" | "completed" | "expired";
  environment: MalipoEnvironment;
  expires_at: string;
  created_at: string;
}

/**
 * Balance Details
 */
export interface MalipoBalanceAmount {
  amount: number;
  currency: string;
}

/**
 * Balance Object
 */
export interface MalipoBalance {
  object: "balance";
  available: MalipoBalanceAmount[];
  pending: MalipoBalanceAmount[];
  updated_at: string;
}

/**
 * Webhook Event
 */
export interface MalipoEvent {
  id: string;
  object: "event";
  type: string;
  environment: MalipoEnvironment;
  data: {
    object: MalipoTransaction;
  };
  created_at: string;
}

/**
 * API Error Response
 */
export interface MalipoErrorResponse {
  error: {
    message: string;
    code: string;
    [key: string]: any;
  };
}
