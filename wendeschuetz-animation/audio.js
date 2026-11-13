// Synthesizes a subtle soundtrack (wire ticks, button clicks, contactor clacks, motor hum) from timeline.json
const fs = require('fs');
const tl = JSON.parse(fs.readFileSync(process.argv[2]));
const SR = 48000, N = Math.round(SR * tl.end);
const buf = new Float32Array(N);
let seed = 12345;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;

function add(t0, len, fn) {
  const s0 = Math.round(t0 * SR);
  for (let i = 0; i < len * SR && s0 + i < N; i++) if (s0 + i >= 0) buf[s0 + i] += fn(i / SR);
}
// wire lands in the clamp: short soft tick
for (const w of tl.wires) {
  const t = w.t0 + w.dur;
  add(t, 0.06, x => 0.12 * Math.exp(-x * 140) * (Math.sin(2 * Math.PI * 2400 * x) * 0.6 + rnd() * 0.4));
  add(t + 0.03, 0.05, x => 0.05 * Math.exp(-x * 160) * rnd());
}
const ev = tl.ev;
// push buttons
for (const t of [ev.pressC, ev.pressD, ev.pressE]) {
  add(t + 0.04, 0.05, x => 0.25 * Math.exp(-x * 220) * (rnd() * 0.6 + Math.sin(2 * Math.PI * 3200 * x) * 0.4));
  add(t + 0.32, 0.05, x => 0.15 * Math.exp(-x * 220) * (rnd() * 0.6 + Math.sin(2 * Math.PI * 2800 * x) * 0.4));
}
// contactor clack (pull-in louder than drop-out)
for (const [t, g] of [[ev.q1On, 1], [ev.q1Off, 0.7], [ev.q2On, 1]]) {
  add(t, 0.25, x => g * (0.55 * Math.exp(-x * 45) * Math.sin(2 * Math.PI * 140 * x) + 0.35 * Math.exp(-x * 120) * rnd()));
}
// motor hum following the same speed model as the picture
const q1 = t => t >= ev.q1On && t < ev.q1Off, q2 = t => t >= ev.q2On;
let w = 0, ph = 0, lp = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR, dt = 1 / SR;
  const target = q1(t) || q2(t) ? 1 : 0;
  w += (target - w) * (dt / (target ? 0.3 : 0.42));
  ph += 2 * Math.PI * (60 + 40 * w) * dt;
  lp += (rnd() - lp) * 0.02;
  const hum = Math.sin(ph) * 0.5 + Math.sin(2 * ph) * 0.3 + Math.sin(5 * ph) * 0.08;
  const mains = (q1(t) || q2(t)) ? Math.sin(2 * Math.PI * 100 * t) * 0.12 : 0;
  buf[i] += w * (0.16 * hum + 0.25 * lp) + mains * 0.4;
  buf[i] += 0.004 * rnd();                       // faint room tone
}
// fade in/out and write 16-bit stereo WAV
const out = Buffer.alloc(44 + N * 4);
out.write('RIFF', 0); out.writeUInt32LE(36 + N * 4, 4); out.write('WAVE', 8); out.write('fmt ', 12);
out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(SR, 24);
out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34); out.write('data', 36); out.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const g = Math.min(1, t / 0.7, (tl.end - t) / 0.8);
  const v = Math.max(-1, Math.min(1, buf[i] * g)) * 32000;
  out.writeInt16LE(v | 0, 44 + i * 4); out.writeInt16LE(v | 0, 46 + i * 4);
}
fs.writeFileSync(process.argv[3], out);
console.log('wav written', N / SR, 's');
