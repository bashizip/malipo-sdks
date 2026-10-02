// Install the actual tarball in a disposable project, without network access.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const root = fileURLToPath(new URL('..', import.meta.url));
const directory = await mkdtemp(join(tmpdir(), 'malipo-sdk-package-'));
const requests = [];
const server = createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString('utf8');
  requests.push({ method: req.method, url: req.url, headers: req.headers, body });
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(req.method === 'GET'
    ? { data: [{ id: 'fixture' }], pagination: { page: 1, page_size: 25, total: 1 } }
    : { id: 'fixture' }));
});
try {
  await exec('npm', ['run', 'build'], { cwd: root });
  const { stdout } = await exec('npm', ['pack', '--json', '--pack-destination', directory], { cwd: root });
  const [{ filename }] = JSON.parse(stdout);
  await writeFile(join(directory, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  await exec('npm', ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', join(directory, filename)], { cwd: directory });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  await writeFile(join(directory, 'check.mjs'), `
    import assert from 'node:assert/strict';
    import { createRequire } from 'node:module';
    import Malipo, { Malipo as NamedMalipo } from 'malipo-node';
    assert.equal(Malipo, NamedMalipo);
    const CommonJS = createRequire(import.meta.url)('malipo-node');
    const cjs = new CommonJS.Malipo({ apiKey: 'sk_test_fixture' });
    assert.equal(typeof cjs.beneficiaries.update, 'function');
    assert.equal(typeof cjs.testing.reviewBeneficiary, 'function');
    const client = new Malipo({ apiKey: 'sk_test_fixture', baseUrl: process.env.MALIPO_PACKAGE_TEST_BASE });
    await assert.rejects(client.disbursements.create({ amount: '20.00' }, {}), { code: 'missing_idempotency_key' });
    await client.beneficiaries.update('beneficiary', { msisdn: '243840000001' });
    assert.equal((await client.disbursements.create({ beneficiary_id: 'beneficiary', amount: '20.00', currency: 'USD', reference: 'ref&1' }, { idempotencyKey: 'stable-reference' })).id, 'fixture');
    assert.equal((await client.disbursements.list({ reference: 'ref&1', page: 1 })).pagination.total, 1);
    await client.disbursements.cancel('fixture');
    await client.testing.holdBeneficiary('beneficiary', true);
    await client.testing.reviewBeneficiary('beneficiary', 'version', { identity_status: 'approved', residence_status: 'rejected', proof: 'simulated-dossier' });
  `);
  await exec(process.execPath, [join(directory, 'check.mjs')], {
    cwd: directory,
    env: { ...process.env, MALIPO_PACKAGE_TEST_BASE: `http://127.0.0.1:${server.address().port}/v1` },
  });
  assert.deepEqual(requests.map(r => [r.method, r.url]), [
    ['PATCH', '/v1/beneficiaries/beneficiary'], ['POST', '/v1/disbursements'],
    ['GET', '/v1/disbursements?reference=ref%261&page=1'], ['POST', '/v1/disbursements/fixture/cancel'],
    ['POST', '/v1/testing/hold_beneficiary'], ['POST', '/v1/testing/review_beneficiary'],
  ]);
  assert.equal(requests[1].headers['idempotency-key'], 'stable-reference');
  assert.equal(JSON.parse(requests[1].body).amount, '20.00');
  assert.equal(requests[3].body, '{}');
  console.log('Packaged SDK: offline installation, ESM/CJS imports and six B2C HTTP requests passed.');
} finally {
  if (server.listening) await new Promise(resolve => server.close(resolve));
  await rm(directory, { recursive: true, force: true });
}
