import { createHmac } from "node:crypto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Malipo } from "./client";
import { MalipoError } from "./errors";
import type { ChargeCreateParams } from "./types";

describe("Malipo SDK Client", () => {
  const apiKey = "sk_test_123";
  let client: Malipo;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    client = new Malipo({ apiKey });
  });

  const mockJsonResponse = (data: any, ok = true, status = 200) => ({
    ok,
    status,
    headers: { get: (name: string) => name.toLowerCase() === "content-type" ? "application/json" : null },
    json: async () => data,
    text: async () => JSON.stringify(data),
  });

  it("should initialize with correct environment based on API key", () => {
    expect(client["environment"]).toBe("sandbox");

    const liveClient = new Malipo({ apiKey: "sk_live_123" });
    expect(liveClient["environment"]).toBe("live");
  });

  it("should create a charge with idempotency key", async () => {
    const chargeParams: ChargeCreateParams = {
      amount: 10,
      currency: "USD",
      phone: "243810000000",
      network: "VODACOM_MPESA",
      description: "Order #123",
      payer: {
        first_name: "John",
        last_name: "Doe",
        email: "john.doe@example.com",
      },
    };
    const mockResponse = {
      id: "tx_123",
      status: "pending",
      amount: chargeParams.amount,
      currency: chargeParams.currency,
    };

    (global.fetch as any).mockResolvedValue(mockJsonResponse(mockResponse));

    const result = await client.charges.create(chargeParams, {
      idempotencyKey: "unique_key",
    });

    expect(result.id).toBe("tx_123");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/charge"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Idempotency-Key": "unique_key",
          "Authorization": `Bearer ${apiKey}`,
        }),
      })
    );

    const [, requestOptions] = (global.fetch as any).mock.calls[0];
    expect(JSON.parse(requestOptions.body)).toEqual(chargeParams);
  });

  it("should retrieve a transaction", async () => {
    const mockResponse = { id: "tx_123", status: "succeeded" };

    (global.fetch as any).mockResolvedValue(mockJsonResponse(mockResponse));

    const result = await client.transactions.retrieve("tx_123");

    expect(result.id).toBe("tx_123");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/transaction-status?id=tx_123"),
      expect.objectContaining({ method: "GET" })
    );
  });

  it("should create a refund with idempotency key", async () => {
    const refundParams = {
      charge_id: "tx_123",
      amount: 5,
      reason: "Customer requested refund",
    };
    const mockResponse = {
      id: "re_123",
      object: "refund",
      status: "succeeded",
      amount: refundParams.amount,
    };

    (global.fetch as any).mockResolvedValue(mockJsonResponse(mockResponse));

    const result = await client.refunds.create(refundParams, {
      idempotencyKey: "refund_key",
    });

    expect(result.id).toBe("re_123");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/refund"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Idempotency-Key": "refund_key",
        }),
      })
    );
  });

  it("should create a checkout session", async () => {
    const sessionParams = {
      amount: 25,
      currency: "USD",
      description: "Donation",
    };
    const mockResponse = {
      id: "cs_123",
      object: "checkout_session",
      url: "https://checkout.malipo.dev/cs_123",
      amount: sessionParams.amount,
    };

    (global.fetch as any).mockResolvedValue(mockJsonResponse(mockResponse));

    const result = await client.checkoutSessions.create(sessionParams);

    expect(result.id).toBe("cs_123");
    expect(result.url).toContain("/cs_123");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/checkout-session"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("should retrieve balance for the correct environment", async () => {
    const mockResponse = { object: "balance", available: [], pending: [] };

    (global.fetch as any).mockResolvedValue(mockJsonResponse(mockResponse));

    await client.balance.retrieve();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/sandbox-balance"),
      expect.any(Object)
    );
  });

  it("should throw error on API failure", async () => {
    const errorResponse = {
      error: { message: "Invalid amount", code: "invalid_amount" },
    };

    (global.fetch as any).mockResolvedValue(mockJsonResponse(errorResponse, false, 400));

    try {
      await client.charges.create({
        amount: -1,
        currency: "USD",
        phone: "243810000000",
        network: "VODACOM_MPESA",
      });
      expect.fail("Expected charge creation to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(MalipoError);
      const malipoError = error as MalipoError;
      expect(malipoError.message).toBe("Invalid amount");
      expect(malipoError.status).toBe(400);
      expect(malipoError.code).toBe("invalid_amount");
      expect(malipoError.name).toBe("MalipoError");
    }
  });

  describe("Webhooks", () => {
    it("should verify a valid webhook signature", () => {
      const payload = JSON.stringify({ id: "evt_123", type: "charge.succeeded" });
      const secret = "whsec_test";
      const signature = createHmac("sha256", secret).update(payload).digest("hex");

      const event = client.webhooks.constructEvent(payload, signature, secret);
      expect(event.id).toBe("evt_123");
      expect(event.type).toBe("charge.succeeded");
    });

    it("should throw for an invalid webhook signature", () => {
      const payload = JSON.stringify({ id: "evt_123", type: "charge.succeeded" });
      const secret = "whsec_test";
      const signature = "wrong_signature";

      expect(() => {
        client.webhooks.constructEvent(payload, signature, secret);
      }).toThrow("Invalid webhook signature.");
    });

    it("should throw if missing parameters", () => {
      expect(() => {
        client.webhooks.constructEvent("", "", "");
      }).toThrow("Missing payload, signature, or secret for webhook verification.");
    });
  });
});
