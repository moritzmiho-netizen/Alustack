// usage: node render.js --w 1920 --h 1080 --frames 0,120,300 --out dir   (stills)
//        node render.js --w 3840 --h 2160 --from 0 --to 1800 --video out.mp4
const http = require('http'), fs = require('fs'), path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? a.concat([[v.slice(2), arr[i + 1]]]) : a), []));
const W = +args.w || 1920, H = +args.h || 1080, FPS = 30;
const root = __dirname;

const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  const type = p.endsWith('.js') ? 'text/javascript' : p.endsWith('.html') ? 'text/html' : 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type }); fs.createReadStream(p).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const page = await browser.newPage({ viewport: { width: Math.min(W, 1920), height: Math.min(H, 1080) } });
  page.on('console', m => console.log('[page]', m.text()));
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto(`http://localhost:${port}/web/index.html?w=${W}&h=${H}&shadow=${args.shadow || 4096}`);
  await page.waitForFunction('window.READY === true', null, { timeout: 300000 });
  if (args.timeline) fs.writeFileSync(args.timeline, JSON.stringify(await page.evaluate('window.TIMELINE')));

  if (args.frames) {
    fs.mkdirSync(args.out, { recursive: true });
    for (const f of args.frames.split(',').map(Number)) {
      const t0 = Date.now();
      const url = await page.evaluate(t => window.renderFrame(t, 0.92), f / FPS);
      fs.writeFileSync(path.join(args.out, `f${String(f).padStart(4, '0')}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
      console.log('frame', f, Date.now() - t0, 'ms');
    }
  } else {
    const from = +args.from, to = +args.to;
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS), args.video], { stdio: ['pipe', 'inherit', 'inherit'] });
    const tStart = Date.now();
    for (let f = from; f < to; f++) {
      const url = await page.evaluate(t => window.renderFrame(t, 0.95), f / FPS);
      const buf = Buffer.from(url.split(',')[1], 'base64');
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if ((f - from) % 30 === 0) console.log(`[${args.video}] frame ${f} (${((Date.now() - tStart) / (f - from + 1) / 1000).toFixed(2)} s/frame)`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
  }
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
