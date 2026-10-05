import test from 'node:test';
import assert from 'node:assert/strict';
import Malipo from '../dist/index.js';
import { stagingConfig, guardedFetch, runAcceptance } from './b2c-acceptance.mjs';
const config = { apiKey: 'sk_test_synthetic', baseUrl: 'https://api-staging.malipo.dev/v1' };

test('only the exact staging origin and sandbox keys are admitted', () => {
  assert.deepEqual(stagingConfig({ MALIPO_B2C_API_KEY: config.apiKey }), config);
  for (const url of ['https://api.malipo.dev/v1', 'http://api-staging.malipo.dev/v1', 'https://api-staging.malipo.dev.evil.test/v1', 'https://user@api-staging.malipo.dev/v1', 'https://api-staging.malipo.dev/v1?target=live', 'https://api-staging.malipo.dev/v1/']) {
    assert.throws(() => stagingConfig({ MALIPO_B2C_API_KEY: config.apiKey, MALIPO_B2C_BASE_URL: url }), /staging_origin_required/);
  }
  for (const key of [undefined, 'sk_live_synthetic', 'sk_test_bad\nvalue']) assert.throws(() => stagingConfig({ MALIPO_B2C_API_KEY: key }), /sandbox_key_required/);
});
test('the standard merchant key takes precedence over the legacy test variable', () => {
  assert.deepEqual(stagingConfig({ MALIPO_API_KEY: config.apiKey }), config);
  assert.deepEqual(stagingConfig({ MALIPO_API_KEY: config.apiKey, MALIPO_B2C_API_KEY: 'sk_live_legacy' }), config);
  assert.throws(() => stagingConfig({ MALIPO_API_KEY: 'sk_live_standard', MALIPO_B2C_API_KEY: config.apiKey }), /sandbox_key_required/);
});
test('HTTP requests refuse redirects, off-origin paths and bound their duration', async () => {
  const calls = [];
  const fetch = guardedFetch(config.baseUrl, async (...args) => { calls.push(args); return new Response('{}'); });
  assert.throws(() => fetch('https://api.malipo.dev/v1/disbursements'), /staging_request_refused/);
  assert.throws(() => fetch('https://api-staging.malipo.dev/admin'), /staging_request_refused/);
  await fetch(`${config.baseUrl}/disbursements`, { redirect: 'follow' });
  assert.equal(calls.length, 1); assert.equal(calls[0][1].redirect, 'error'); assert.ok(calls[0][1].signal instanceof AbortSignal);
});

async function fixture(run, faults = {}) {
  const original = globalThis.fetch;
  let available = 0, pending = 0, payout, request, scenario = 'success';
  const requests = [];
  globalThis.fetch = async (url, options) => {
    assert.ok(url.startsWith(`${config.baseUrl}/`));
    const route = new URL(url).pathname.slice(3);
    const body = options.body ? JSON.parse(options.body) : {};
    requests.push([options.method, route]);
    let result = {};
    if (route === '/sandbox-balance') result = { available: [{ currency: 'USD', amount: available }], pending: [{ currency: 'USD', amount: pending }] };
    else if (route === '/charge') result = { id: 'ch_synthetic', status: 'pending' };
    else if (route === '/transaction-status') { pending = 30; result = { id: 'ch_synthetic', status: faults.funding ? 'failed' : 'succeeded' }; }
    else if (route === '/testing/release') { available += pending; pending = 0; }
    else if (route === '/beneficiaries') result = { id: 'b_synthetic', environment: 'sandbox', versions: [{ masked_msisdn: '*******0001' }] };
    else if (route === '/testing/approve') result = { active_version_id: 'v_synthetic' };
    else if (route === '/testing/set_scenario') scenario = body.scenario;
    else if (route === '/disbursements' && options.method === 'POST') {
      if (request && request !== JSON.stringify(body)) return new Response(JSON.stringify({ error: { code: 'idempotency_conflict' } }), { status: 409, headers: { 'content-type': 'application/json' } });
      if (!payout) { request = JSON.stringify(body); available -= 20; payout = { id: 'd_synthetic', status: 'pending', environment: 'sandbox' }; result = { ...payout, idempotent_replay: false }; }
      else { if (faults.doubleDebit) available -= 20; result = { ...payout, idempotent_replay: true }; }
    } else if (route === '/disbursements') result = { data: [payout] };
    else if (route === '/disbursements/d_synthetic') result = payout;
    else if (route === '/testing/run') { assert.equal(scenario, 'timeout'); payout.status = 'needs_review'; if (faults.timeoutRelease) available += 20; }
    else if (route === '/testing/result') payout.status = body.status;
    else assert.equal(route, '/testing/screen_merchant');
    return new Response(JSON.stringify(result), { headers: { 'content-type': 'application/json' } });
  };
  try { return await run(new Malipo(config), requests, () => scenario); }
  finally { globalThis.fetch = original; }
}
const options = { wait: async () => {}, runId: 'synthetic-run' };
test('candidate SDK completes the funding/replay/timeout/confirmation flow with a redacted receipt', async () => {
  await fixture(async (client, requests, scenario) => {
    const receipt = await runAcceptance(client, options);
    assert.equal(receipt.status, 'passed'); assert.equal(receipt.checks.length, 5);
    assert.deepEqual(receipt.balances_usd_minor, { initial_available: 0, funding_credit: 3000, final_available: 1000 });
    assert.ok(receipt.unverified.includes('received_webhooks'));
    assert.ok(!/sk_test_|243840000001|Authorization|Synthetic acceptance recipient/.test(JSON.stringify(receipt)));
    assert.equal(scenario(), 'success');
    assert.equal(requests.filter(([method, route]) => method === 'POST' && route === '/disbursements').length, 3);
  });
});
for (const fault of ['doubleDebit', 'timeoutRelease']) test(`rejects a server that violates funds conservation: ${fault}`, async () => {
  await fixture(async (client, requests, scenario) => {
    await assert.rejects(runAcceptance(client, options), error => error.code === 'ERR_ASSERTION' && (fault === 'doubleDebit' ? error.message === 'Invalid USD balance' : error.actual === 3000));
    assert.equal(scenario(), 'success');
    assert.ok(!requests.some(([, route]) => route === '/testing/result'));
  }, { [fault]: true });
});
test('failed funding prevents creation of beneficiaries or disbursements', async () => {
  await fixture(async (client, requests) => {
    await assert.rejects(runAcceptance(client, options), /Funding did not succeed/);
    assert.ok(!requests.some(([, route]) => route === '/beneficiaries' || route === '/disbursements'));
  }, { funding: true });
});

test('the CLI refuses an existing receipt before building or mutating staging', async () => {
  const { mkdtemp, writeFile, readFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { promisify } = await import('node:util');
  const { execFile } = await import('node:child_process');
  const dir = await mkdtemp(join(tmpdir(), 'malipo-receipt-test-'));
  const path = join(dir, 'receipt.json');
  try {
    await writeFile(path, 'existing evidence');
    await assert.rejects(promisify(execFile)(process.execPath, [new URL('./test-b2c-staging.mjs', import.meta.url).pathname], {
      env: { ...process.env, MALIPO_API_KEY: config.apiKey, MALIPO_B2C_BASE_URL: config.baseUrl, MALIPO_B2C_RECEIPT_PATH: path },
    }), error => error.code === 1 && error.stderr.includes('No acceptance receipt was issued') && !error.stderr.includes(config.apiKey));
    assert.equal(await readFile(path, 'utf8'), 'existing evidence');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
