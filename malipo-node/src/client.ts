import type { B2CPage, B2CListParams, BeneficiaryCreateParams, MalipoBeneficiary,
  DisbursementCreateParams, MalipoDisbursement, DisbursementStatus, SandboxPayoutScenario,
  SandboxSanctionsStatus, SandboxClock } from "./types";
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
    method: "GET" | "POST" | "PATCH",
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

  private listQuery(params: object = {}): string {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value !== undefined) query.set(key, String(value));
    return query.size ? `?${query}` : "";
  }

  private testingRequest<T>(action: string, body: object = {}): Promise<T> {
    if (this.environment !== "sandbox" || !this.apiKey.startsWith("sk_test_")) {
      return Promise.reject(new MalipoError("Testing tools require a sandbox key", 403, "testing_live_forbidden"));
    }
    return this.request<T>("POST", `/testing/${action}`, body);
  }

  public readonly beneficiaries = {
    create: (params: BeneficiaryCreateParams) => this.request<MalipoBeneficiary>("POST", "/beneficiaries", params),
    list: (params: B2CListParams = {}) => this.request<B2CPage<MalipoBeneficiary>>("GET", `/beneficiaries${this.listQuery(params)}`),
    retrieve: (id: string) => this.request<MalipoBeneficiary>("GET", `/beneficiaries/${encodeURIComponent(id)}`),
    update: (id: string, params: Partial<Omit<BeneficiaryCreateParams, "reference">>) =>
      this.request<MalipoBeneficiary>("PATCH", `/beneficiaries/${encodeURIComponent(id)}`, params),
  };

  public readonly disbursements = {
    create: (params: DisbursementCreateParams, options: { idempotencyKey: string }): Promise<MalipoDisbursement> => {
      const idempotencyKey = options?.idempotencyKey?.trim();
      if (!idempotencyKey || idempotencyKey.length > 128) return Promise.reject(new MalipoError("Idempotency-Key is required (1–128 characters)", 400, "missing_idempotency_key"));
      return this.request<MalipoDisbursement>("POST", "/disbursements", params, { "Idempotency-Key": idempotencyKey });
    },
    list: (params: B2CListParams & { reference?: string; status?: DisbursementStatus } = {}) =>
      this.request<B2CPage<MalipoDisbursement>>("GET", `/disbursements${this.listQuery(params)}`),
    retrieve: (id: string) => this.request<MalipoDisbursement>("GET", `/disbursements/${encodeURIComponent(id)}`),
    cancel: (id: string) => this.request<MalipoDisbursement>("POST", `/disbursements/${encodeURIComponent(id)}/cancel`, {}),
  };

  public readonly testing = {
    holdBeneficiary: (id: string, held: boolean) => this.testingRequest<MalipoBeneficiary>("hold_beneficiary", { id, held }),
    reviewBeneficiary: (id: string, versionId: string, review: { identity_status: "pending" | "approved" | "rejected"; residence_status: "pending" | "approved" | "rejected"; proof: string }) =>
      this.testingRequest<MalipoBeneficiary>("review_beneficiary", { id, version_id: versionId, ...review }),
    approveBeneficiary: (id: string) => this.testingRequest<MalipoBeneficiary>("approve", { id }),
    rejectBeneficiary: (id: string) => this.testingRequest<MalipoBeneficiary>("reject", { id }),
    screenBeneficiary: (id: string, status: SandboxSanctionsStatus) => this.testingRequest<MalipoBeneficiary>("screen_beneficiary", { id, status }),
    screenMerchant: (status: SandboxSanctionsStatus) => this.testingRequest<SandboxClock>("screen_merchant", { status }),
    advanceTime: (seconds: number) => this.testingRequest<SandboxClock>("advance_time", { seconds }),
    holdMerchant: (held: boolean) => this.testingRequest<SandboxClock>("hold", { held }),
    holdDisbursement: (id: string, held: boolean) => this.testingRequest<MalipoDisbursement>("hold_disbursement", { id, held }),
    setLimits: (limits: { minimum_minor: number; maximum_minor: number; daily_minor: number; monthly_minor: number }) => this.testingRequest<SandboxClock>("limits", limits),
    release: () => this.testingRequest<SandboxClock>("release"),
    scenario: (id: string, scenario: SandboxPayoutScenario) => this.testingRequest<MalipoDisbursement>("scenario", { id, scenario }),
    result: (id: string, status: "succeeded" | "failed" | "needs_review") => this.testingRequest<MalipoDisbursement>("result", { id, status }),
    resolve: (id: string, status: "succeeded" | "failed", proof: string) => this.testingRequest<MalipoDisbursement>("resolve", { id, status, proof }),
    setDefaultScenario: (scenario: SandboxPayoutScenario) => this.testingRequest<SandboxClock>("set_scenario", { scenario }),
    replayWebhook: (id: string, eventType: `payout.${DisbursementStatus}`, delaySeconds = 0) => this.testingRequest<{ scheduled: boolean }>("webhook", { id, event_type: eventType, delay_seconds: delaySeconds }),
    run: () => this.testingRequest<{ processed: number }>("run"),
  };

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
