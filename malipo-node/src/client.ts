import type {
  ChargeCreateParams,
  CheckoutSessionCreateParams,
  MalipoBalance,
  MalipoCheckoutSession,
  MalipoConfig,
  MalipoEnvironment,
  MalipoErrorResponse,
  MalipoRefund,
  MalipoTransaction,
  RefundCreateParams,
} from "./types";
import { MalipoError } from "./errors";

export class Malipo {
  private apiKey: string;
  private environment: MalipoEnvironment;
  private baseUrl: string;

  constructor(config: MalipoConfig) {
    if (!config.apiKey) {
      throw new Error("Malipo API Key is required.");
    }

    this.apiKey = config.apiKey;
    
    // Infer environment from API Key if not explicitly provided
    this.environment = config.environment || (this.apiKey.startsWith("sk_live_") ? "live" : "sandbox");
    
    // Set base URL
    this.baseUrl = config.baseUrl || "https://api.malipo.dev";
  }

  private async request<T>(
    method: "GET" | "POST",
    endpoint: string,
    body?: any,
    headers?: Record<string, string>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const defaultHeaders = {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "X-Client-Info": "malipo-node/1.0.0",
      ...headers,
    };

    const response = await fetch(url, {
      method,
      headers: defaultHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      const errorResponse = data as MalipoErrorResponse;
      throw new MalipoError(
        errorResponse.error?.message || "An unexpected error occurred",
        response.status,
        errorResponse.error?.code,
        errorResponse.error
      );
    }

    return data as T;
  }

  /**
   * Charge Management
   */
  public readonly charges = {
    /**
     * Create a new charge
     */
    create: async (params: ChargeCreateParams, options?: { idempotencyKey?: string }): Promise<MalipoTransaction> => {
      const headers: Record<string, string> = {};
      if (options?.idempotencyKey) {
        headers["Idempotency-Key"] = options.idempotencyKey;
      }
      return this.request<MalipoTransaction>("POST", "/charge", params, headers);
    }
  };

  /**
   * Refund Management
   */
  public readonly refunds = {
    /**
     * Create a new refund
     */
    create: async (params: RefundCreateParams, options?: { idempotencyKey?: string }): Promise<MalipoRefund> => {
      const headers: Record<string, string> = {};
      if (options?.idempotencyKey) {
        headers["Idempotency-Key"] = options.idempotencyKey;
      }
      return this.request<MalipoRefund>("POST", "/refund", params, headers);
    }
  };

  /**
   * Checkout Session Management (Hosted Checkout)
   */
  public readonly checkoutSessions = {
    /**
     * Create a new checkout session
     */
    create: async (params: CheckoutSessionCreateParams): Promise<MalipoCheckoutSession> => {
      return this.request<MalipoCheckoutSession>("POST", "/checkout-session", params);
    }
  };

  /**
   * Transaction Management
   */
  public readonly transactions = {
    /**
     * Retrieve a transaction by ID
     */
    retrieve: async (id: string): Promise<MalipoTransaction> => {
      return this.request<MalipoTransaction>("GET", `/transaction-status?id=${id}`);
    }
  };

  /**
   * Balance Management
   */
  public readonly balance = {
    /**
     * Retrieve the current balance
     */
    retrieve: async (): Promise<MalipoBalance> => {
      const endpoint = this.environment === "live" ? "/live-balance" : "/sandbox-balance";
      return this.request<MalipoBalance>("GET", endpoint);
    }
  };

  /**
   * Webhook Management
   */
  public readonly webhooks = {
    /**
     * Verify and construct a webhook event
     * @param payload The raw request body (string)
     * @param signature The value of the X-Webhook-Signature header
     * @param secret Your webhook signing secret
     */
    constructEvent: (payload: string, signature: string, secret: string): any => {
      // Import crypto dynamically to support environment-specific imports if needed,
      // but here we use the standard Node.js approach as this is a Node SDK.
      const { createHmac } = require("node:crypto");
      
      if (!payload || !signature || !secret) {
        throw new Error("Missing payload, signature, or secret for webhook verification.");
      }

      const computedSignature = createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

      if (computedSignature !== signature) {
        throw new Error("Invalid webhook signature.");
      }

      return JSON.parse(payload);
    }
  };
}
