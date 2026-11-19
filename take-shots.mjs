// take-shots.mjs — serve app/ locally and photograph it with headless Chrome over raw CDP.
// Writes 4 JPEGs (1280 wide) into screenshots/. Demo progress is seeded as the app's own
// export-format state in localStorage, the same bytes the Import view accepts.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, statSync, writeFileSync, rmSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./app', import.meta.url)));
const shotsDir = resolve(fileURLToPath(new URL('./screenshots', import.meta.url)));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = join(root, p);
  try { const data = readFileSync(file); res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'content-length': data.length }); res.end(data); }
  catch { res.writeHead(404).end('nope'); }
});
await new Promise((r) => server.listen(8901, r));

const chrome = spawn('/home/hatch/.cache/puppeteer/chrome/linux-157.0.8103.78/chrome-linux64/chrome',
  ['--headless=new', '--disable-gpu', '--no-sandbox', '--remote-debugging-port=9333', '--user-data-dir=/tmp/gtv2-chrome-profile', '--window-size=1280,800', 'about:blank'],
  { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl = null;
for (let i = 0; i < 60 && !wsUrl; i++) {
  try { const v = await (await fetch('http://127.0.0.1:9333/json/version')).json(); wsUrl = v.webSocketDebuggerUrl; } catch { await sleep(500); }
}
if (!wsUrl) throw new Error('chrome did not start');
const targets = await (await fetch('http://127.0.0.1:9333/json/list')).json();
const pageTarget = targets.find((t) => t.type === 'page');
const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let seq = 0; const pending = new Map();
ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });

const demo = { app: 'sunledger-atlas', version: 1, earned: [2, 3, 4, 5, 8, 9, 10, 16, 19, 20, 21, 22, 24, 35, 37, 42, 44], counts: { 28: 9, 15: 140, 17: 12, 25: 3, 30: 1, 31: 46, 32: 31, 35: 100 }, spoilers: false, unearnedOnly: false };
async function seed(state) {
  await send('Runtime.evaluate', { expression: `localStorage.setItem('sunledger-atlas-v1', ${JSON.stringify(JSON.stringify(state))})` });
}
async function goto(path) {
  await send('Page.navigate', { url: `http://127.0.0.1:8901${path}` });
  await sleep(1400);
}
async function shot(file, quality) {
  const r = await send('Page.captureScreenshot', { format: 'jpeg', quality, captureBeyondViewport: false });
  const buf = Buffer.from(r.data, 'base64');
  writeFileSync(join(shotsDir, file), buf);
  return buf.length;
}
for (const f of ['1-checklist.jpg', '2-silver.jpg', '3-bronze.jpg']) { try { rmSync(join(shotsDir, f)); } catch { /* starter shot may already be gone */ } }

await goto('/');
await seed(demo);
await goto('/?fresh=1#trophy-28');
console.log('cover bytes', await shot('1-cover.jpg', 70));

await goto('/?view=roadmap');
console.log('roadmap bytes', await shot('2-roadmap.jpg', 70));

await goto('/?view=matrix');
console.log('matrix bytes', await shot('3-matrix.jpg', 62));

await seed({ ...demo, spoilers: true });
await goto('/?view=export');
console.log('export bytes', await shot('4-export.jpg', 70));

ws.close(); chrome.kill(); server.close();
console.log('done');
