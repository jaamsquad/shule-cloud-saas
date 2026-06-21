# ShuleCloud SMS Gateway (Android app)

Turns an Android phone into the school's SMS sender. The school's ShuleCloud
backend queues SMS jobs; this app claims them and sends each through the phone's
SIM using Android's `SmsManager`. This avoids paying a bulk-SMS gateway — the
school just uses its own SIM and airtime/SMS bundle.

```
School MIS (cloud)  ──queue──►  /api/v1  ──socket push──►  this app  ──SmsManager──►  SIM  ──►  parent
                                  ▲                              │
                                  └──────── status report ───────┘
```

## How it connects to your backend

- **API base**: `src/config.ts` → `API_BASE` (default `https://api.shulecloud.com/api/v1`).
  Change it for self-hosted backends. `SOCKET_URL` is the same host (the app
  joins the `/sms` Socket.IO namespace).
- **Tenant**: the app sends `x-tenant-subdomain: <school>` on every request, so
  the backend resolves the correct school database — exactly like the web app.
- **Device auth**: at pairing the backend issues a device token; the app sends it
  as `x-device-token`. The school admin can **reset** a device from
  *Communications → Bulk SMS → Devices*, which revokes the token.

### Endpoints used
`POST /mobile/register` · `POST /mobile/heartbeat` · `GET /mobile/jobs` · `POST /mobile/update`

## Pairing flow

1. In the school portal: **Communications → Bulk SMS → Devices → Connect a phone** → a 6-digit code appears.
2. In this app: enter the **school subdomain** (e.g. `egerton`) and the **code**.
3. Grant the SMS permission. The phone now shows as **Connected** in the portal.

## Why it can't run in Expo Go

Sending real SMS needs the native `SmsManager` (the `SEND_SMS` permission and the
`react-native-android-sms-sender` native module). That requires a **dev build**
or a release APK — Expo Go can't do it. In development without the native module,
`src/smsSender.ts` falls back to a logged stub so the queue/flow is testable.

## Build

```bash
cd sms-gateway-app
npm install
npx expo prebuild --platform android --clean   # generates the native android/ project
npx expo run:android                            # build + install a dev client on a device
# or, for a distributable APK, use EAS:
#   npx eas build -p android --profile preview
```

After install: open the app, pair, then **disable battery optimisation** for it
so Android doesn't kill the background sender.

## Reliability notes

- **Real-time**: a Socket.IO connection (`/sms`) pushes new jobs instantly; a 20s
  foreground timer and a 15-min background-fetch task are fallbacks.
- **Pacing**: messages are spaced by `pacingMs` (set per school in the portal) to
  respect carrier throttling.
- **Offline queue**: jobs stay queued in the cloud; when the phone reconnects it
  drains them — nothing is lost.
- **Heartbeat**: every 30s the app reports battery/network so the portal shows
  live status.
