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
  MalipoEvent,
  WebhookConstructEventOptions,
  RefundCreateParams,
} from "./types";
import { MalipoError } from "./errors";
import { createHmac, timingSafeEqual } from "node:crypto";

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
    this.baseUrl = config.baseUrl || "https://api.malipo.dev/v1";
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
      "X-Client-Info": "malipo-node/1.2.5",
      ...headers,
    };

    const response = await fetch(url, {
      method,
      headers: defaultHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    let data: any;
    const contentType = response.headers.get("content-type");

    try {
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }
    } catch (e) {
      data = null;
    }

    if (!response.ok) {
      const errorResponse = typeof data === "object" && data !== null ? (data as MalipoErrorResponse) : null;
      throw new MalipoError(
        errorResponse?.error?.message || (typeof data === "string" && data ? data : "An unexpected error occurred"),
        response.status,
        errorResponse?.error?.code,
        errorResponse?.error
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
     * @param timestampOrOptions Optional value of the X-Webhook-Timestamp header, or options object
     * @param toleranceMs Replay protection window in milliseconds (default: 300000ms / 5 minutes)
     */
    constructEvent: (
      payload: string,
      signature: string,
      secret: string,
      timestampOrOptions?: string | WebhookConstructEventOptions,
      toleranceMs: number = 300000
    ): MalipoEvent => {
      if (!payload || !signature || !secret) {
        throw new Error("Missing payload, signature, or secret for webhook verification.");
      }

      let timestamp: string | undefined;
      let tolerance = toleranceMs;

      if (typeof timestampOrOptions === "object" && timestampOrOptions !== null) {
        timestamp = timestampOrOptions.timestamp;
        if (typeof timestampOrOptions.toleranceMs === "number") {
          tolerance = timestampOrOptions.toleranceMs;
        }
      } else if (typeof timestampOrOptions === "string") {
        timestamp = timestampOrOptions;
      }

      if (timestamp && tolerance > 0) {
        const timestampMs = Date.parse(timestamp);
        if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > tolerance) {
          throw new Error("Webhook timestamp out of window.");
        }
      }

      const signedPayload = timestamp ? `${timestamp}.${payload}` : payload;
      const computedSignature = createHmac("sha256", secret)
        .update(signedPayload)
        .digest("hex");

      const signatureBuf = Buffer.from(signature, "utf8");
      const computedBuf = Buffer.from(computedSignature, "utf8");

      if (
        signatureBuf.length !== computedBuf.length ||
        !timingSafeEqual(signatureBuf, computedBuf)
      ) {
        throw new Error("Invalid webhook signature.");
      }

      return JSON.parse(payload) as MalipoEvent;
    }
  };
}
