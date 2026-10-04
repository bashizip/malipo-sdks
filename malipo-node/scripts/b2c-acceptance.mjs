import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

export function stagingConfig(env) {
  const apiKey = env.MALIPO_B2C_API_KEY; // gitleaks:allow -- environment lookup, not a literal credential
  if (typeof apiKey !== 'string' || !/^sk_test_[A-Za-z0-9_-]+$/.test(apiKey)) throw new Error('sandbox_key_required');
  const baseUrl = env.MALIPO_B2C_BASE_URL ?? 'https://api-staging.malipo.dev/v1';
  if (baseUrl !== 'https://api-staging.malipo.dev/v1') throw new Error('staging_origin_required');
  return { apiKey, baseUrl };
}

export function guardedFetch(baseUrl, fetchImpl = globalThis.fetch) {
  return (input, options = {}) => {
    const url = new URL(input);
    const base = new URL(baseUrl);
    if (url.origin !== base.origin || !url.pathname.startsWith('/v1/') || url.username || url.password) {
      throw new Error('staging_request_refused');
    }
    return fetchImpl(input, { ...options, redirect: 'error', signal: AbortSignal.timeout(15_000) });
  };
}

function cents(balance, field) {
  const amount = balance[field]?.find(row => row.currency === 'USD')?.amount;
  assert.equal(typeof amount, 'number', 'USD balance missing');
  const minor = Math.round(amount * 100);
  assert.ok(Number.isSafeInteger(minor) && minor >= 0 && Math.abs(amount * 100 - minor) < 0.00001, 'Invalid USD balance');
  return minor;
}

// Requires an exclusive synthetic sandbox key: no other activity during this run.
export async function runAcceptance(client, { wait = delay, runId = randomUUID() } = {}) {
  const checks = [];
  const before = await client.balance.retrieve();
  assert.equal(cents(before, 'pending'), 0, 'Use a dedicated sandbox key without pending funds');
  await client.testing.screenMerchant('cleared');
  let charge = await client.charges.create({ amount: 30, currency: 'USD', phone: '+243000000001', network: 'ORANGE_MONEY' }, { idempotencyKey: `b2c-funding-${runId}` });
  for (let i = 0; charge.status === 'pending' && i < 30; i++) {
    await wait(1000);
    charge = await client.transactions.retrieve(charge.id);
  }
  assert.equal(charge.status, 'succeeded', 'Funding did not succeed');
  const pending = await client.balance.retrieve();
  const credit = cents(pending, 'pending');
  assert.ok(credit >= 2000, 'Funding must cover the USD 20 disbursement');
  assert.equal(cents(pending, 'available'), cents(before, 'available'), 'Funding bypassed pending balance');
  await client.testing.release();
  await client.testing.release();
  const funded = await client.balance.retrieve();
  const available = cents(funded, 'available');
  assert.equal(available, cents(before, 'available') + credit, 'Release must credit once');
  assert.equal(cents(funded, 'pending'), 0);
  checks.push('funding_pending_release_once');

  const beneficiary = await client.beneficiaries.create({ reference: `user-${runId}`, name: 'Synthetic acceptance recipient', network: 'ORANGE_MONEY', msisdn: '243840000001' });
  assert.equal(beneficiary.environment, 'sandbox');
  assert.ok(!JSON.stringify(beneficiary).includes('243840000001'), 'Recipient was not masked');
  const approved = await client.testing.approveBeneficiary(beneficiary.id);
  assert.ok(approved.active_version_id, 'Beneficiary is not active');
  checks.push('beneficiary_approval_and_masking');

  await client.testing.setDefaultScenario('timeout');
  try {
    const params = { beneficiary_id: beneficiary.id, amount: '20.00', currency: 'USD', reference: `withdrawal-${runId}` };
    const options = { idempotencyKey: `withdrawal-${runId}` };
    // Ignore the first response, as a client would after losing it, then recover by replay.
    await client.disbursements.create(params, options);
    const payout = await client.disbursements.create(params, options);
    assert.equal(payout.environment, 'sandbox');
    assert.equal(payout.idempotent_replay, true);
    assert.equal(cents(await client.balance.retrieve(), 'available'), available - 2000);
    await assert.rejects(client.disbursements.create({ ...params, amount: '21.00' }, options), error => error.status === 409 && error.code === 'idempotency_conflict');
    const listed = await client.disbursements.list({ reference: params.reference, page: 1, page_size: 25 });
    assert.equal(listed.data.length, 1); assert.equal(listed.data[0].id, payout.id);
    checks.push('lost_response_replay_reference_lookup_and_conflict');

    await client.testing.run();
    assert.equal((await client.disbursements.retrieve(payout.id)).status, 'needs_review');
    assert.equal(cents(await client.balance.retrieve(), 'available'), available - 2000);
    checks.push('timeout_retains_reservation');
    await client.testing.result(payout.id, 'succeeded');
    await client.testing.result(payout.id, 'succeeded');
    assert.equal((await client.disbursements.retrieve(payout.id)).status, 'succeeded');
    const final = await client.balance.retrieve();
    assert.equal(cents(final, 'available'), available - 2000, 'Confirmation debited again');
    assert.equal(cents(final, 'pending'), 0);
    checks.push('late_confirmation_no_second_debit');
    return { schema: 1, run_id: runId, environment: 'sandbox', status: 'passed', checks,
      balances_usd_minor: { initial_available: cents(before, 'available'), funding_credit: credit, final_available: cents(final, 'available') },
      unverified: ['received_webhooks', 'cross_key_isolation', 'real_provider'] };
  } finally {
    await client.testing.setDefaultScenario('success');
  }
}
