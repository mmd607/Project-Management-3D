// Render docs/screenshots/*.png from the running web app (npm run dev:web) with headless
// Chrome/Edge through the DevTools protocol — real device-metrics emulation, so 375x812 is a
// phone layout and prefers-reduced-motion can be emulated.  Node 22+ required.
//   node scripts/screenshots.mjs [http://localhost:5173]
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const BASE = process.argv[2] || "http://localhost:5173";
const OUT = resolve(process.cwd(), "docs/screenshots");
mkdirSync(OUT, { recursive: true });
const candidates = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
];
const chrome = candidates.find((p) => existsSync(p));
if (!chrome) {
  console.error("no Chrome/Edge found");
  process.exit(1);
}
const port = 9334;
const proc = spawn(
  chrome,
  ["--headless=new", "--disable-gpu", "--no-first-run", `--remote-debugging-port=${port}`, `--user-data-dir=${resolve(process.env.TEMP || "/tmp", "piw-shots-profile")}`, "about:blank"],
  { stdio: "ignore" },
);
let wsUrl = null;
for (let i = 0; i < 50 && !wsUrl; i++) {
  try {
    wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl;
  } catch {
    await sleep(200);
  }
}
if (!wsUrl) {
  proc.kill();
  console.error("could not connect to the browser");
  process.exit(1);
}
const ws = new WebSocket(wsUrl);
await new Promise((res) => ws.addEventListener("open", res));
let seq = 0;
const pending = new Map();
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
});
const send = (method, params = {}, sessionId) =>
  new Promise((res) => {
    const id = ++seq;
    pending.set(id, res);
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
const { targetId } = (await send("Target.createTarget", { url: "about:blank" })).result;
const { sessionId } = (await send("Target.attachToTarget", { targetId, flatten: true })).result;
const call = (method, params) => send(method, params, sessionId);
await call("Page.enable");
await call("Runtime.enable");

async function shot(name, width, height, { scale = 1, mobile = false, reducedMotion = false, script = "", wait = 1800 } = {}) {
  await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: scale, mobile, screenWidth: width, screenHeight: height });
  await call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: reducedMotion ? "reduce" : "no-preference" }] });
  await call("Page.navigate", { url: "about:blank" });
  await sleep(120);
  await call("Page.navigate", { url: BASE });
  await sleep(wait);
  // Selection is persisted per session; start every capture from a clean, unselected state.
  await call("Runtime.evaluate", { expression: "sessionStorage.clear(); location.reload();" });
  await sleep(wait);
  if (script) {
    await call("Runtime.evaluate", { expression: script, awaitPromise: true });
    await sleep(700);
  }
  const { data } = (await call("Page.captureScreenshot", { format: "png" })).result;
  await writeFile(resolve(OUT, `${name}.png`), Buffer.from(data, "base64"));
  console.log(`wrote ${name}.png (${width}x${height}@${scale}x${reducedMotion ? ", reduced motion" : ""})`);
}

const selectFirst = `document.querySelector('.folder-node[data-project-id="demo-store-backend"], .grid-card[data-project-id="demo-store-backend"]').click(); new Promise(r => setTimeout(r, 900))`;
const openModal = `${selectFirst}.then(() => { [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'View Full Details').click(); })`;

await shot("01-main-1440x900", 1440, 900);
await shot("02-selected-1440x900", 1440, 900, { script: selectFirst });
await shot("03-full-details-1440x900", 1440, 900, { script: openModal });
await shot("04-tablet-768x1024", 768, 1024, { script: selectFirst });
await shot("05-tablet-unselected-768x1024", 768, 1024);
await shot("06-mobile-375x812", 375, 812, { scale: 2, mobile: true });
await shot("07-mobile-selected-375x812", 375, 812, { scale: 2, mobile: true, script: selectFirst });
await shot("08-reduced-motion-1440x900", 1440, 900, { reducedMotion: true, script: selectFirst });
ws.close();
proc.kill();
