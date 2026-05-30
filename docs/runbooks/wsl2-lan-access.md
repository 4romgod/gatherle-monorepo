# WSL2 LAN Access for Mobile Device Testing

Exposes the local dev servers (webapp port 3000, API port 9000, Expo Metro bundler port 8081) to other devices on your
LAN so you can test on a physical iOS or Android device without a cloud deployment.

## Background

On Windows 11 with WSL2 in **mirrored networking mode**, the WSL IP and the Windows LAN IP are the same (`192.168.x.x`).
However, WSL services are not automatically reachable from other LAN devices. The fix is to add
`netsh interface portproxy` rules that forward incoming LAN traffic into WSL, plus Windows Firewall rules to allow it.

## Step 1 — Firewall rules (one-time, permanent)

These survive shutdowns and reboots. Run once in PowerShell as Administrator and never again:

```powershell
netsh advfirewall firewall add rule name="WSL 3000" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="WSL 9000" dir=in action=allow protocol=TCP localport=9000
netsh advfirewall firewall add rule name="WSL 8081" dir=in action=allow protocol=TCP localport=8081
```

## Step 2 — Port proxy rules (run after every restart)

Port proxy rules embed the WSL IP at the time you run them. The WSL IP **can change after every reboot**, so these rules
go stale. Re-run this block each time you restart the laptop (PowerShell as Administrator):

```powershell
# Remove any stale rules from the previous session
netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=0.0.0.0
netsh interface portproxy delete v4tov4 listenport=9000 listenaddress=0.0.0.0
netsh interface portproxy delete v4tov4 listenport=8081 listenaddress=0.0.0.0

# Resolve the current WSL IP (take only the first address)
$wslIp = (wsl hostname -I).Trim().Split(" ")[0]
Write-Host "Using WSL IP: $wslIp"

# Forward LAN → WSL for all three servers
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=$wslIp
netsh interface portproxy add v4tov4 listenport=9000 listenaddress=0.0.0.0 connectport=9000 connectaddress=$wslIp
netsh interface portproxy add v4tov4 listenport=8081 listenaddress=0.0.0.0 connectport=8081 connectaddress=$wslIp

# Verify
netsh interface portproxy show all
```

## Configuring the dev servers

Find your Windows LAN IP (`ipconfig`, look for the Wi-Fi adapter's IPv4 address, e.g. `192.168.0.7`).

### webapp (`apps/webapp/.env`)

```dotenv
NEXT_PUBLIC_GRAPHQL_URL="http://<LAN_IP>:9000/v1/graphql"
NEXT_PUBLIC_WEBSOCKET_URL="ws://<LAN_IP>:9000/beta"
NEXT_DEV_ALLOWED_ORIGINS=<LAN_IP>
```

`NEXT_DEV_ALLOWED_ORIGINS` is required so Next.js dev server allows `/_next/*` requests (HMR, etc.) from the LAN origin.
Without it you'll see HTTP 403 errors and the page will render infinite skeletons.

### API (`apps/api/.env`)

Add the webapp LAN origin to `CORS_ALLOWED_ORIGINS`:

```dotenv
CORS_ALLOWED_ORIGINS=http://<LAN_IP>:3000
```

### Mobile app (`apps/mobile/.env`)

```dotenv
EXPO_PUBLIC_GRAPHQL_URL=http://<LAN_IP>:9000/v1/graphql
EXPO_PUBLIC_WEBSOCKET_URL=ws://<LAN_IP>:9000/local
```

Then start Expo in LAN mode:

```bash
npm run start:lan -w @gatherle/mobile
```

Open the installed Gatherle development build on the phone and connect it to the Metro server shown in the terminal.
Port 8081 is Metro bundler for the dev client. Port 9000 is the API. Both need to be proxied for the app to work.

## Accessing from your device

All services are reachable at your Windows LAN IP once the proxy is running:

| Service | URL                               | Used by                    |
| ------- | --------------------------------- | -------------------------- |
| Webapp  | `http://<LAN_IP>:3000`            | Browser on phone           |
| API     | `http://<LAN_IP>:9000/v1/graphql` | Webapp + mobile app        |
| Metro   | `http://<LAN_IP>:8081`            | Gatherle development build |

Your phone must be on the same Wi-Fi network as the laptop.

## iOS note

There is no USB equivalent of `adb reverse` for iOS. LAN access via this proxy is the recommended approach for testing
on a physical iPhone during local development.
