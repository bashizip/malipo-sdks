// Packs and installs the candidate in an isolated project before public acceptance.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile, copyFile, rm, open } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stagingConfig } from './b2c-acceptance.mjs';
const exec = promisify(execFile);
const root = fileURLToPath(new URL('..', import.meta.url));
let directory;
let receiptFile;
let receiptComplete = false;
const output = process.env.MALIPO_B2C_RECEIPT_PATH ?? 'b2c-staging-receipt.json';
try {
  const config = stagingConfig(process.env); // Validate before building or sending requests.
  receiptFile = await open(output, 'wx', 0o600); // Reserve the path before any sandbox mutation.
  directory = await mkdtemp(join(tmpdir(), 'malipo-b2c-staging-'));
  await exec('npm', ['run', 'build'], { cwd: root });
  const { stdout } = await exec('npm', ['pack', '--json', '--pack-destination', directory], { cwd: root });
  const [{ filename, integrity }] = JSON.parse(stdout);
  await writeFile(join(directory, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  await exec('npm', ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', join(directory, filename)], { cwd: directory });
  await copyFile(new URL('./b2c-acceptance.mjs', import.meta.url), join(directory, 'b2c-acceptance.mjs'));
  await writeFile(join(directory, 'run.mjs'), `
    import Malipo from 'malipo-node';
    import { stagingConfig, guardedFetch, runAcceptance } from './b2c-acceptance.mjs';
    const config = stagingConfig(process.env);
    globalThis.fetch = guardedFetch(config.baseUrl);
    try { console.log(JSON.stringify(await runAcceptance(new Malipo(config)))); }
    catch { console.error('B2C acceptance failed; inspect staging using the dedicated test key.'); process.exitCode = 1; }
  `);
  const { stdout: receiptJson } = await exec(process.execPath, [join(directory, 'run.mjs')], {
    cwd: directory, timeout: 180_000, env: { ...process.env, MALIPO_B2C_BASE_URL: config.baseUrl },
  });
  const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));
  const receipt = { ...JSON.parse(receiptJson), checked_at: new Date().toISOString(), base_url: config.baseUrl, sdk_version: version, sdk_integrity: integrity };
  await receiptFile.writeFile(JSON.stringify(receipt, null, 2) + '\n');
  receiptComplete = true;
  console.log('B2C staging acceptance passed; receipt saved. Webhook receipt and cross-key isolation remain separate gates.');
} catch {
  // Never print an HTTP error body, child output, key, recipient or command environment.
  console.error('B2C acceptance not completed. Check the dedicated sandbox key, exact staging origin, local build and receipt path. No acceptance receipt was issued.');
  process.exitCode = 1;
} finally {
  if (receiptFile) {
    await receiptFile.close();
    if (!receiptComplete) await rm(output, { force: true });
  }
  if (directory) await rm(directory, { recursive: true, force: true });
}
