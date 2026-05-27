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

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await client.charges.create(chargeParams, {
      idempotencyKey: "unique_key",
    });

    expect(result.id).toBe("tx_123");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/charge"),
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

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await client.transactions.retrieve("tx_123");

    expect(result.id).toBe("tx_123");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/transaction-status?id=tx_123"),
      expect.objectContaining({ method: "GET" })
    );
  });

  it("should retrieve balance for the correct environment", async () => {
    const mockResponse = { object: "balance", available: [], pending: [] };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    await client.balance.retrieve();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/sandbox-balance"),
      expect.any(Object)
    );
  });

  it("should throw error on API failure", async () => {
    const errorResponse = {
      error: { message: "Invalid amount", code: "invalid_amount" },
    };

    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => errorResponse,
    });

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
