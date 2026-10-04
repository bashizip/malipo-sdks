import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { Malipo } from "./client";
const client = new Malipo({ apiKey: "sk_test_synthetic" });
beforeEach(() => vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "example" }), { headers: { "content-type": "application/json" } }))));
afterEach(() => vi.unstubAllGlobals());
it("sends mandatory idempotency and exact decimal strings", async () => {
  await client.disbursements.create({ amount: "20.00", currency: "USD", reference: "order:1", beneficiary_id: "b" }, { idempotencyKey: "withdrawal:1" });
  expect(fetch).toHaveBeenCalledWith("https://api.malipo.dev/v1/disbursements", expect.objectContaining({ method: "POST", headers: expect.objectContaining({ "Idempotency-Key": "withdrawal:1" }), body: expect.stringContaining('"amount":"20.00"') }));
});
it("rejects missing idempotency before network", async () => {
  await expect(client.disbursements.create({ amount: "20.00", currency: "USD", reference: "r", beneficiary_id: "b" }, { idempotencyKey: "" })).rejects.toMatchObject({ code: "missing_idempotency_key" });
  expect(fetch).not.toHaveBeenCalled();
});
it("supports PATCH and safely encodes resource ids and query filters", async () => {
  await client.beneficiaries.update("a/b", { msisdn: "243890000000" });
  expect(fetch).toHaveBeenCalledWith("https://api.malipo.dev/v1/beneficiaries/a%2Fb", expect.objectContaining({ method: "PATCH" }));
  await client.disbursements.list({ reference: "a&status=failed", page: 2 });
  expect(fetch).toHaveBeenLastCalledWith("https://api.malipo.dev/v1/disbursements?reference=a%26status%3Dfailed&page=2", expect.anything());
});
it("refuses testing with a live key even if config says sandbox", async () => {
  const live = new Malipo({ apiKey: "sk_live_synthetic", environment: "sandbox" });
  await expect(live.testing.run()).rejects.toMatchObject({ code: "testing_live_forbidden" });
  expect(fetch).not.toHaveBeenCalled();
});
it("exposes deterministic simulation and sends empty JSON to cancel", async () => {
  await client.testing.scenario("d", "timeout");
  expect(fetch).toHaveBeenLastCalledWith("https://api.malipo.dev/v1/testing/scenario", expect.objectContaining({ body: JSON.stringify({ id: "d", scenario: "timeout" }) }));
  await client.disbursements.cancel("d");
  expect(fetch).toHaveBeenLastCalledWith("https://api.malipo.dev/v1/disbursements/d/cancel", expect.objectContaining({ method: "POST", body: "{}" }));
});

it("scopes simulated verification to a beneficiary version and exposes a beneficiary hold", async () => {
  await client.testing.reviewBeneficiary("beneficiary", "version", { identity_status: "approved", residence_status: "rejected", proof: "simulated-case" });
  expect(fetch).toHaveBeenLastCalledWith("https://api.malipo.dev/v1/testing/review_beneficiary", expect.objectContaining({ body: JSON.stringify({ id: "beneficiary", version_id: "version", identity_status: "approved", residence_status: "rejected", proof: "simulated-case" }) }));
  await client.testing.holdBeneficiary("beneficiary", true);
  expect(fetch).toHaveBeenLastCalledWith("https://api.malipo.dev/v1/testing/hold_beneficiary", expect.objectContaining({ body: JSON.stringify({ id: "beneficiary", held: true }) }));
});
